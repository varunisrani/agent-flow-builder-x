import asyncio
import os
from dotenv import load_dotenv
from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# Load environment variables from .env file
load_dotenv('../.env')

# --- Step 1: Configure and Connect to GitHub MCP Server (Spotify-style) ---
async def get_tools_async():
    """Gets tools from the GitHub MCP Server using CLI argument for token."""
    print("Attempting to connect to GitHub MCP server...")
    github_token = os.getenv('GITHUB_PERSONAL_ACCESS_TOKEN')
    if not github_token or not github_token.startswith("ghp_"):
        raise ValueError("Invalid GitHub token. Must start with 'ghp_'")
    
    tools, exit_stack = await MCPToolset.from_server(
        connection_params=StdioServerParameters(
            command='npx',
            args=[
                "-y",
                "--node-options=--experimental-fetch",
                "@modelcontextprotocol/server-github",
                "--token",
                github_token
            ]
            # No 'env' parameter!
        )
    )
    print(f"MCP Toolset created successfully with {len(tools)} tools:")
    for i, tool in enumerate(tools):
        print(f"  Tool {i+1}: {tool.name}")
        if hasattr(tool, 'description'):
            print(f"    Description: {tool.description}")
    return tools, exit_stack

# --- Step 2: Create the Agent ---
_tools = None
_exit_stack = None

async def get_github_tools():
    """Fetches and caches GitHub tools."""
    global _tools, _exit_stack
    if _tools is None:
        _tools, _exit_stack = await get_tools_async()
    return _tools

# Try to initialize tools at import (eager loading)
try:
    github_tools = asyncio.run(get_github_tools())
    print(f"Initialized {len(github_tools)} GitHub MCP tools for the agent.")
except Exception as e:
    print(f"Warning: Failed to initialize GitHub tools: {e}")
    print("Agent will attempt to initialize tools when first used.")
    github_tools = []

root_agent = LlmAgent(
    model='gemini-2.0-flash',
    name='GitHubAssistant',
    description="GitHub repository management and operations assistant.",
    instruction="""
    You are a GitHub assistant for repository management and operations.
    Available GitHub functions:
    - search_repositories(query="search term")
    - get_repository(owner="owner", repo="repo")
    - list_issues(owner="owner", repo="repo")
    - create_issue(owner="owner", repo="repo", title="title", body="body")
    - get_user(username="username")
    - list_pull_requests(owner="owner", repo="repo")
    - get_pull_request(owner="owner", repo="repo", pull_number=123)
    - merge_pull_request(owner="owner", repo="repo", pull_number=123)
    
    Format responses clearly with repository names, issue numbers, and relevant details.
    """,
    tools=github_tools
)

# --- Step 3: Main Execution Logic (for direct script execution) ---
async def async_main():
    """Run the agent directly for testing purposes."""
    session_service = InMemorySessionService()
    artifacts_service = InMemoryArtifactService()

    session = session_service.create_session(
        state={}, app_name='github_mcp_app', user_id='github_user'
    )

    query = "Search for popular Python libraries and show their details"
    print(f"User Query: '{query}'")
    content = types.Content(role='user', parts=[types.Part(text=query)])

    tools = await get_github_tools()
    session_agent = LlmAgent(
        model='gemini-2.0-flash',
        name='GitHubAssistant',
        description="GitHub repository management and operations assistant.",
        instruction="""
        You are a GitHub assistant for repository management and operations.
        Available GitHub functions:
        - search_repositories(query="search term")
        - get_repository(owner="owner", repo="repo")
        - list_issues(owner="owner", repo="repo")
        - create_issue(owner="owner", repo="repo", title="title", body="body")
        - get_user(username="username")
        - list_pull_requests(owner="owner", repo="repo")
        - get_pull_request(owner="owner", repo="repo", pull_number=123)
        - merge_pull_request(owner="owner", repo="repo", pull_number=123)
        
        Format responses clearly with repository names, issue numbers, and relevant details.
        """,
        tools=tools
    )

    runner = Runner(
        app_name='github_mcp_app',
        agent=session_agent,
        artifact_service=artifacts_service,
        session_service=session_service,
    )

    print("Running agent...")
    events_async = runner.run_async(
        session_id=session.id, user_id=session.user_id, new_message=content
    )

    async for event in events_async:
        print(f"Event received: {event}")

    if _exit_stack:
        print("Closing MCP server connection...")
        await _exit_stack.aclose()
        print("Cleanup complete.")

if __name__ == '__main__':
    try:
        asyncio.run(async_main())
    except Exception as e:
        print(f"An error occurred: {e}")
        if _exit_stack:
            asyncio.run(_exit_stack.aclose())
            print("Forced cleanup complete after error.")
