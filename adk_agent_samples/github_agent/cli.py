"""Doc_agent MCP Agent"""
import os
import asyncio
import logging
import json
import base64
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
logger = logging.getLogger(__name__)

def create_root_agent():
    """Create and return the root agent instance."""
    # Load environment variables from both locations
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

    # Configure Google AI client
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY environment variable is not set")

    # Initialize Google AI client
    genai_client = genai.Client(api_key=GOOGLE_API_KEY)

    # Use MCP server via Smithery CLI
    return LlmAgent(
        model='gemini-2.0-flash',
        name='doc_agent',
        description="An LlmAgent specialized in answering document-related queries using MCP integration.",
        instruction="""You are an agent that can use Smithery MCP to perform operations. Use the Smithery MCP tool to interact with external systems and APIs.""",
        tools=[
            MCPToolset(
                connection_params=StdioServerParameters(
                    command="npx",
                    args=[
                        "-y",
                        "@modelcontextprotocol/server-github"
                    ],
                    env={
                        "NODE_OPTIONS": "--no-warnings --experimental-fetch"
                    }
                ),
                # Filter to specific MCP tools
                tool_filter=['smithery']
            )
        ]
    )

# Create the root agent instance
root_agent = create_root_agent()

async def main():
    """Run the agent."""
    runner = Runner(
        app_name='doc_agent_app',
        agent=root_agent,
        session_service=InMemorySessionService(),
        inputs={
            'client': genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))  # Create a new client instance
        }
    )
    
    try:
        session = runner.session_service.create_session(
            state={}, app_name='doc_agent_app', user_id='doc_agent_user'
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