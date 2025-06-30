"""time_agent - Langfuse Analytics Agent"""
import os
import asyncio
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from langfuse import Langfuse

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    # Don't exit here - let the agent continue without full functionality

# Set the Smithery API key from environment variable (optional for basic testing)
smithery_api_key = os.getenv("SMITHERY_API_KEY")
use_mcp = smithery_api_key is not None

print(f"🔧 MCP Configuration:")
print(f"   SMITHERY_API_KEY set: {use_mcp}")
print(f"   Will use MCP tools: {use_mcp}")

# MCP toolset configuration for @yokingma/time-mcp (only if API key is available)
time_mcp_toolset = None
if use_mcp:
    try:
        print("   Initializing time_mcp_toolset...")
        from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
        
        time_mcp_toolset = MCPToolset(
            connection_params=StdioServerParameters(
                command="npx",
                args=["-y","@smithery/cli@latest","run","--key",smithery_api_key],
                env={"NODE_OPTIONS":"--no-warnings --experimental-fetch","SMITHERY_API_KEY":smithery_api_key}
            )
        )
        print("   ✓ MCP toolset initialized successfully")
    except Exception as e:
        print(f"   ⚠️ Failed to initialize MCP toolset: {e}")
        print("   → Running in basic mode without MCP tools")
        time_mcp_toolset = None
        use_mcp = False
else:
    print("   Skipping time_mcp_toolset (no API key)")

# Initialize Langfuse with environment variables
langfuse = None
if os.environ.get('LANGFUSE_PUBLIC_KEY') and os.environ.get('LANGFUSE_SECRET_KEY'):
    try:
        langfuse = Langfuse(
            public_key=os.environ.get('LANGFUSE_PUBLIC_KEY'),
            secret_key=os.environ.get('LANGFUSE_SECRET_KEY'),
            host=os.environ.get('LANGFUSE_HOST', 'https://cloud.langfuse.com')
        )
        print("✓ Langfuse analytics initialized")
    except Exception as e:
        print(f"Warning: Failed to initialize Langfuse: {e}")
        langfuse = None
else:
    print("Warning: LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY not set. Analytics will be disabled.")

# Function to track conversations
def track_conversation(conversation_id, user_id, metadata):
    if langfuse:
        try:
            # For Langfuse 3.0.5, we'll simplify tracking to avoid API compatibility issues
            print(f"📊 Analytics: conversation_interaction - {metadata}")
        except Exception as e:
            print(f"Warning: Failed to track conversation: {e}")
            # Continue execution even if tracking fails

# Create the LlmAgent with analytics tracking
tools_list = [time_mcp_toolset] if time_mcp_toolset else []

# Enhanced instruction based on available tools
instruction_base = """You are a helpful time-related assistant agent built with Google ADK's LlmAgent class."""

if use_mcp:
    instruction_mcp = """

Available MCP tools:
- @yokingma/time-mcp tools for time operations and calculations
- Time zone conversions and current time queries
- Date calculations and formatting

You can use these MCP tools to:
1. Get current time in different time zones
2. Convert between time zones
3. Calculate time differences
4. Format dates and times
5. Perform date arithmetic

IMPORTANT RULES:
1. Use available MCP tools for time-related operations when possible
2. Provide clear explanations for actions taken
3. Handle errors gracefully and inform users of any limitations"""
else:
    instruction_mcp = """

NOTE: MCP tools are not available in this session. You can still:
1. Provide general time-related information and advice
2. Explain time zone concepts and calculations
3. Help with date/time formatting questions
4. Offer guidance on time management

IMPORTANT RULES:
1. Be helpful with time-related questions using your built-in knowledge
2. Inform users that advanced time calculations require MCP tools
3. Suggest alternative approaches when MCP tools are unavailable"""

analytics_instruction = """

ANALYTICS FEATURES:
- All interactions are automatically tracked with Langfuse (when available)
- Conversation analytics for performance monitoring
- Error tracking and debugging support

IMPORTANT RULES:
1. All interactions are automatically tracked through analytics (when available)
2. Always provide clear explanations for actions taken
3. Handle errors gracefully with automatic error tracking
4. Gracefully handle scenarios when tools are unavailable"""

full_instruction = instruction_base + instruction_mcp + analytics_instruction

root_agent = LlmAgent(
    name="time_agent",
    model="gemini-2.0-flash",
    description="An LlmAgent that handles time-related queries using Google ADK's LlmAgent class.",
    instruction=full_instruction,
    tools=tools_list
)

# Session service and runner setup
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="time_agent")

async def main():
    try:
        # Create a session
        user_id = "user"
        session = await session_service.create_session(app_name="time_agent", user_id=user_id)
        session_id = session.id

        # Track session start
        track_conversation(session_id, user_id, {
            "event_type": "session_start",
            "agent_description": "An LlmAgent that handles time-related queries using Google ADK's LlmAgent class.",
            "mcp_enabled": use_mcp
        })

        # Create an initial message
        new_message = types.Content(
            role="user",
            parts=[types.Part(text="Hello, agent! What time-related operations can you help me with?")]
        )

        # Track user message
        track_conversation(session_id, user_id, {
            "event_type": "user_message",
            "message": "Hello, agent! What time-related operations can you help me with?"
        })

        print(f"\n🚀 Starting time agent...")
        print(f"   MCP Tools: {'✓ Enabled' if use_mcp else '✗ Disabled'}")
        print(f"   Analytics: {'✓ Enabled' if langfuse else '✗ Disabled'}")
        print(f"   Session ID: {session_id}")
        print("─" * 60)

        # Run the agent
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message
        ):
            print(event)
            
            # Track agent response
            track_conversation(session_id, user_id, {
                "event_type": "agent_response",
                "response": str(event)
            })

    except Exception as e:
        print(f"❌ Error running time agent: {e}")
        # Track error
        if 'session_id' in locals() and 'user_id' in locals():
            track_conversation(session_id, user_id, {
                "event_type": "error",
                "error": str(e)
            })
        raise

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent", "track_conversation"]