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
  
  let sbx = null;
  
  try {
    const { files } = req.body;
    
    if (!files || !files['agent.py']) {
      console.log('❌ Error: No agent.py file provided');
      return res.status(400).json({ error: 'No agent.py file provided' });
    }

    if (!process.env.E2B_API_KEY) {
      throw new Error('E2B_API_KEY environment variable is not set');
    }

    console.log('📝 Files to create:');
    console.log('━━━━━━━━━━━━━━━━━');
    Object.entries(files).forEach(([filename, content]) => {
      console.log(`• ${filename} (${content.length} characters)`);
    });
    console.log('━━━━━━━━━━━━━━━━━\n');

    // Create sandbox instance with Python template
    console.log('🔧 Creating E2B sandbox instance...');
    sbx = await Sandbox.create({ 
      apiKey: process.env.E2B_API_KEY,
      template: 'Python3',
      onStdout: (data) => {
        console.log('📤 Stdout:', data);
      },
      onStderr: (data) => {
        console.log('❌ Stderr:', data);
      }
    });
    console.log('✅ Sandbox created successfully\n');

    // Install required system packages
    console.log('📦 Installing system packages...');
    await sbx.commands.run('apt-get update && apt-get install -y netcat-openbsd fuser curl net-tools');
    console.log('✅ System packages installed\n');

    // Create proper directory structure for ADK agent detection
    console.log('📁 Creating agent directories...');
    await sbx.commands.run('mkdir -p workspace/multi_tool_agent');
    console.log('✅ Workspace and agent package directories created\n');

    // Write files to the sandbox with proper ADK structure
    console.log('📝 Writing files to sandbox...');
    
    // Create __init__.py first
    await sbx.files.write('workspace/multi_tool_agent/__init__.py', 'from .agent import root_agent\n__all__ = ["root_agent"]\n');
    console.log('✅ Created __init__.py');
    
    // Write agent.py with proper imports
    const agentPyContent = files['agent.py'];
    await sbx.files.write('workspace/multi_tool_agent/agent.py', agentPyContent);
    console.log('✅ Created agent.py');
    
    // Create .env file with proper configuration
    await sbx.files.write('workspace/multi_tool_agent/.env', `
GOOGLE_GENAI_USE_VERTEXAI=FALSE
GOOGLE_API_KEY=AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY
`.trim());
    console.log('✅ Created .env file');

    // Create adk.config.json with proper configuration
    await sbx.files.write('workspace/adk.config.json', JSON.stringify({
      "api_key": "AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY",
      "project_id": "your-project-id",
      "location": "us-central1"
    }, null, 2));
    console.log('✅ Created adk.config.json');

    // Install Python dependencies
    console.log('📦 Installing Python dependencies...');
    
    try {
      // Create requirements.txt with specific versions
      await sbx.files.write('workspace/requirements.txt', `
google-adk==0.5.0
google-cloud-aiplatform==1.38.0
google-cloud-core==2.3.3
google-api-core==2.15.0
protobuf==4.25.1
grpcio==1.60.0
      `.trim());
      
      // Install dependencies with verbose output and error handling
      console.log('Installing pip packages...');
      
      // First upgrade pip itself
      const pipUpgradeResult = await sbx.commands.run('python -m pip install --upgrade pip');
      console.log('Pip upgrade output:', pipUpgradeResult.stdout);
      if (pipUpgradeResult.stderr) console.log('Pip upgrade warnings:', pipUpgradeResult.stderr);
      
      // Then install the requirements with detailed error output
      const pipResult = await sbx.commands.run('python -m pip install -v -r workspace/requirements.txt');
      
      // Log detailed installation output
      console.log('Pip install output:', pipResult.stdout);
      if (pipResult.stderr) console.log('Pip install warnings:', pipResult.stderr);
      
      if (pipResult.exitCode !== 0) {
        throw new Error(`Failed to install dependencies: ${pipResult.stderr}`);
      }
      
      // Verify installations
      const verifyResult = await sbx.commands.run('python -m pip list');
      console.log('Installed packages:', verifyResult.stdout);
      
      console.log('✅ Dependencies installed successfully\n');
    } catch (error) {
      console.error('Error installing dependencies:', error);
      throw new Error(`Failed to install Python dependencies: ${error.message}`);
    }

    // Create startup script
    await sbx.files.write('workspace/start_adk.sh', `#!/bin/bash
set -e  # Exit on any error

# Load environment variables
set -a
source multi_tool_agent/.env
set +a

# Ensure Python environment is working
echo "Verifying Python environment..."
python -c "import google.adk" || {
    echo "Error: google.adk module not found"
    exit 100
}

# Verify API key format
echo "Verifying API key..."
if [[ ! $GOOGLE_API_KEY =~ ^AIza ]]; then
    echo "Error: Invalid API key format. Must start with 'AIza'"
    exit 100
fi

# Kill any existing process on port 8000
echo "Checking for existing processes on port 8000..."
fuser -k 8000/tcp 2>/dev/null || true

# Set up error handling
handle_error() {
    echo "Error occurred. Check adk_web.log for details"
    cat adk_web.log
    exit 100
}
trap handle_error ERR

# Set PYTHONPATH to include the agent package
export PYTHONPATH=/home/user/workspace:$PYTHONPATH

# Run adk web command with specific host and port binding
echo "Starting ADK web server..."
cd /home/user/workspace
adk web \\
  --api_key=$GOOGLE_API_KEY \\
  --host=0.0.0.0 \\
  --port=8000 \\
  > adk_web.log 2>&1 &

# Save the PID
echo $! > adk_web.pid

# Wait for server to start
echo "Waiting for server to start..."
max_attempts=30
attempt=0
while ! curl -s http://localhost:8000/health >/dev/null && [ $attempt -lt $max_attempts ]; do
    sleep 1
    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts: Checking server status..."
    
    # Check if process is still running
    if ! kill -0 $(cat adk_web.pid) 2>/dev/null; then
        echo "Server process died. Last log entries:"
        tail -n 20 adk_web.log
        exit 100
    fi
done

# Final check
if curl -s http://localhost:8000/health >/dev/null; then
    echo "Server started successfully on port 8000"
    echo "Server logs:"
    cat adk_web.log
else
    echo "Failed to start server. Server logs:"
    cat adk_web.log
    exit 100
fi`);

    // Make script executable
    await sbx.commands.run('chmod +x workspace/start_adk.sh');

    // Start the ADK web server with better error handling
    console.log('⚡ Starting ADK web server...');
    const startResult = await sbx.commands.run('cd workspace && ./start_adk.sh', {
        timeout: 60000  // Give it 60 seconds to start
    });
    
    if (startResult.exitCode === 100) {
        // Exit code 100 typically indicates ADK initialization issues
        console.error('ADK initialization failed. Checking for common issues...');
        
        // Check Python environment
        const pythonVersion = await sbx.commands.run('python --version');
        console.log('Python version:', pythonVersion.stdout);
        
        // Check ADK installation
        const adkVersion = await sbx.commands.run('pip show google-adk');
        console.log('ADK installation:', adkVersion.stdout);
        
        // Check if API key is properly set
        const envCheck = await sbx.commands.run('cd workspace/multi_tool_agent && python -c "import os; print(os.environ.get(\'GOOGLE_API_KEY\'))"');
        if (!envCheck.stdout || !envCheck.stdout.trim().startsWith('AIza')) {
            throw new Error('Invalid or missing Google API key. Please ensure GOOGLE_API_KEY is properly set and starts with "AIza"');
        }
        
        // Check ADK config file
        const configCheck = await sbx.commands.run('cat workspace/adk.config.json');
        if (!configCheck.stdout || !configCheck.stdout.includes('"api_key"')) {
            throw new Error('Invalid ADK configuration. Please check adk.config.json');
        }
        
        // Check agent package structure
        const packageCheck = await sbx.commands.run('ls -R workspace/multi_tool_agent');
        if (!packageCheck.stdout.includes('__init__.py') || !packageCheck.stdout.includes('agent.py')) {
            throw new Error('Invalid agent package structure. Missing required files.');
        }
        
        throw new Error('ADK initialization failed. Please check the logs for details.');
    } else if (startResult.exitCode !== 0) {
        console.error('Server startup logs:', startResult.stdout);
        console.error('Server startup errors:', startResult.stderr);
        throw new Error(`Failed to start ADK web server: ${startResult.stderr || startResult.stdout}`);
    }

    // Double check server is running
    try {
        const healthCheck = await sbx.commands.run('curl -s http://localhost:8000/health');
        if (healthCheck.exitCode !== 0) {
            throw new Error('Health check failed after server start');
        }
    } catch (error) {
        console.error('Health check failed:', error);
        // Get the server logs
        const logs = await sbx.commands.run('cat workspace/adk_web.log').catch(() => ({ stdout: 'No logs available' }));
        throw new Error(`Server health check failed. Logs:\n${logs.stdout}`);
    }

    // Get the public URL
    const publicHost = sbx.getHost(8000);
    const publicUrl = `https://${publicHost}`;

    // Format response
    const response = {
      output: `ADK web server started successfully. Access the UI at ${publicUrl}`,
      error: null,
      executionTime: Date.now() - startTime,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      executionDetails: {
        stdout: startResult.stdout ? startResult.stdout.split('\n') : [],
        stderr: startResult.stderr ? startResult.stderr.split('\n') : [],
        exitCode: startResult.exitCode,
        status: 'running',
        serverUrl: publicUrl
      },
      openUrl: publicUrl,
      showOpenLink: true,
      linkText: 'Open Agent UI'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error:', error);
    
    // Collect additional diagnostic information
    let diagnosticInfo = {
      error: error.message || 'Unknown error occurred',
      executionTime: Date.now() - startTime
    };

    // If we have a sandbox instance, try to get more information
    if (sbx) {
      try {
        // Get ADK web logs if they exist
        const logs = await sbx.commands.run('cat workspace/adk_web.log').catch(() => ({ stdout: 'No logs available' }));
        diagnosticInfo.adkLogs = logs.stdout;

        // Check Python environment
        const pythonVersion = await sbx.commands.run('python --version').catch(() => ({ stdout: 'Unknown' }));
        diagnosticInfo.pythonVersion = pythonVersion.stdout;

        // Check installed packages
        const pipList = await sbx.commands.run('pip list').catch(() => ({ stdout: 'No package info available' }));
        diagnosticInfo.installedPackages = pipList.stdout;

        // Check if ADK is properly installed
        const adkCheck = await sbx.commands.run('python -c "import google.adk; print(google.adk.__version__)"').catch(() => ({ stdout: 'ADK not found', stderr: 'Import error' }));
        diagnosticInfo.adkVersion = adkCheck.stdout;
        if (adkCheck.stderr) {
          diagnosticInfo.adkError = adkCheck.stderr;
        }

        // Cleanup sandbox
        console.log('🧹 Cleaning up sandbox after error...');
        await sbx.commands.run('cd workspace && [ -f adk_web.pid ] && kill $(cat adk_web.pid) 2>/dev/null || true');
        // Use proper method to terminate sandbox with fallbacks
        if (typeof sbx.destroy === 'function') {
          await sbx.destroy();
        } else if (typeof sbx.close === 'function') {
          await sbx.close();
        } else if (typeof sbx.kill === 'function') {
          await sbx.kill();
        }
        console.log('✅ Sandbox cleaned up after error');
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
        diagnosticInfo.cleanupError = cleanupError.message;
      }
    }

    // Send detailed error response
    res.status(500).json({
      error: 'Failed to execute code',
      details: diagnosticInfo,
      executionTime: Date.now() - startTime
    });
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