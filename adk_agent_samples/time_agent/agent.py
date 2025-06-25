"""Time MCP Agent"""
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
import mcp
from mcp.client.streamable_http import streamablehttp_client
from langfuse import Langfuse

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

    # Initialize Langfuse
    langfuse_secret_key = os.getenv('LANGFUSE_SECRET_KEY')
    langfuse_public_key = os.getenv('LANGFUSE_PUBLIC_KEY')
    langfuse_host = os.getenv('LANGFUSE_HOST', 'https://cloud.langfuse.com')
    
    if langfuse_secret_key and langfuse_public_key:
        langfuse = Langfuse(
            secret_key=langfuse_secret_key,
            public_key=langfuse_public_key,
            host=langfuse_host
        )
        logger.info("Langfuse initialized successfully")
    else:
        logger.warning("Langfuse credentials not found in environment variables. Please set LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY")
        langfuse = None

    # Initialize Google AI client
    genai_client = genai.Client(api_key=GOOGLE_API_KEY)

    # MCP Time Server Configuration
    # config = {
    #     "local_timezone": "Asia/Kolkata"  # Set your desired local timezone
    # }
    # config_b64 = base64.b64encode(json.dumps(config).encode()).decode()
    smithery_api_key = os.getenv('SMITHERY_API_KEY')
    if not smithery_api_key:
        raise ValueError("SMITHERY_API_KEY environment variable is not set")

    # Use local MCP server via npx Smithery CLI
    return LlmAgent(
        model='gemini-2.0-flash',
        name='TimeAssistant',
        description="Time operations assistant.",
        instruction="""You are a helpful assistant that can perform time-related operations.

Available functions:
- get_current_time(timezone=\"IANA timezone name\") - Get current time in a specific timezone
- convert_time(source_timezone=\"source IANA timezone\", time=\"HH:MM\", target_timezone=\"target IANA timezone\") - Convert time between timezones

IMPORTANT RULES:
1. Always use valid IANA timezone names (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo')
2. Use 24-hour format for time (HH:MM)
3. Handle timezone conversions carefully
4. Provide clear explanations for time calculations""",
        tools=[
            MCPToolset(
                connection_params=StdioServerParameters(
                    command="npx",
                    args=[
                        "-y",
                        "@smithery/cli@latest",
                        "run",
                        "@yokingma/time-mcp",
                        "--key",
                        smithery_api_key
                    ]
                )
            )
        ]
    )

# Create the root agent instance
root_agent = create_root_agent()

async def main():
    """Run the agent."""
    runner = Runner(
        app_name='time_mcp_app',
        agent=root_agent,
        session_service=InMemorySessionService(),
        inputs={
            'client': genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))  # Create a new client instance
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