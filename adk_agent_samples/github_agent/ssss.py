"""GitHub MCP Agent Example"""
import asyncio
import os
from dotenv import load_dotenv
from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# Load environment variables and initialize globals
load_dotenv('../.env')
_tools = None
_exit_stack = None

def validate_token():
    """Validates and returns GitHub token."""
    token = os.getenv('GITHUB_PERSONAL_ACCESS_TOKEN')
    if not token or not token.startswith("ghp_"):
        raise ValueError("Invalid GitHub token. Must start with 'ghp_'")
    return token

async def get_tools_async():
    """Gets tools from the GitHub MCP Server."""
    env_vars = {
        "GITHUB_PERSONAL_ACCESS_TOKEN": GITHUB_TOKEN,
        "GOOGLE_API_KEY": os.getenv('GOOGLE_API_KEY', ''),
        "NODE_OPTIONS": "--no-warnings --experimental-fetch",
        "SKIP_TOOLS": "create_pull_request_review"
    }
    
    tools, exit_stack = await MCPToolset.from_server(
        connection_params=StdioServerParameters(
            command='npx',
            args=["-y", "--node-options=--experimental-fetch", 
                  "@modelcontextprotocol/server-github"],
            env=env_vars
        )
    )
    return [t for t in tools if t.name != 'create_pull_request_review'], exit_stack

class LazyLoadingLlmAgent(LlmAgent):
    """LlmAgent that lazy-loads tools when first needed."""
    
    async def _run_async_impl(self, ctx):
        await self._ensure_tools_loaded()
        async for event in super()._run_async_impl(ctx):
            yield event
    
    async def _ensure_tools_loaded(self):
        global _tools, _exit_stack
        if not self.tools:
            _tools, _exit_stack = await get_tools_async()
            self.tools = _tools
        return True

# Initialize GitHub token
try:
    GITHUB_TOKEN = validate_token()
except Exception as e:
    print(f"Error setting up GitHub token: {e}")
    GITHUB_TOKEN = None

# Create the agent with lazy-loaded tools
root_agent = LazyLoadingLlmAgent(
    model='gemini-2.0-flash-exp',
    name='GitHubAssistant',
    description="GitHub repository management and operations assistant.",
    instruction="""You are a GitHub assistant for repository management and operations.
    Available GitHub functions:
    - search_repositories(query="search term")
    - get_repository(owner="owner", repo="repo")
    - list_issues(owner="owner", repo="repo")
    - create_issue(owner="owner", repo="repo", title="title", body="body")
    - get_user(username="username")
    - list_pull_requests(owner="owner", repo="repo")
    - get_pull_request(owner="owner", repo="repo", pull_number=123)
    - merge_pull_request(owner="owner", repo="repo", pull_number=123)
    
    Format responses clearly with repository names, issue numbers, and relevant details.""",
    tools=[]  # Will be populated by lazy loading
)

async def initialize_web_agent_async():
    """Initialize the GitHub agent for web mode."""
    global GITHUB_TOKEN, _tools, _exit_stack, root_agent
    if not GITHUB_TOKEN:
        GITHUB_TOKEN = validate_token()
    _tools, _exit_stack = await get_tools_async()
    root_agent.tools = _tools
    return True

def initialize_web_agent():
    """Prepare GitHub agent for web mode."""
    return True  # Defer initialization until first use

async def cleanup_web_resources():
    """Clean up resources."""
    if _exit_stack:
        await _exit_stack.aclose()

async def async_main():
    """Run the agent directly."""
    session = InMemorySessionService().create_session(
        state={}, app_name='github_mcp_app', user_id='github_user'
    )
    
    runner = Runner(
        app_name='github_mcp_app',
        agent=root_agent,
        artifact_service=InMemoryArtifactService(),
        session_service=InMemorySessionService(),
    )

    try:
        await root_agent._ensure_tools_loaded()
        query = "Search for popular Python libraries and show their details"
        content = types.Content(role='user', parts=[types.Part(text=query)])
        
        async for event in runner.run_async(
            session_id=session.id,
            user_id=session.user_id,
            new_message=content
        ):
            print(event)
    finally:
        if _exit_stack:
            await _exit_stack.aclose()

if __name__ == '__main__':
    try:
        asyncio.run(async_main())
    except KeyboardInterrupt:
        print("\nAgent stopped by user")
    except Exception as e:
        print(f"An error occurred: {e}")