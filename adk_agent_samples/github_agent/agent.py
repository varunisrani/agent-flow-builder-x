"""GitHub MCP Agent"""
import asyncio, os
from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# Global state
_tools = None
_exit_stack = None
GITHUB_TOKEN = os.getenv('GITHUB_PERSONAL_ACCESS_TOKEN')

async def get_tools_async():
    """Gets tools from the GitHub MCP Server."""
    tools, exit_stack = await MCPToolset.from_server(
        connection_params=StdioServerParameters(
            command='npx',
            args=["-y", "@modelcontextprotocol/server-github"],
            env={
                "GITHUB_PERSONAL_ACCESS_TOKEN": GITHUB_TOKEN,
                "NODE_OPTIONS": "--no-warnings --experimental-fetch",
                "SKIP_TOOLS": "create_pull_request_review"  # Explicitly skip problematic tool
            }
        )
    )
    # Filter out the problematic tool if it still exists
    return [t for t in tools if t.name != 'create_pull_request_review'], exit_stack

class GitHubAgent(LlmAgent):
    async def _run_async_impl(self, ctx):
        if not self.tools:
            global _exit_stack
            self.tools, _exit_stack = await get_tools_async()
        async for event in super()._run_async_impl(ctx):
            yield event

# Create the agent
root_agent = GitHubAgent(
    model='gemini-2.0-flash-exp',
    name='GitHubAssistant',
    description="GitHub operations assistant.",
    instruction="""GitHub assistant for repository operations.
    Available functions:
    - search_repositories(query="search term")
    - get_repository(owner="owner", repo="repo")
    - list_issues(owner="owner", repo="repo")
    - create_issue(owner="owner", repo="repo", title="", body="")
    - get_user(username="username")
    - list_pull_requests(owner="owner", repo="repo")
    - get_pull_request(owner="owner", repo="repo", pull_number=123)
    - merge_pull_request(owner="owner", repo="repo", pull_number=123)
    
    Note: Pull request review functionality is not available.""",  # Updated instructions
    tools=[]
)

async def main():
    """Run the agent."""
    runner = Runner(
        app_name='github_mcp_app',
        agent=root_agent,
        session_service=InMemorySessionService()
    )
    
    try:
        session = runner.session_service.create_session(
            state={}, app_name='github_mcp_app', user_id='github_user'
        )
        async for event in runner.run_async(
            session_id=session.id,
            user_id=session.user_id,
            new_message=types.Content(
                role='user',
                parts=[types.Part(text="Search for popular Python libraries")]
            )
        ):
            print(event)
    finally:
        if hasattr(root_agent, '_exit_stack'):
            await root_agent._exit_stack.aclose()

if __name__ == '__main__':
    asyncio.run(main())