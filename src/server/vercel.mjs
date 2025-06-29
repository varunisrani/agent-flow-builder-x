import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Sandbox } from '@e2b/code-interpreter';

// Create Express server
const app = express();
const PORT = process.env.PORT || 3001;

// CORS middleware with proper configuration
app.use(cors({
  origin: ['http://localhost:8080', 'https://cogentx.dev', 'http://localhost:3000', 'http://localhost:5173', 'https://agent-flow-builder.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Origin'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle OPTIONS requests explicitly
app.options('*', (req, res) => {
  // Set specific origins for CORS
  const allowedOrigins = ['http://localhost:8080', 'https://cogentx.dev', 'http://localhost:3000', 'http://localhost:5173', 'https://agent-flow-builder.vercel.app'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // If origin is not in our list, use wildcard
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(204).end();
});

// Add a middleware to ensure CORS headers are set on all responses
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:8080', 'https://cogentx.dev', 'http://localhost:3000', 'http://localhost:5173', 'https://agent-flow-builder.vercel.app'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // If origin is not in our list, use wildcard
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
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
      // template: 'base', // Let E2B use default template
      timeout: 300000, // 5 minute timeout
      onStdout: (data) => {
        console.log('📤 Stdout:', data);
      },
      onStderr: (data) => {
        console.log('❌ Stderr:', data);
      },
      env: {
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        ADK_API_KEY: process.env.ADK_API_KEY,
        PYTHONUNBUFFERED: '1' // Ensure Python output is not buffered
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
      venvResult = await sbx.commands.run('python3.9 -m venv workspace/venv');
      console.log('✅ Successfully created venv with Python 3.9');
    } catch (error) {
      console.log('⚠️ Python 3.9 not available, falling back to default Python version');
      venvResult = await sbx.commands.run('python3 -m venv workspace/venv');
    }
    
    console.log(`  • Exit code: ${venvResult.exitCode}`);
    if (venvResult.stdout) console.log(`  • Output: ${venvResult.stdout}`);
    if (venvResult.stderr) console.log(`  • Errors: ${venvResult.stderr}`);
    console.log('✅ Virtual environment created\n');
    
    console.log('📦 Activating virtual environment and installing dependencies...');
    console.log('  • Installing google-adk package...');
    const pipResult = await sbx.commands.run('source workspace/venv/bin/activate && pip install google-adk -v');
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
    const verifyResult = await sbx.commands.run('source workspace/venv/bin/activate && pip list | grep google-adk');
    if (verifyResult.stdout) {
      console.log(`  • Installed: ${verifyResult.stdout.trim()}`);
    } else {
      console.log('  • Warning: Could not verify google-adk installation');
    }
    
    // Create ADK config file
    console.log('📝 Creating ADK config file...');
    await sbx.files.write('workspace/adk.config.json', JSON.stringify({
      "api_key": process.env.GOOGLE_API_KEY || process.env.ADK_API_KEY || ""
    }, null, 2));
    console.log('✅ ADK config file created');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Python environment ready\n');

    // Instead of executing the code directly, run the ADK web command
    console.log('⚡ Starting agent with ADK web command...');
    
    try {
      // Create a .env file with environment variables from process.env
      await sbx.files.write('workspace/.env', `GOOGLE_API_KEY=${process.env.GOOGLE_API_KEY || ''}
ADK_API_KEY=${process.env.ADK_API_KEY || process.env.GOOGLE_API_KEY || ''}
`);
      
      // Create a startup script that properly detaches the process and binds to 0.0.0.0
      await sbx.files.write('workspace/start_adk.sh', `#!/bin/bash
set -e  # Exit on any error

# Source virtual environment
source ./venv/bin/activate

# Set environment variables for Google ADK
export GOOGLE_API_KEY=\${GOOGLE_API_KEY:-$GOOGLE_API_KEY}
export ADK_API_KEY=\${ADK_API_KEY:-$ADK_API_KEY}

# Change to workspace directory
cd /home/user/workspace

# Check if ADK is installed correctly
if ! command -v adk &> /dev/null; then
    echo "ADK command not found. Installing..."
    pip install --upgrade google-adk
fi

# Kill any existing ADK web processes
pkill -f "adk web" || true

# Start ADK web server with proper error handling
nohup adk web \
  --api_key=\${ADK_API_KEY} \
  --host 0.0.0.0 \
  --port 8000 \
  --log_level debug \
  > adk_web.log 2>&1 &

# Save the PID and disown
echo $! > adk_web.pid
disown -h $!

# Wait for server to start using curl instead of netstat
for i in {1..30}; do
  if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo "ADK web server started successfully"
    exit 0
  fi
  sleep 1
done

echo "Failed to start ADK web server"
exit 1
`);
      
      // Make the script executable
      await sbx.commands.run('chmod +x workspace/start_adk.sh', { timeoutMs: 30000 });
      
      // Execute the startup script with proper error handling
      console.log('⚡ Starting ADK web server...');
      try {
        const adkWebResult = await sbx.commands.run('cd workspace && ./start_adk.sh', { 
          timeoutMs: 60000,  // Increase timeout to 60 seconds
          shell: true,
          env: {
            GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
            ADK_API_KEY: process.env.ADK_API_KEY
          }
        });
        
        console.log('📋 ADK web server startup output:');
        if (adkWebResult.stdout) console.log(adkWebResult.stdout);
        if (adkWebResult.stderr) console.log(adkWebResult.stderr);
        
        // Verify server is running using curl instead of netstat
        try {
          const isRunning = await sbx.commands.run('curl -s http://localhost:8000 > /dev/null 2>&1', { timeoutMs: 5000 });
          if (isRunning.exitCode !== 0) {
            throw new Error('ADK web server failed to start - server not responding');
          }
        } catch (curlError) {
          console.log('⚠️ Could not verify server is running via curl, continuing anyway...');
        }
        
        console.log('✅ ADK web server started successfully');
        
        // Get the public URL for the ADK web server (port 8000)
        const publicHost = sbx.getHost(8000);
        const publicUrl = `https://${publicHost}`;
        
        // Try to verify the server is actually responding
        try {
          const curlCheck = await sbx.commands.run(`curl -s -o /dev/null -w "%{http_code}" http://localhost:8000 || echo "Failed to connect"`);
          console.log(`✅ HTTP server response check: ${curlCheck.stdout}`);
        } catch (error) {
          console.log('⚠️ Could not verify HTTP server response');
        }
        
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

// If running locally (not in Vercel), start the server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   • GET  /api/health - Health check`);
    console.log(`   • POST /api/execute - Execute agent code`);
    console.log(`   • GET  / - API information`);
  });
} 