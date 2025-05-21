import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec, spawn } from 'child_process';
import os from 'os';
import { Sandbox } from '@e2b/code-interpreter';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify fs functions
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);
const execAsync = promisify(exec);
const unlink = promisify(fs.unlink);

// Use a directory in the user's home folder for agents
const HOME_DIR = os.homedir();
const AGENTS_BASE_DIR = path.join(HOME_DIR, '.agent-flow-builder', 'agents');

// Legacy directory (may have permission issues)
const LEGACY_AGENTS_DIR = path.join(process.cwd(), 'agents');

// Helper function to safely delete a file with error handling
async function safeUnlink(filePath) {
  try {
    if (await exists(filePath)) {
      await unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Warning: Could not delete file ${filePath}:`, error.message);
    return false;
  }
}

// Helper function to get all possible agent directories for a given agent name
function getAgentDirectories(agentName) {
  return [
    path.join(AGENTS_BASE_DIR, agentName),  // New location (preferred)
    path.join(LEGACY_AGENTS_DIR, agentName) // Legacy location (may have permission issues)
  ];
}

// Create Express server
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Handler for creating agent files and setting up a virtual environment
async function createAgentHandler(req, res) {
  try {
    const { agentName, code } = req.body;

    if (!agentName || !code) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Base agents directory - using the user's home directory
    const baseDir = AGENTS_BASE_DIR;
    
    // Agent-specific directory
    const agentDir = path.join(baseDir, agentName);
    
    // Create base directory if it doesn't exist
    if (!await exists(baseDir)) {
      await mkdir(baseDir, { recursive: true });
      console.log(`Created base directory: ${baseDir}`);
    }
    
    // Create agent directory if it doesn't exist
    if (!await exists(agentDir)) {
      await mkdir(agentDir, { recursive: true });
      console.log(`Created agent directory: ${agentDir}`);
    }
    
    // Create agent files
    const agentFilePath = path.join(agentDir, 'agent.py');
    const initFilePath = path.join(agentDir, '__init__.py');
    
    // Write agent.py file
    await writeFile(agentFilePath, code);
    console.log(`Created agent file: ${agentFilePath}`);
    
    // Write a simple __init__.py that imports the agent
    await writeFile(initFilePath, 'from .agent import root_agent');
    console.log(`Created init file: ${initFilePath}`);
    
    // Check if virtual environment exists
    const venvDir = path.join(agentDir, 'venv');
    const venvExists = await exists(venvDir);
    
    if (!venvExists) {
      try {
        // Create virtual environment - try python3 first (for macOS), then fall back to python
        console.log(`Creating virtual environment in ${venvDir}`);
        try {
          // On macOS, use python3 command
          await execAsync(`python3 -m venv ${venvDir}`);
        } catch (pythonError) {
          console.log('python3 command failed, trying python command...');
          await execAsync(`python -m venv ${venvDir}`);
        }
        
        // Determine pip path based on OS
        const pipPath = process.platform === 'win32' 
          ? path.join(venvDir, 'Scripts', 'pip')
          : path.join(venvDir, 'bin', 'pip');

        // Ensure pip is up-to-date
        console.log('Upgrading pip...');
        try {
          await execAsync(`"${pipPath}" install --upgrade pip`);
        } catch (pipError) {
          console.warn('Error upgrading pip, continuing anyway:', pipError);
        }
        
        // Install Google ADK package
        console.log('Installing Google ADK package...');
        try {
          await execAsync(`"${pipPath}" install google-adk`);
          console.log('Google ADK package installed successfully');
        } catch (adkError) {
          console.error('Error installing Google ADK:', adkError);
          throw new Error('Failed to install Google ADK package. You might need to install it manually.');
        }
        
        console.log('Virtual environment setup completed');
      } catch (error) {
        console.error('Error setting up virtual environment:', error);
        // Continue without failing the request, as we can still create the files
      }
    }
    
    // Try to clean up any files in the legacy directory (but don't fail if we can't)
    try {
      const legacyAgentDir = path.join(LEGACY_AGENTS_DIR, agentName);
      if (await exists(legacyAgentDir)) {
        console.log(`Attempting to clean up legacy directory: ${legacyAgentDir}`);
        
        // Just log attempts, don't throw errors if we can't delete
        const legacyAgentFile = path.join(legacyAgentDir, 'agent.py');
        const legacyInitFile = path.join(legacyAgentDir, '__init__.py');
        
        await safeUnlink(legacyAgentFile);
        await safeUnlink(legacyInitFile);
      }
    } catch (cleanupError) {
      // Just log cleanup errors, don't fail the request
      console.warn('Non-critical cleanup error:', cleanupError.message);
    }
    
    return res.status(200).json({
      success: true,
      message: `Agent files created successfully in your home directory (${agentDir})`,
      paths: {
        agentFile: agentFilePath,
        initFile: initFilePath,
        venv: venvExists ? venvDir : null
      }
    });
  } catch (error) {
    console.error('Error creating agent files:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error creating agent files',
      success: false 
    });
  }
}

// Handler for running an agent with ADK web command
async function runAgentHandler(req, res) {
  try {
    const { agentName } = req.body;

    if (!agentName) {
      return res.status(400).json({ error: 'Missing agent name' });
    }

    // Validate agent name to prevent directory traversal attacks
    if (!/^[a-zA-Z0-9_-]+$/.test(agentName)) {
      return res.status(400).json({ error: 'Invalid agent name format' });
    }

    // Get all possible agent directories
    const possibleDirs = getAgentDirectories(agentName);
    let agentDir = null;
    
    // Find the first directory that exists and contains agent.py
    for (const dir of possibleDirs) {
      if (await exists(dir) && await exists(path.join(dir, 'agent.py'))) {
        agentDir = dir;
        break;
      }
    }
    
    if (!agentDir) {
      return res.status(404).json({ error: `Agent directory not found for: ${agentName}` });
    }
    
    console.log(`Found agent directory: ${agentDir}`);

    // Check if agent.py file exists
    const agentFile = path.join(agentDir, 'agent.py');
    if (!await exists(agentFile)) {
      return res.status(404).json({ error: `Agent file not found: ${agentFile}` });
    }

    // Check if virtual environment exists
    const venvDir = path.join(agentDir, 'venv');
    if (!await exists(venvDir)) {
      return res.status(400).json({ error: 'Virtual environment not found. Please create agent first.' });
    }

    // Determine the path to the python executable in the virtual environment
    const pythonPath = process.platform === 'win32'
      ? path.join(venvDir, 'Scripts', 'python')
      : path.join(venvDir, 'bin', 'python3');  // Try python3 on Unix systems
    
    const pythonFallbackPath = process.platform === 'win32'
      ? pythonPath  // No fallback on Windows
      : path.join(venvDir, 'bin', 'python');   // Fallback to python on Unix

    // Check if adk command is available in the virtual environment
    const adkPath = process.platform === 'win32'
      ? path.join(venvDir, 'Scripts', 'adk')
      : path.join(venvDir, 'bin', 'adk');
      
    // Check if alternative adk path exists (may be installed as adk3 or similar)
    const adkAltPath = process.platform === 'win32'
      ? adkPath  // No alternative on Windows
      : path.join(venvDir, 'bin', 'adk3');

    // Check if any ADK executable exists
    const adkExists = await exists(adkPath) || await exists(adkAltPath);
    if (!adkExists) {
      return res.status(400).json({ 
        error: 'ADK command not found in virtual environment. Make sure it was installed correctly.' 
      });
    }

    // Use the existing ADK path or the alternative if the primary doesn't exist
    const finalAdkPath = await exists(adkPath) ? adkPath : adkAltPath;

    // Run the agent using the adk web command
    // Use spawn to run the process, which will keep running after the API request completes
    console.log(`Running agent in directory: ${agentDir}`);
    console.log(`Using ADK path: ${finalAdkPath}`);

    const adkProcess = spawn(finalAdkPath, ['web'], {
      cwd: agentDir,
      detached: true, // Run in the background
      stdio: 'ignore', // Don't capture output
    });

    // Unref the process so it can continue running after the parent process exits
    adkProcess.unref();

    // Assume the agent will be available on port 8000
    // In a real implementation, we would determine this from the adk web command's output
    const port = 8000;
    const url = `http://localhost:${port}`;

    return res.status(200).json({
      success: true,
      message: 'Agent is now running',
      output: `Started agent process using ADK web command in ${agentDir}`,
      url: url,
      // Add dedicated fields for the frontend to show an "Open Link" button
      openUrl: url,
      showOpenLink: true,
      linkText: 'Open Agent UI'
    });
  } catch (error) {
    console.error('Error running agent:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error running agent'
    });
  }
}

// Execute code in sandbox endpoint
app.post('/api/execute', async (req, res) => {
  const startTime = Date.now();
  console.log('\n🚀 Starting code execution request...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const { files } = req.body;
    
    if (!files || !files['agent.py']) {
      console.log('❌ Error: No agent.py file provided');
      return res.status(400).json({ error: 'No agent.py file provided' });
    }

    console.log('📝 Files to create:');
    console.log('━━━━━━━━━━━━━━━━━');
    Object.entries(files).forEach(([filename, content]) => {
      console.log(`• ${filename} (${content.length} characters)`);
    });
    console.log('━━━━━━━━━━━━━━━━━\n');

    // Create sandbox instance
    console.log('🔧 Creating E2B sandbox instance...');
    const sbx = await Sandbox.create({ 
      apiKey: process.env.E2B_API_KEY,
      onStdout: (data) => {
        console.log('📤 Stdout:', data);
      },
      onStderr: (data) => {
        console.log('❌ Stderr:', data);
      }
    });
    console.log('✅ Sandbox created successfully\n');

    // Create a temporary directory for the agent
    console.log('📁 Creating agent directory...');
    await sbx.commands.run('mkdir -p agent');
    console.log('✅ Agent directory created\n');

    // Write files to the sandbox
    console.log('📝 Writing files to sandbox...');
    for (const [filename, content] of Object.entries(files)) {
      await sbx.files.write(`agent/${filename}`, content);
      console.log(`✅ Created ${filename}`);
    }
    console.log('✅ All files written successfully\n');

    // Set up Python environment with a compatible Python version
    console.log('🐍 Setting up Python environment...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Check Python versions available in the sandbox
    console.log('📊 Checking available Python versions...');
    const pythonVersions = await sbx.commands.run('ls /usr/bin/python* | grep -v config');
    console.log(`Available Python versions:\n${pythonVersions.stdout}`);
    
    // Try to use Python 3.9 which is compatible with most Google Cloud libraries
    console.log('📦 Creating virtual environment with Python 3.9...');
    let venvResult;
    try {
      venvResult = await sbx.commands.run('python3.9 -m venv agent/venv');
      console.log('✅ Successfully created venv with Python 3.9');
    } catch (error) {
      console.log('⚠️ Python 3.9 not available, falling back to default Python version');
      venvResult = await sbx.commands.run('python3 -m venv agent/venv');
    }
    
    console.log(`  • Exit code: ${venvResult.exitCode}`);
    if (venvResult.stdout) console.log(`  • Output: ${venvResult.stdout}`);
    if (venvResult.stderr) console.log(`  • Errors: ${venvResult.stderr}`);
    console.log('✅ Virtual environment created\n');
    
    console.log('📦 Activating virtual environment and installing dependencies...');
    console.log('  • Installing google-adk package...');
    const pipResult = await sbx.commands.run('source agent/venv/bin/activate && pip install google-adk -v');
    console.log(`  • Exit code: ${pipResult.exitCode}`);
    console.log('  • Dependency installation details:');
    if (pipResult.stdout) {
      const pipLogs = pipResult.stdout.split('\n').map(line => `    ${line}`).join('\n');
      console.log(pipLogs);
    }
    if (pipResult.stderr) {
      console.log('  • Errors/Warnings:');
      const pipErrors = pipResult.stderr.split('\n').map(line => `    ${line}`).join('\n');
      console.log(pipErrors);
    }
    
    // Verify the installation
    console.log('\n📋 Verifying installation...');
    const verifyResult = await sbx.commands.run('source agent/venv/bin/activate && pip list | grep google-adk');
    if (verifyResult.stdout) {
      console.log(`  • Installed: ${verifyResult.stdout.trim()}`);
    } else {
      console.log('  • Warning: Could not verify google-adk installation');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Python environment ready\n');

    // Instead of executing the code directly, run the ADK web command
    console.log('⚡ Starting agent with ADK web command...');
    
    try {
      // Create a startup script that properly detaches the process using nohup and disown
      await sbx.files.write('agent/start_adk.sh', `#!/bin/bash
source ./venv/bin/activate
# Run adk web command in detached mode with nohup, redirecting output to a log file
nohup adk web > adk_web.log 2>&1 &
# Save the PID of the background process
echo $! > adk_web.pid
# Disown the process so it continues running even if the parent shell exits
disown -h $!
`);
      
      // Make the script executable
      await sbx.commands.run('chmod +x agent/start_adk.sh', { timeoutMs: 30000 });
      
      // Execute the startup script
      const adkWebResult = await sbx.commands.run('cd agent && ./start_adk.sh', { timeoutMs: 30000 });
      
      console.log('📋 ADK web server starting script output:');
      if (adkWebResult.stdout) console.log(adkWebResult.stdout);
      if (adkWebResult.stderr) console.log(adkWebResult.stderr);
      
      // Wait a moment for the server to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if the server is running
      const psCheck = await sbx.commands.run('ps aux | grep "adk web" | grep -v grep');
      console.log('✅ ADK web server process is running:');
      console.log(psCheck.stdout);
      
      // Get the public URL for the ADK web server (port 8000)
      const publicHost = sbx.getHost(8000);
      const publicUrl = `https://${publicHost}`;
      
      // Format the response with the public URL
      const response = {
        output: `Agent started with ADK web command. Access the UI at ${publicUrl}`,
        error: null,
        executionTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // in MB
        executionDetails: {
          stdout: [`Agent started with ADK web command`],
          stderr: [],
          exitCode: 0,
          status: 'running',
          duration: Date.now() - startTime,
          serverUrl: publicUrl // Use the public URL that can be accessed from outside
        },
        // Add dedicated fields for the frontend to show an "Open Link" button
        openUrl: publicUrl,
        showOpenLink: true,
        linkText: 'Open Agent UI'
      };

      console.log('📊 Execution Results:');
      console.log('━━━━━━━━━━━━━━━━━━');
      
      console.log(`📤 ADK web server is accessible at: ${publicUrl}`);
      console.log(`Debug info:`);
      console.log(`• Status: ${response.executionDetails.status}`);
      console.log(`• Duration: ${response.executionDetails.duration} ms`);
      console.log(`• Server URL: ${response.executionDetails.serverUrl}`);

      console.log('\n📈 Execution Metadata:');
      console.log(`• Execution Time: ${response.executionTime}ms`);
      console.log(`• Memory Usage: ${response.memoryUsage.toFixed(2)}MB`);
      console.log(`• Status: ${response.executionDetails.status}`);
      console.log(`• Server URL: ${response.executionDetails.serverUrl}`);
      
      res.status(200).json(response);
    } catch (error) {
      console.error('\n❌ Error running ADK web command:');
      console.error(error);
      
      // Cleanup sandbox
      try {
        if (sbx) {
          console.log('🧹 Cleaning up sandbox after error...');
          
          // Try to kill the ADK web process if it's running
          try {
            const killResult = await sbx.commands.run('if [ -f agent/adk_web.pid ]; then kill $(cat agent/adk_web.pid) 2>/dev/null || true; rm agent/adk_web.pid; fi', { timeoutMs: 10000 });
            console.log('📋 ADK web kill result:', killResult.stdout || 'No output');
          } catch (killError) {
            console.error('Failed to kill ADK web process:', killError.message);
          }
          
          // Destroy the sandbox
          if (typeof sbx.destroy === 'function') {
            await sbx.destroy();
          } else if (typeof sbx.close === 'function') {
            await sbx.close();
          }
          console.log('✅ Sandbox cleaned up after error');
        }
      } catch (cleanupError) {
        console.error('Error cleaning up sandbox after error:', cleanupError);
      }
      
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Error running ADK web command',
        executionTime: Date.now() - startTime
      });
    }
  } catch (error) {
    console.error('\n❌ Sandbox execution error:');
    console.error('━━━━━━━━━━━━━━━━━━━━');
    console.error(error);
    
    const errorResponse = {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined,
      executionTime: Date.now() - startTime,
      errorDetails: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: error instanceof Error ? (error.code || 'UNKNOWN') : 'UNKNOWN'
      }
    };
    
    console.error('\n📈 Error Metadata:');
    console.error(`• Error Type: ${errorResponse.errorDetails.name}`);
    console.error(`• Error Code: ${errorResponse.errorDetails.code}`);
    console.error(`• Execution Time: ${errorResponse.executionTime}ms`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return res.status(500).json(errorResponse);
  }
});

// API routes
app.post('/api/create-agent', createAgentHandler);
app.post('/api/run-agent', runAgentHandler);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Home route with API info
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Agent Flow Builder API',
    version: '1.0.0',
    endpoints: [
      { method: 'POST', path: '/api/create-agent', description: 'Create a new agent' },
      { method: 'POST', path: '/api/run-agent', description: 'Run an existing agent' },
      { method: 'POST', path: '/api/execute', description: 'Execute code in sandbox' },
      { method: 'GET', path: '/api/health', description: 'Health check endpoint' }
    ]
  });
});

// Start server
(async function startServer() {
  try {
    // Check if AGENTS_BASE_DIR exists, create it if not
    if (!await exists(AGENTS_BASE_DIR)) {
      console.log(`Creating agents directory: ${AGENTS_BASE_DIR}`);
      await mkdir(AGENTS_BASE_DIR, { recursive: true });
    }
    
    // Verify the directory is writable by creating a test file
    const testFilePath = path.join(AGENTS_BASE_DIR, '.write-test');
    try {
      await writeFile(testFilePath, 'write test');
      await fs.promises.unlink(testFilePath); // Remove the test file
      console.log(`Agents directory is writable: ${AGENTS_BASE_DIR}`);
    } catch (error) {
      console.error(`WARNING: Agents directory is not writable: ${AGENTS_BASE_DIR}`);
      console.error(`You may encounter permission errors when creating agents.`);
      console.error(`Error details: ${error.message}`);
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`┌───────────────────────────────────────────────┐`);
      console.log(`│                                               │`);
      console.log(`│   Agent Flow Builder API Server Running       │`);
      console.log(`│                                               │`);
      console.log(`│   - Local:            http://localhost:${PORT}   │`);
      console.log(`│   - Health Check:     http://localhost:${PORT}/api/health │`);
      console.log(`│   - Agents Directory: ${AGENTS_BASE_DIR}      │`);
      console.log(`│                                               │`);
      console.log(`└───────────────────────────────────────────────┘`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

export default app; 