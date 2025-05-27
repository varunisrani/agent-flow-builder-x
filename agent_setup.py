import os
import logging
import asyncio
import json
import base64
import nest_asyncio
from google.genai import types

# Additional imports for direct MCP SDK usage
import mcp
from mcp.client.streamable_http import streamablehttp_client

# Apply nest_asyncio to allow nested event loops
nest_asyncio.apply()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Set environment variables
SMITHERY_API_KEY = "040afa77-557a-4a7b-9169-3f1f2b9d685f"
MCP_SERVER_BASE_URL = "https://server.smithery.ai/@yokingma/time-mcp/mcp"
os.environ["GOOGLE_API_KEY"] = "AIzaSyDKYSA-rs_GE5mCqA9b1yw8NFWH9fSn-Vc"  # Replace with your actual API key
os.environ["GOOGLE_ADK_API_KEY"] = os.environ["GOOGLE_API_KEY"]

# Validate API keys
def validate_api_keys():
    """Validate that API keys are properly set"""
    google_api_key = os.environ.get("GOOGLE_API_KEY", "")
    
    if not google_api_key:
        logger.error("GOOGLE_API_KEY is not set")
        return False
    
    if "YOUR" in google_api_key.upper() or google_api_key.startswith("AI") and len(google_api_key) < 40:
        logger.warning("GOOGLE_API_KEY appears to be invalid or a placeholder")
        logger.warning("Please replace with a valid Google Gemini API key")
        return False
        
    if not SMITHERY_API_KEY or "YOUR" in SMITHERY_API_KEY.upper():
        logger.warning("SMITHERY_API_KEY appears to be invalid or a placeholder")
        return False
        
    return True

# Validate API keys early
valid_keys = validate_api_keys()
if not valid_keys:
    logger.warning("API key validation failed. The application may not work correctly.")

# Import ADK modules
try:
    from google.adk.agents import LlmAgent
    from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, SseServerParams
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
except ImportError as e:
    logger.error(f"Missing required package: {e}")
    logger.info("Please install required packages using: pip install google-adk")
    raise

# Create URL with API key
MCP_SERVER_URL = f"{MCP_SERVER_BASE_URL}?api_key={SMITHERY_API_KEY}"

# Initialize MCP Toolset
try:
    # Use direct URL instead of constructing it with config
    mcp_server_url_with_params = MCP_SERVER_URL
    
    mcp_tools = MCPToolset(
        connection_params=SseServerParams(
            url=mcp_server_url_with_params,
        )
    )
    logger.info(f"MCPToolset initialized with URL: {mcp_server_url_with_params}")
except Exception as e:
    logger.error(f"Error initializing MCPToolset: {e}")
    raise

# Alternative way to connect using direct MCP SDK (for reference)
async def list_mcp_tools():
    """List available MCP tools using direct SDK access"""
    try:
        logger.info("Attempting to connect directly using MCP SDK...")
        async with streamablehttp_client(MCP_SERVER_URL) as (read_stream, write_stream, _):
            async with mcp.ClientSession(read_stream, write_stream) as session:
                # Initialize the connection
                await session.initialize()
                # List available tools
                tools_result = await session.list_tools()
                available_tools = [t.name for t in tools_result.tools]
                logger.info(f"Available MCP tools: {', '.join(available_tools)}")
                return available_tools
    except Exception as e:
        logger.error(f"Error listing MCP tools directly: {e}")
        return []

# Create the agent
try:
    agent = LlmAgent(
        model="gemini-2.0-flash",
        name="time_aware_agent",
        instruction="""You are a time-aware agent that helps users with time-related queries.
        Use the provided tools to get accurate time information.
        Be concise and direct in your responses.""",
        tools=[mcp_tools]
    )
    logger.info("LlmAgent initialized.")
except Exception as e:
    logger.error(f"Error initializing LlmAgent: {e}")
    raise

# Initialize session service and constants
session_service = InMemorySessionService()
APP_NAME = "time_agent_app"
USER_ID = "user_1"
SESSION_ID = "session_001"

# Create runner with session service
runner = Runner(
    agent=agent,
    app_name=APP_NAME,
    session_service=session_service
)
logger.info("Runner initialized.")

async def create_session():
    """Create a new session asynchronously"""
    try:
        session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=SESSION_ID
        )
        logger.info(f"Session created: App='{APP_NAME}', User='{USER_ID}', Session='{SESSION_ID}'")
        
        # Optionally list available tools using direct MCP SDK
        # await list_mcp_tools()
        
        return session
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise

async def process_user_input(user_input: str, session):
    """Process a single user input and return the agent's response"""
    try:
        # Create message content
        user_message = types.Content(
            role="user",
            parts=[types.Part(text=user_input)]
        )

        # Process message and get response with user_id and session_id
        response_parts = []
        try:
            async for response in runner.run_async(
                new_message=user_message,
                user_id=USER_ID,
                session_id=SESSION_ID
            ):
                if response.is_final_response():
                    if response.content and response.content.parts:
                        response_parts.extend([part.text for part in response.content.parts])
                    break  # Exit the loop once the final response is received
        except* Exception as eg:  # Python 3.11+ exception group handling
            logger.error(f"Exception group caught: {eg}")
            # Extract the first exception from the group
            if hasattr(eg, 'exceptions') and eg.exceptions:
                first_exception = eg.exceptions[0]
                return f"Error: {type(first_exception).__name__}: {str(first_exception)}"
            return f"An exception group occurred: {str(eg)}"

        return "\n".join(response_parts) if response_parts else "No response from agent"

    except Exception as e:
        logger.error(f"Error processing input: {e}")

        # Enhanced logging for ExceptionGroup (like asyncio.TaskGroupError)
        if hasattr(e, 'exceptions') and isinstance(e.exceptions, (list, tuple)) and e.exceptions:
            logger.error("--- Details of Sub-exceptions ---")
            for i, sub_ex in enumerate(e.exceptions):
                logger.error(f"  Sub-exception [{i+1}/{len(e.exceptions)}]: Type: {type(sub_ex).__name__}, Message: {sub_ex}")
            logger.error("--- End of Sub-exceptions ---")
        elif e.__cause__: # Check for a direct cause if not an exception group
            logger.error(f"  Underlying cause: Type: {type(e.__cause__).__name__}, Message: {e.__cause__}")
        
        # Updated return statement with more guidance
        return f"Error: {str(e)}. Please check your API keys and network connection."

async def main():
    try:
        # Create session first
        session = await create_session()
        print("\nWelcome to the Time-Aware Agent! Type 'exit' to quit.\n")

        while True:
            user_input = input("\nYou: ").strip()

            if user_input.lower() in ['exit', 'quit']:
                print("\nGoodbye!")
                break

            if not user_input:
                continue

            print("\nAgent: ", end='', flush=True)  # Add flush to ensure print happens before await
            
            try:
                response = await process_user_input(user_input, session)
                print(response)
            except* Exception as eg:  # Handle exception groups
                logger.error(f"Exception group encountered: {eg}")
                # Find API key related exceptions
                for ex in eg.exceptions if hasattr(eg, 'exceptions') else [eg]:
                    if "API key" in str(ex) or "apiKey" in str(ex) or "authentication" in str(ex).lower():
                        print(f"API key error: {ex}. Please check that your Google API key is valid.")
                        break
                else:
                    print(f"An error occurred: {eg}")

    except Exception as e:
        logger.error(f"Error in main loop: {e}")
        if "API key" in str(e) or "apiKey" in str(e) or "authentication" in str(e).lower():
            print(f"API key error: {e}. Please check that your Google API key is valid.")
        else:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProgram terminated by user.")
    except Exception as e:
        logger.error(f"Error running main: {e}")
        print(f"An error occurred: {e}")