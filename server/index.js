import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Sandbox } from '@e2b/code-interpreter';

// Create Express server
const app = express();
const PORT = process.env.PORT || 3001;

// Helper function to set CORS headers consistently
const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:8080', 
    'https://cogentx.dev', 
    'http://localhost:3000', 
    'http://localhost:5173', 
    'https://agent-flow-builder.vercel.app', 
    'https://agent-flow-builder-api.onrender.com'
  ];
  
  // Log origin for debugging
  console.log(`CORS request from origin: ${origin || 'undefined'}, path: ${req.path}, method: ${req.method}`);
  
  // In production or if the origin is in our list, we'll allow it
  if (origin && (process.env.NODE_ENV === 'production' || allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log(`Setting Access-Control-Allow-Origin: ${origin}`);
  } else {
    // If origin is not in our list or undefined, use wildcard
    res.header('Access-Control-Allow-Origin', '*');
    console.log('Setting Access-Control-Allow-Origin: * (wildcard)');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
};

// CORS middleware with proper configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:8080', 
      'https://cogentx.dev', 
      'http://localhost:3000', 
      'http://localhost:5173', 
      'https://agent-flow-builder.vercel.app', 
      'https://agent-flow-builder-api.onrender.com'
    ];
    
    // In production, allow all origins
    if (process.env.NODE_ENV === 'production') {
      callback(null, true);
      return;
    }
    
    // Check if the origin is in our allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Allow all origins if not explicitly listed
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Origin'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle OPTIONS requests explicitly
app.options('*', (req, res) => {
  setCorsHeaders(req, res);
  res.status(204).end();
});

// Add a custom middleware to ensure CORS headers are set on all responses
app.use((req, res, next) => {
  setCorsHeaders(req, res);
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
  
  // Set CORS headers for this specific response
  setCorsHeaders(req, res);
  
  try {
    const { files } = req.body;
    
    if (!files || !files['agent.py']) {
      console.log('❌ Error: No agent.py file provided');
      return res.status(400).json({ error: 'No agent.py file provided' });
    }

    // Check if the agent code is an MCP agent
    const isMcpAgent = files['agent.py'].includes('MCPToolset') || 
                       files['agent.py'].includes('mcp_tool') || 
                       files['agent.py'].includes('StdioServerParameters');
    
    console.log(`📊 Agent type: ${isMcpAgent ? 'MCP Agent' : 'Standard ADK Agent'}`);
    
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
        SMITHERY_API_KEY: process.env.SMITHERY_API_KEY,
        PYTHONUNBUFFERED: '1', // Ensure Python output is not buffered
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
      },
      rootUser: true // Run as root to avoid permission issues
    });
    console.log('✅ Sandbox created successfully\n');

    // Create proper directory structure for ADK agent detection
    console.log('📁 Creating agent directories...');
    await sbx.commands.run('mkdir -p workspace/multi_tool_agent');
    console.log('✅ Workspace and multi_tool_agent directories created\n');

    // Write files to the sandbox with proper ADK structure
    console.log('📝 Writing files to sandbox...');
    for (const [filename, content] of Object.entries(files)) {
      await sbx.files.write(`workspace/multi_tool_agent/${filename}`, content);
      console.log(`✅ Created ${filename}`);
    }

    // Create a fallback non-MCP version of the agent if this is an MCP agent
    if (isMcpAgent) {
      console.log('📝 Creating fallback non-MCP agent version...');
      const fallbackAgentContent = `from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types  # For Content/Part
import asyncio
import os

# Fallback agent without MCP tools
root_agent = LlmAgent(
    name="DocQueryAgent",
    model="gemini-2.0-flash",
    description="An LlmAgent that handles user queries about documentation.",
    instruction="You are a helpful assistant that can answer questions and provide information. Note: MCP tools are not available in this fallback mode.",
    tools=[]  # No tools in fallback mode
)

# Session service and runner setup - MUST INCLUDE app_name
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="DocQueryAgent")

async def main():
    # Create a session
    user_id = "user"
    session = session_service.create_session(state={}, app_name="DocQueryAgent", user_id=user_id)
    session_id = session.id

    # Create an initial message (Content object)
    new_message = types.Content(
        role="user",
        parts=[types.Part(text="Hello, agent!")]
    )

    # Run the agent
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=new_message
    ):
        print(event)

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent"]
`;
      await sbx.files.write('workspace/multi_tool_agent/agent_fallback.py', fallbackAgentContent);
      console.log('✅ Created fallback agent version');
    }
    
    // Create __init__.py file to make multi_tool_agent a proper Python package
    console.log('📝 Creating __init__.py file...');
    const initPyContent = `# Try to import from the main agent, fallback to agent_fallback if MCP fails
try:
    from .agent import root_agent
except ImportError as e:
    print(f"Warning: Failed to import main agent: {e}")
    try:
        from .agent_fallback import root_agent
        print("Using fallback agent without MCP tools")
    except ImportError as fallback_error:
        print(f"Error: Could not import fallback agent either: {fallback_error}")
        raise

__all__ = ["root_agent"]
`;
    await sbx.files.write('workspace/multi_tool_agent/__init__.py', initPyContent);
    console.log('✅ Created __init__.py file with fallback support');
    
    // Create accessible_files directory for MCP filesystem tool
    console.log('📁 Creating accessible_files directory for MCP filesystem tool...');
    await sbx.commands.run('mkdir -p workspace/multi_tool_agent/accessible_files');
    
    // Add some sample files to the accessible_files directory
    await sbx.files.write('workspace/multi_tool_agent/accessible_files/sample.txt', 'This is a sample text file for the MCP filesystem tool.');
    await sbx.files.write('workspace/multi_tool_agent/accessible_files/notes.md', '# Sample Notes\n\nThis is a markdown file that can be accessed by the MCP filesystem tool.');
    await sbx.files.write('workspace/multi_tool_agent/accessible_files/data.json', JSON.stringify({
      name: "Sample Data",
      items: [1, 2, 3, 4, 5],
      nested: {
        key: "value"
      }
    }, null, 2));
    
    console.log('✅ Created sample files for MCP filesystem tool');
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

    // First, try to install google-adk with MCP extra
    let mcpInstallSuccess = false;
    try {
      const pipResult = await sbx.commands.run('source workspace/venv/bin/activate && pip install "google-adk[mcp]" mem0 langfuse memzero m0 -v');
      console.log(`  • google-adk[mcp] exit code: ${pipResult.exitCode}`);
      if (pipResult.exitCode === 0) {
        mcpInstallSuccess = true;
        console.log('  • ✅ Successfully installed google-adk with MCP support');
      } else {
        console.log('  • ⚠️ google-adk[mcp] installation failed, trying alternative approach');
        if (pipResult.stderr) {
          console.log('  • Error details:', pipResult.stderr);
        }
      }
    } catch (error) {
      console.log(`  • ⚠️ Error installing google-adk[mcp]: ${error.message}`);
    }

    // If MCP extra failed, install google-adk and MCP separately
    if (!mcpInstallSuccess) {
      console.log('  • Installing google-adk and MCP dependencies separately...');
      try {
        // Install base google-adk
        const adkResult = await sbx.commands.run('source workspace/venv/bin/activate && pip install google-adk mem0 langfuse memzero m0 -v');
        console.log(`  • google-adk exit code: ${adkResult.exitCode}`);

        // Install MCP separately
        const mcpResult = await sbx.commands.run('source workspace/venv/bin/activate && pip install mcp aiohttp -v');
        console.log(`  • MCP dependencies exit code: ${mcpResult.exitCode}`);

        if (adkResult.exitCode === 0 && mcpResult.exitCode === 0) {
          console.log('  • ✅ Successfully installed google-adk and MCP dependencies separately');
          mcpInstallSuccess = true;
        } else {
          console.log('  • ❌ Failed to install dependencies separately');
          if (adkResult.stderr) console.log('  • ADK errors:', adkResult.stderr);
          if (mcpResult.stderr) console.log('  • MCP errors:', mcpResult.stderr);
        }
      } catch (error) {
        console.log(`  • ❌ Error installing dependencies separately: ${error.message}`);
      }
    }

    // Install additional MCP-specific dependencies if this is an MCP agent
    if (isMcpAgent && mcpInstallSuccess) {
      console.log('  • Installing additional MCP-specific dependencies...');
      try {
        const extraMcpResult = await sbx.commands.run('source workspace/venv/bin/activate && pip install anyio pydantic websockets httpx-sse');
        console.log(`  • Extra MCP dependencies exit code: ${extraMcpResult.exitCode}`);
        if (extraMcpResult.stdout) console.log(`  • Extra MCP output: ${extraMcpResult.stdout}`);
        if (extraMcpResult.stderr) console.log(`  • Extra MCP errors: ${extraMcpResult.stderr}`);
      } catch (error) {
        console.log(`  • ⚠️ Warning: Error installing extra MCP dependencies: ${error.message}`);
      }
    }
    
    // Verify the installation
    console.log('\n📋 Verifying installation...');
    const verifyResult = await sbx.commands.run('source workspace/venv/bin/activate && pip list | grep -E "(google-adk|mcp)"');
    if (verifyResult.stdout) {
      console.log(`  • Installed packages:`);
      verifyResult.stdout.split('\n').forEach(line => {
        if (line.trim()) console.log(`    ${line.trim()}`);
      });
    } else {
      console.log('  • Warning: Could not verify package installations');
    }

    // Test MCP import if this is an MCP agent
    if (isMcpAgent) {
      console.log('  • Testing MCP imports...');
      try {
        const mcpTestResult = await sbx.commands.run(`source workspace/venv/bin/activate && python3 -c "
try:
    from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
    from mcp import ClientSession
    print('✅ MCP imports successful')
except ImportError as e:
    print(f'❌ MCP import failed: {e}')
    exit(1)
"`);
        console.log(`    ${mcpTestResult.stdout.trim()}`);
        if (mcpTestResult.exitCode !== 0) {
          console.log('  • ⚠️ Warning: MCP imports failed, agent may not work correctly');
          if (mcpTestResult.stderr) console.log(`    Error: ${mcpTestResult.stderr}`);
        }
      } catch (error) {
        console.log(`  • ⚠️ Warning: Could not test MCP imports: ${error.message}`);
      }
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
      // Create a .env file with environment variables from deployed server
      await sbx.files.write('workspace/.env', `# Google API Key
GOOGLE_API_KEY=${process.env.GOOGLE_API_KEY || ''}

# GitHub Personal Access Token
GITHUB_PERSONAL_ACCESS_TOKEN=${process.env.GITHUB_PERSONAL_ACCESS_TOKEN || ''}
LANGFUSE_SECRET_KEY=${process.env.LANGFUSE_SECRET_KEY || ''}
LANGFUSE_PUBLIC_KEY=${process.env.LANGFUSE_PUBLIC_KEY || ''}
LANGFUSE_HOST=${process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'}
MEM0_API_KEY=${process.env.MEM0_API_KEY || ''}
OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ''}
ADK_API_KEY=${process.env.ADK_API_KEY || process.env.GOOGLE_API_KEY || ''}
SMITHERY_API_KEY=${process.env.SMITHERY_API_KEY || ''}
`);

      // Create requirements.txt file with all necessary packages
      await sbx.files.write('workspace/requirements.txt', `google-adk
python-dotenv
mem0
langfuse
memzero
m0
mcp
aiohttp
anyio
pydantic
websockets
httpx-sse
`);
      
      // Create a Python script to check if port is open
      await sbx.files.write('workspace/check_port.py', `import socket
import sys
import time

def is_port_open(host, port, timeout=1):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except:
        sock.close()
        return False

def wait_for_port(port, max_attempts=30, delay=1):
    print(f"Waiting for port {port} to be available...")
    for attempt in range(max_attempts):
        if is_port_open('localhost', port):
            print(f"Port {port} is now open!")
            return True
        time.sleep(delay)
    print(f"Timed out waiting for port {port}")
    return False

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    sys.exit(0 if wait_for_port(port) else 1)
`);

      // Create a startup script that properly detaches the process and binds to 0.0.0.0
      await sbx.files.write('workspace/start_adk.sh', `#!/bin/bash
set -e  # Exit on any error

# Source virtual environment
source ./venv/bin/activate

# Set environment variables for Google ADK and Smithery
export GOOGLE_API_KEY=\${GOOGLE_API_KEY:-${process.env.GOOGLE_API_KEY || ''}}
export ADK_API_KEY=\${ADK_API_KEY:-${process.env.ADK_API_KEY || process.env.GOOGLE_API_KEY || ''}}
export SMITHERY_API_KEY=\${SMITHERY_API_KEY:-${process.env.SMITHERY_API_KEY || ''}}

# Change to workspace directory
cd /home/user/workspace

# Create directory for MCP filesystem access if needed
mkdir -p multi_tool_agent/accessible_files
chmod 777 multi_tool_agent/accessible_files
echo "Hello from the MCP filesystem server!" > multi_tool_agent/accessible_files/hello.txt
echo "This is a test file created for MCP filesystem access." > multi_tool_agent/accessible_files/test.txt

# Check if ADK is installed correctly
if ! command -v adk &> /dev/null; then
    echo "ADK command not found. Installing..."
    # Try with MCP support first, fallback to base installation
    if ! pip install --upgrade "google-adk[mcp]" mem0 langfuse memzero m0 2>/dev/null; then
        echo "MCP extra not available, installing base google-adk and MCP separately..."
        pip install --upgrade google-adk mem0 langfuse memzero m0
        pip install mcp aiohttp anyio pydantic websockets httpx-sse
    fi
fi

# Install Node.js packages needed for MCP tools
echo "Installing Node.js packages for MCP support..."
if [ -d "/home/user/workspace/node_modules" ]; then
    echo "Node modules already installed, skipping..."
else
    # Install MCP server packages
    npm init -y > /dev/null 2>&1 || true
    npm install --no-fund --no-audit --silent @modelcontextprotocol/server-filesystem > /dev/null 2>&1 || true
    npm install --no-fund --no-audit --silent @modelcontextprotocol/server-github > /dev/null 2>&1 || true
    npm install --no-fund --no-audit --silent @modelcontextprotocol/server-time > /dev/null 2>&1 || true
fi

# Kill any existing ADK web processes
pkill -f "adk web" || true

# Add the workspace directory to PYTHONPATH
export PYTHONPATH=/home/user/workspace:$PYTHONPATH

# Test if MCP imports work and switch to fallback if needed
if [ -f "multi_tool_agent/agent.py" ] && grep -q "MCPToolset" multi_tool_agent/agent.py; then
    echo "Testing MCP imports..."
    if ! python3 -c "
try:
    from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
    from mcp import ClientSession
    print('MCP imports successful')
except ImportError as e:
    print(f'MCP import failed: {e}')
    exit(1)
" 2>/dev/null; then
        echo "MCP imports failed, switching to fallback agent..."
        if [ -f "multi_tool_agent/agent_fallback.py" ]; then
            mv multi_tool_agent/agent.py multi_tool_agent/agent_mcp.py
            mv multi_tool_agent/agent_fallback.py multi_tool_agent/agent.py
            echo "Switched to fallback agent without MCP tools"
        else
            echo "Warning: No fallback agent available"
        fi
    else
        echo "MCP imports successful, using MCP-enabled agent"
    fi
fi

# Start ADK web server
echo "Starting ADK web server..."
nohup adk web --host 0.0.0.0 --port 8000 > adk_web.log 2>&1 &

# Wait for server to start using Python script
python3 check_port.py 8000
exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo "ADK web server started successfully"
    cat adk_web.log
    exit 0
else
    echo "Failed to start ADK web server"
    cat adk_web.log
    exit 1
fi`);
      
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
            ADK_API_KEY: process.env.ADK_API_KEY,
            SMITHERY_API_KEY: process.env.SMITHERY_API_KEY
          }
        });
        
        console.log('📋 ADK web server startup output:');
        if (adkWebResult.stdout) console.log(adkWebResult.stdout);
        if (adkWebResult.stderr) console.log(adkWebResult.stderr);
        
        // Verify server is running using curl
        const isRunning = await sbx.commands.run('curl -s -o /dev/null -w "%{http_code}" http://localhost:8000 || echo "Failed"', { timeoutMs: 5000 });
        if (isRunning.stdout === "Failed") {
          throw new Error('ADK web server failed to start - could not connect to port 8000');
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
        
        // Set CORS headers on error response
        setCorsHeaders(req, res);
        
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
      
      // Set CORS headers on error response
      setCorsHeaders(req, res);
      
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
    
    // Set CORS headers on error response
    setCorsHeaders(req, res);
    
    return res.status(500).json(errorResponse);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  // Set CORS headers
  setCorsHeaders(req, res);
  
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Home route with API info
app.get('/', (req, res) => {
  // Set CORS headers
  setCorsHeaders(req, res);
  
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

// Start the server if not being imported
if (process.env.NODE_ENV !== 'vercel') {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`🔓 CORS is enabled with priority for http://localhost:8080`);
    console.log(`🛡️  Full CORS headers are being set on all responses`);
    console.log(`🔌 MCP Agent support is enabled with filesystem, github, and time tools`);
    console.log(`👉 Ready to accept requests from http://localhost:8080`);
  });
} 