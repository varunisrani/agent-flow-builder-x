"""Time MCP Agent"""
import os
import asyncio
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("time_agent")

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# Configure Google AI client
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

# Initialize Google AI client
genai_client = genai.Client(api_key=GOOGLE_API_KEY)

# Global state
_tools = None
_exit_stack = None

async def get_tools_async():
    """Gets tools from the Time MCP Server."""
    tools, exit_stack = await MCPToolset.from_server(
        connection_params=StdioServerParameters(
            command='uvx',
            args=["mcp-server-time", "--local-timezone", "Asia/Kolkata"],
            env={
                "NODE_OPTIONS": "--no-warnings --experimental-fetch"
            }
        )
    )
    return tools, exit_stack

class TimeAgent(LlmAgent):
    async def _run_async_impl(self, ctx):
        if not self.tools:
            global _exit_stack
            self.tools, _exit_stack = await get_tools_async()
        async for event in super()._run_async_impl(ctx):
            yield event

# Create the agent
root_agent = TimeAgent(
    model='gemini-2.0-flash',
    name='TimeAssistant',
    description="Time operations assistant.",
    instruction="""You are a helpful assistant that can perform time-related operations.

Available functions:
- get_current_time(timezone="IANA timezone name") - Get current time in a specific timezone
- convert_time(source_timezone="source IANA timezone", time="HH:MM", target_timezone="target IANA timezone") - Convert time between timezones

IMPORTANT RULES:
1. Always use valid IANA timezone names (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo')
2. Use 24-hour format for time (HH:MM)
3. Handle timezone conversions carefully
4. Provide clear explanations for time calculations""",
    tools=[]
)

async def main():
    """Run the agent."""
    runner = Runner(
        app_name='time_mcp_app',
        agent=root_agent,
        session_service=InMemorySessionService(),
        inputs={
            'client': genai_client  # Pass the initialized client
        }
    )
    
    try:
        session = runner.session_service.create_session(
            state={}, app_name='time_mcp_app', user_id='time_user'
        )
        async for event in runner.run_async(
            session_id=session.id,
            user_id=session.user_id,
            new_message=types.Content(
                role='user',
                parts=[types.Part(text="What is the current time in Tokyo?")]
            )
        ):
            print(event)
    finally:
        if hasattr(root_agent, '_exit_stack'):
            await root_agent._exit_stack.aclose()

if __name__ == '__main__':
    asyncio.run(main()) 