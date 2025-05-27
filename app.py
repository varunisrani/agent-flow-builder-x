import os
import asyncio
import logging
import subprocess
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google import generativeai as genai
from google.genai import types

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("github_agent")

# Add file handler
file_handler = logging.FileHandler('github_agent.log')
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'))
logger.addHandler(file_handler)

# Load environment variables
load_dotenv()

# Global variables
_tools = None
_exit_stack = None
GITHUB_TOKEN = os.getenv('GITHUB_PERSONAL_ACCESS_TOKEN')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

def validate_github_token():
    """Validates the GitHub token and returns True if valid."""
    import requests
    
    if not GITHUB_TOKEN or not GITHUB_TOKEN.startswith("ghp_"):
        logger.error("Invalid GitHub token format. Token should start with 'ghp_'")
        return False
        
    try:
        response = requests.get(
            'https://api.github.com/user',
            headers={'Authorization': f'token {GITHUB_TOKEN}'}
        )
        if response.status_code == 200:
            user_data = response.json()
            logger.info(f"GitHub token validated. Authenticated as: {user_data.get('login')}")
            return True
        else:
            logger.error(f"GitHub token validation failed: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Error validating GitHub token: {e}")
        return False

def setup_node_fetch():
    """Ensures node-fetch is installed globally."""
    try:
        subprocess.run(
            ["npm", "list", "-g", "node-fetch"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        logger.info("node-fetch is already installed")
    except subprocess.CalledProcessError:
        logger.info("Installing node-fetch globally...")
        try:
            subprocess.run(["npm", "install", "-g", "node-fetch"], check=True)
            logger.info("node-fetch installed successfully")
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to install node-fetch: {e}")

async def get_github_tools():
    """Gets tools from the GitHub MCP Server."""
    global _tools, _exit_stack
    
    if _tools is not None:
        return _tools
        
    logger.info("Connecting to GitHub MCP server...")
    
    # Set up environment variables
    npm_prefix = subprocess.check_output(["npm", "config", "get", "prefix"], text=True).strip()
    node_path = os.path.join(npm_prefix, "lib", "node_modules")
    
    env_vars = {
        "GITHUB_PERSONAL_ACCESS_TOKEN": GITHUB_TOKEN,
        "GOOGLE_API_KEY": GOOGLE_API_KEY,
        "NODE_OPTIONS": "--no-warnings --experimental-fetch",
        "NODE_PATH": node_path,
        "DEBUG": "mcp:*"
    }
    
    tools, exit_stack = await MCPToolset.from_server(
        connection_params=StdioServerParameters(
            command='npx',
            args=[
                "-y",
                "--node-options=--experimental-fetch",
                "@modelcontextprotocol/server-github"
            ],
            env=env_vars
        )
    )
    
    _tools = tools
    _exit_stack = exit_stack
    
    logger.info(f"Connected to GitHub MCP server with {len(tools)} tools")
    for tool in tools:
        logger.info(f"Available tool: {tool.name}")
    
    return tools

class GitHubAgent(LlmAgent):
    """GitHub agent with lazy-loading tools capability."""
    
    async def _run_async_impl(self, ctx):
        """Ensures tools are loaded before running."""
        await self._ensure_tools_loaded()
        async for event in super()._run_async_impl(ctx):
            yield event
    
    async def _ensure_tools_loaded(self):
        """Loads tools if not already loaded."""
        if not self.tools:
            try:
                self.tools = await get_github_tools()
                logger.info("GitHub tools loaded successfully")
                return True
            except Exception as e:
                logger.error(f"Error loading GitHub tools: {e}")
                return False
        return True

# Create the root agent
root_agent = GitHubAgent(
    model='gemini-2.0-flash',
    name='github_assistant',
    instruction="""You are a GitHub operations assistant that helps users interact with GitHub repositories.

AVAILABLE OPERATIONS:
1. Repository Management
   - Create new repositories
   - List repositories
   - Get repository details
   - Search repositories

2. Issue Management
   - Create issues
   - List issues
   - Update issues
   - Close issues

3. Pull Request Operations
   - Create pull requests
   - List pull requests
   - Review pull requests
   - Merge pull requests

GUIDELINES:
1. Always verify repository owner and name before operations
2. Use clear, descriptive titles and messages
3. Follow GitHub naming conventions (lowercase, hyphens)
4. Present results in a clear, organized format
5. Handle errors gracefully with helpful messages""",
    tools=[]  # Tools will be loaded lazily
)

async def initialize_agent():
    """Initializes the GitHub agent with all necessary setup."""
    logger.info("Initializing GitHub agent...")
    
    # Validate GitHub token
    if not validate_github_token():
        raise ValueError("Invalid or missing GitHub token")
    
    # Configure Google Generative AI
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
    else:
        raise ValueError("Missing Google API key")
    
    # Ensure node-fetch is installed
    setup_node_fetch()
    
    # Initialize services
    session_service = InMemorySessionService()
    artifacts_service = InMemoryArtifactService()
    
    # Create session
    session = session_service.create_session(
        state={},
        app_name='github_agent',
        user_id='github_user'
    )
    
    # Create runner
    runner = Runner(
        app_name='github_agent',
        agent=root_agent,
        artifact_service=artifacts_service,
        session_service=session_service,
    )
    
    return runner, session

async def cleanup():
    """Cleans up resources."""
    global _exit_stack
    if _exit_stack:
        logger.info("Cleaning up MCP server connection...")
        await _exit_stack.aclose()
        logger.info("Cleanup complete")

async def main():
    """Main execution function."""
    try:
        runner, session = await initialize_agent()
        
        # Example query
        query = "List my GitHub repositories"
        content = types.Content(
            role='user',
            parts=[types.Part(text=query)]
        )
        
        # Run the agent
        async for event in runner.run_async(
            session_id=session.id,
            user_id=session.user_id,
            new_message=content
        ):
            print(f"Event: {event}")
            
    except Exception as e:
        logger.error(f"Error running GitHub agent: {e}")
        raise
    finally:
        await cleanup()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Agent stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise 