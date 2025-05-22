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

    // Install Python dependencies
    console.log('📦 Installing Python dependencies...');
    
    // Create requirements.txt
    await sbx.files.write('workspace/requirements.txt', `
google-adk>=0.5.0
google-cloud-aiplatform>=1.38.0
    `.trim());
    
    // Install dependencies
    const pipResult = await sbx.commands.run(`
      python -m pip install --upgrade pip &&
      python -m pip install -r workspace/requirements.txt
    `);
    
    if (pipResult.exitCode !== 0) {
      throw new Error(`Failed to install dependencies: ${pipResult.stderr}`);
    }
    
    console.log('✅ Dependencies installed successfully\n');

    // Create ADK config file
    console.log('📝 Creating ADK config file...');
    await sbx.files.write('workspace/adk.config.json', JSON.stringify({
      "api_key": "AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY",
      "project_id": "your-project-id",
      "location": "us-central1"
    }, null, 2));
    console.log('✅ ADK config file created');

    // Create .env file with API keys
    await sbx.files.write('workspace/.env', `
GOOGLE_API_KEY=AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY
ADK_API_KEY=AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
    `.trim());
    
    // Create startup script
    await sbx.files.write('workspace/start_adk.sh', `#!/bin/bash
# Load environment variables
set -a
source .env
set +a

# Kill any existing process on port 8000
fuser -k 8000/tcp 2>/dev/null || true

# Run adk web command with specific host and port binding
adk web \\
  --api_key=$GOOGLE_API_KEY \\
  --host=0.0.0.0 \\
  --port=8000 \\
  --default_app=agent_package \\
  --dev_mode=true \\
  > adk_web.log 2>&1 &

# Save the PID
echo $! > adk_web.pid

# Wait for server to start
max_attempts=30
attempt=0
echo "Waiting for ADK web server to start..."

while ! curl -s http://localhost:8000/health >/dev/null && [ $attempt -lt $max_attempts ]; do
  sleep 1
  attempt=$((attempt + 1))
  echo "Attempt $attempt/$max_attempts..."
done

# Verify server is running and agent package is detected
if curl -s http://localhost:8000/health >/dev/null; then
  echo "ADK web server started successfully on port 8000"
  
  # Wait a moment for package detection
  sleep 2
  
  # Check if our agent package is detected
  if curl -s http://localhost:8000/api/v1/packages | grep -q "agent_package"; then
    echo "Agent package detected successfully"
  else
    echo "Warning: Agent package not detected yet. It may take a few moments to appear."
  fi
else
  echo "Failed to start ADK web server"
  exit 1
fi
`);

    // Make script executable
    await sbx.commands.run('chmod +x workspace/start_adk.sh');

    // Start the ADK web server
    console.log('⚡ Starting ADK web server...');
    const startResult = await sbx.commands.run('cd workspace && ./start_adk.sh');
    
    if (startResult.exitCode !== 0) {
      throw new Error(`Failed to start ADK web server: ${startResult.stderr}`);
    }

    // Get the public URL and add required parameters
    const publicHost = sbx.getHost(8000);
    const publicUrl = new URL(`https://${publicHost}`);
    publicUrl.searchParams.set('app', 'agent_package');
    publicUrl.searchParams.set('mode', 'dev');

    // Format response
    const response = {
      output: `ADK web server started successfully. Access the UI at ${publicUrl.toString()}`,
      error: null,
      executionTime: Date.now() - startTime,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      executionDetails: {
        stdout: startResult.stdout ? startResult.stdout.split('\n') : [],
        stderr: startResult.stderr ? startResult.stderr.split('\n') : [],
        exitCode: startResult.exitCode,
        status: 'running',
        serverUrl: publicUrl.toString()
      },
      openUrl: publicUrl.toString(),
      showOpenLink: true,
      linkText: 'Open Agent UI'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error:', error);
    
    // Cleanup
    if (sbx) {
      try {
        await sbx.commands.run('cd workspace && [ -f adk_web.pid ] && kill $(cat adk_web.pid)');
        await sbx.destroy();
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
    
    res.status(500).json({
      error: error.message || 'Unknown error occurred',
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