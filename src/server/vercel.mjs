import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Sandbox } from '@e2b/code-interpreter';

// Create Express server
const app = express();
const PORT = process.env.PORT || 3001;

// CORS middleware with proper configuration
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle OPTIONS requests explicitly
app.options('*', (req, res) => {
  res.status(204).end();
});

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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

    // Create proper directory structure for ADK agent detection
    console.log('📁 Creating agent directories...');
    await sbx.commands.run('mkdir -p workspace/agent_package');
    console.log('✅ Workspace and agent_package directories created\n');

    // Write files to the sandbox with proper ADK structure
    console.log('📝 Writing files to sandbox...');
    for (const [filename, content] of Object.entries(files)) {
      await sbx.files.write(`workspace/agent_package/${filename}`, content);
      console.log(`✅ Created ${filename}`);
    }
    
    // Create __init__.py file to make agent_package a proper Python package
    console.log('📝 Creating __init__.py file...');
    await sbx.files.write('workspace/agent_package/__init__.py', 'from .agent import root_agent\n__all__ = ["root_agent"]\n');
    console.log('✅ Created __init__.py file');
    
    // Create a README.md file to help identify the package in the ADK web UI
    console.log('📝 Creating README.md file...');
    await sbx.files.write('workspace/agent_package/README.md', '# Agent Flow Builder Generated Agent\n\nThis agent was automatically generated from your Agent Flow Builder diagram.\n');
    console.log('✅ Created README.md file');
    console.log('✅ All files written successfully\n');

    // Set up Python environment with a compatible Python version
    console.log('🐍 Setting up Python environment...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Check Python versions available in the sandbox
    console.log('📊 Checking available Python versions...');
    const pythonVersions = await sbx.commands.run('ls /usr/bin/python* | grep -v config');
    console.log(`Available Python versions:\n${pythonVersions.stdout}`);
    
    // Try to use Python 3.10 which is compatible with Google ADK
    console.log('📦 Creating virtual environment...');
    let venvResult;
    try {
      // First check what Python versions are available
      const pythonVersionsResult = await sbx.commands.run('ls -la /usr/bin/python*');
      console.log(`Available Python versions: ${pythonVersionsResult.stdout}`);
      
      // Try Python 3.10 first (known to work with Google ADK)
      venvResult = await sbx.commands.run('python3.10 -m venv workspace/venv');
      console.log('✅ Successfully created venv with Python 3.10');
    } catch (error) {
      console.log('⚠️ Python 3.10 not available, trying Python 3.9...');
      try {
        venvResult = await sbx.commands.run('python3.9 -m venv workspace/venv');
        console.log('✅ Successfully created venv with Python 3.9');
      } catch (secondError) {
        console.log('⚠️ Python 3.9 not available, falling back to default Python version');
        venvResult = await sbx.commands.run('python3 -m venv workspace/venv');
      }
    }
    
    console.log(`  • Exit code: ${venvResult.exitCode}`);
    if (venvResult.stdout) console.log(`  • Output: ${venvResult.stdout}`);
    if (venvResult.stderr) console.log(`  • Errors: ${venvResult.stderr}`);
    console.log('✅ Virtual environment created\n');
    
    console.log('📦 Activating virtual environment and installing dependencies...');
    console.log('  • Upgrading pip and installing wheel...');
    await sbx.commands.run('source workspace/venv/bin/activate && pip install --upgrade pip wheel setuptools');
    
    console.log('  • Installing google-adk package and dependencies...');
    await sbx.commands.run('source workspace/venv/bin/activate && pip install protobuf google-api-python-client google-auth fastapi uvicorn');
    
    // Try installing google-adk with different pip flags
    try {
      console.log('  • Installing google-adk package (attempt 1)...');
      const pipResult = await sbx.commands.run('source workspace/venv/bin/activate && pip install google-adk==0.0.18 --no-cache-dir -v');
      console.log(`  • Exit code: ${pipResult.exitCode}`);
    } catch (error) {
      console.log('  • First attempt failed, trying alternative installation...');
      try {
        // Try installing directly from PyPI with no version constraint
        const altResult = await sbx.commands.run('source workspace/venv/bin/activate && pip install google-adk --no-cache-dir --no-deps');
        console.log(`  • Alternative installation exit code: ${altResult.exitCode}`);
      } catch (altError) {
        console.log('  • Alternative installation failed, trying minimal install...');
                 // Try with minimal dependencies
         await sbx.commands.run('source workspace/venv/bin/activate && pip install google-adk --no-cache-dir --no-deps --ignore-installed');
       }
     }
     
     console.log('  • Checking installed ADK package:');
     try {
       const adkCheck = await sbx.commands.run('source workspace/venv/bin/activate && pip show google-adk');
       console.log('  • ADK package details:');
       console.log(adkCheck.stdout);
     } catch (error) {
       console.log('  • Could not get ADK package details:', error.message);
     }
    
    // Verify the installation
    console.log('\n📋 Verifying installation...');
    const verifyResult = await sbx.commands.run('source workspace/venv/bin/activate && pip list | grep google-adk');
    if (verifyResult.stdout) {
      console.log(`  • Installed: ${verifyResult.stdout.trim()}`);
    } else {
      console.log('  • Warning: Could not verify google-adk installation');
    }
    
    // Create ADK config file
    console.log('📝 Creating ADK config file...');
    await sbx.files.write('workspace/adk.config.json', JSON.stringify({
      "api_key": "AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY"
    }, null, 2));
    console.log('✅ ADK config file created');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Python environment ready\n');

    // Instead of executing the code directly, run the ADK web command
    console.log('⚡ Starting agent with ADK web command...');
    
    try {
      // Create a .env file with the Google ADK API key
      await sbx.files.write('workspace/.env', `GOOGLE_API_KEY=AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY
ADK_API_KEY=AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY
`);
      
      // Create a startup script that properly detaches the process using nohup and disown
      await sbx.files.write('workspace/start_adk.sh', `#!/bin/bash
set -e  # Exit immediately if a command fails
echo "Starting ADK Web Server"

# Source the virtual environment
source ./venv/bin/activate
echo "Virtual environment activated"

# Set environment variables for Google ADK
export GOOGLE_API_KEY=AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY
export ADK_API_KEY=AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY
echo "Environment variables set"

# Make sure we're in the workspace directory
cd /home/user/workspace
echo "Changed to workspace directory: $(pwd)"

# List the directory contents to debug
echo "Directory contents:"
ls -la

# Print Python and ADK versions for debugging
python --version
pip list | grep google-adk
echo "Python version and ADK package checked"

# Try to diagnose the Python environment
echo "Python diagnostic information:"
which python3
python3 --version
which adk
adk --version
echo "ADK installation path:"
pip show google-adk | grep Location

# Try debugging with verbose flags
echo "Starting ADK web server on port 8000..."
nohup adk web --host=0.0.0.0 --port=8000 --api_key=AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY --debug --verbose > adk_web.log 2>&1 &

# Save the PID
echo $! > adk_web.pid
echo "ADK web server started with PID: $(cat adk_web.pid)"

# Disown the process
disown -h $!
echo "Process disowned successfully"

# Show the log file contents for debugging
echo "Initial log file contents:"
cat adk_web.log || echo "Log file not yet created"

# Check if process is running
echo "Process status:"
ps -p $(cat adk_web.pid) || echo "Process not yet visible in ps"

echo "Startup script completed successfully"
`);
      
      // Make the script executable
      await sbx.commands.run('chmod +x workspace/start_adk.sh', { timeoutMs: 30000 });
      
      // Execute the startup script with increased timeout
      console.log('🚀 Running ADK web startup script...');
      try {
        const adkWebResult = await sbx.commands.run('cd workspace && ./start_adk.sh', { 
          timeoutMs: 60000, // Increase timeout to 60 seconds
          env: {
            "GOOGLE_API_KEY": "AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY",
            "ADK_API_KEY": "AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY"
          }
        });
        
        console.log('📋 ADK web server starting script output:');
        if (adkWebResult.stdout) console.log(adkWebResult.stdout);
        if (adkWebResult.stderr) console.log(adkWebResult.stderr);
        
        // Wait a moment for the server to start
        console.log('⏳ Waiting for server to start...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check log file contents
        console.log('📋 Checking ADK web server logs:');
        const logCheck = await sbx.commands.run('cat workspace/adk_web.log || echo "Log file not found"');
        console.log(logCheck.stdout);
        
        // Check if the server is running
        console.log('👀 Checking if ADK web server process is running:');
        const psCheck = await sbx.commands.run('ps aux | grep "adk web" | grep -v grep || echo "No ADK web process found"');
        console.log(psCheck.stdout);
        
        // Check open ports
        console.log('🔍 Checking open ports:');
        const portsCheck = await sbx.commands.run('netstat -tulpn | grep LISTEN || echo "netstat not available"');
        console.log(portsCheck.stdout);
        
        // Test if we can reach the server
        console.log('🌐 Testing HTTP connection to ADK web server:');
        const curlCheck = await sbx.commands.run('curl -s -I http://localhost:8000 || echo "Connection failed"');
        console.log(curlCheck.stdout);
      } catch (error) {
        console.error('❌ Error running startup script:', error);
        // Try to collect diagnostic information even if the script failed
        try {
          console.log('🔍 Collecting diagnostic information after error...');
          const diagnosticInfo = await sbx.commands.run('cd workspace && ls -la && cat adk_web.log || echo "Log not found"');
          console.log('Diagnostic output:', diagnosticInfo.stdout);
        } catch (diagError) {
          console.error('Failed to collect diagnostic information:', diagError);
        }
      }
      
      // Get the public URL for the ADK web server (port 8000)
      const publicHost = sbx.getHost(8000);
      const publicUrl = `https://${publicHost}`;
      
      // Also construct a URL for the dev-ui path specifically 
      const devUiUrl = `https://${publicHost}/dev-ui?app=agent_package`;
      
      // Format the response with the public URL
      const response = {
        output: `Agent started with ADK web command. Access the UI at ${devUiUrl}`,
        error: null,
        executionTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // in MB
        executionDetails: {
          stdout: [`Agent started with ADK web command`],
          stderr: [],
          exitCode: 0,
          status: 'running',
          duration: Date.now() - startTime,
          serverUrl: devUiUrl // Use the dev-ui URL that directly goes to the UI
        },
        // Add dedicated fields for the frontend to show an "Open Link" button
        openUrl: devUiUrl, // Direct link to the dev UI with agent_package selected
        showOpenLink: true,
        linkText: 'Open Agent UI'
      };

      console.log('📊 Execution Results:');
      console.log('━━━━━━━━━━━━━━━━━━');
      
      console.log(`📤 ADK web server is accessible at: ${devUiUrl}`);
      console.log(`Debug info:`);
      console.log(`• Status: ${response.executionDetails.status}`);
      console.log(`• Duration: ${response.executionDetails.duration} ms`);
      console.log(`• Server URL: ${response.executionDetails.serverUrl}`);

      console.log('\n📈 Execution Metadata:');
      console.log(`• Execution Time: ${response.executionTime}ms`);
      console.log(`• Memory Usage: ${response.memoryUsage.toFixed(2)}MB`);
      console.log(`• Status: ${response.executionDetails.status}`);
      console.log(`• Server URL: ${response.executionDetails.serverUrl}`);
      
      // Check if the ADK web process actually started by examining logs or port activity
      let isServerRunning = false;
      
      // Look for evidence in the logs that the server started
      try {
        const lastLog = await sbx.commands.run('cd workspace && tail -n 20 adk_web.log || echo "Log file not found"');
        // Check if any of these strings appear in the log indicating server is running
        if (lastLog.stdout.includes('Running on') || 
            lastLog.stdout.includes('Application startup complete') ||
            lastLog.stdout.includes('Started server process')) {
          isServerRunning = true;
        }
      } catch (err) {
        console.log('Could not check log file for server status:', err.message);
      }
      
      // Verify by checking if port 8000 is in use
      try {
        const portCheck = await sbx.commands.run('netstat -tulpn | grep 8000 || echo "Port not in use"');
        if (portCheck.stdout.includes('8000')) {
          isServerRunning = true;
        }
      } catch (err) {
        console.log('Could not check port status:', err.message);
      }
      
      if (isServerRunning) {
        // Server is running, return success response
        res.status(200).json(response);
      } else {
        // Server did not start properly, return error
        console.error('⚠️ ADK web server does not appear to be running!');
        res.status(500).json({
          error: "ADK web server failed to start properly. Please try again.",
          executionTime: Date.now() - startTime
        });
      }
    } catch (error) {
      console.error('\n❌ Error running ADK web command:');
      console.error(error);
      
      // Cleanup sandbox
      try {
        if (sbx) {
          console.log('🧹 Cleaning up sandbox after error...');
          
          // Try to kill the ADK web process if it's running
          try {
            const killResult = await sbx.commands.run('if [ -f workspace/adk_web.pid ]; then kill $(cat workspace/adk_web.pid) 2>/dev/null || true; rm workspace/adk_web.pid; fi', { timeoutMs: 10000 });
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
      { method: 'POST', path: '/api/execute', description: 'Execute code in sandbox' },
      { method: 'GET', path: '/api/health', description: 'Health check endpoint' }
    ],
    note: "This is a Vercel-compatible version with limited functionality. File operations that require local filesystem won't work."
  });
});

// Export for Vercel serverless function
export default app; 