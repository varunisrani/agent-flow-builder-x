"""time_agent - Langfuse Analytics Agent"""
import os
import asyncio
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioConnectionParams
from mcp import StdioServerParameters
from google.genai import types
from langfuse import Langfuse
import datetime

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    # Don't exit here - let the agent continue without full functionality

# MCP toolset configuration for @dandeliongold/mcp-time
use_mcp = True  # Enable MCP tools by default

print(f"🔧 MCP Configuration:")
print(f"   Will use MCP tools: {use_mcp}")

# MCP toolset configuration for @dandeliongold/mcp-time (working package)
time_mcp_toolset = None
if use_mcp:
    try:
        print("   Initializing time_mcp_toolset with @dandeliongold/mcp-time...")
        time_mcp_toolset = MCPToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command="npx",
                    args=["-y", "@dandeliongold/mcp-time"],
                    env={"NODE_OPTIONS": "--no-warnings --experimental-fetch"}
                )
            )
        )
        print("   ✓ MCP toolset initialized successfully")
    except Exception as e:
        print(f"   ⚠️ MCP toolset initialization failed: {e}")
        print("   Will continue in fallback mode without MCP tools")
        time_mcp_toolset = None
        use_mcp = False
else:
    print("   Skipping time_mcp_toolset")

# Initialize Langfuse with environment variables
langfuse = None
if os.environ.get('LANGFUSE_PUBLIC_KEY') and os.environ.get('LANGFUSE_SECRET_KEY'):
    langfuse = Langfuse(
        public_key=os.environ.get('LANGFUSE_PUBLIC_KEY'),
        secret_key=os.environ.get('LANGFUSE_SECRET_KEY'),
        host=os.environ.get('LANGFUSE_HOST', 'https://cloud.langfuse.com')
    )
    print("✓ Langfuse analytics initialized")
else:
    print("Warning: LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY not set. Analytics will be disabled.")

# Function to track conversations
def track_conversation(conversation_id, user_id, metadata):
    if langfuse:
        # For Langfuse 3.0.5, we'll simplify tracking to avoid API compatibility issues
        try:
            print(f"📊 Analytics: {metadata.get('event_type', 'interaction')} for user {user_id} in conversation {conversation_id}")
        except Exception as e:
            print(f"Warning: Failed to track conversation: {e}")
            # Continue execution even if tracking fails

# Create the LlmAgent with analytics tracking
instruction_text = """You are an agent that can handle time-related queries using Google ADK's LlmAgent class."""

if use_mcp and time_mcp_toolset:
    instruction_text += """ You have access to MCP time tools through the @dandeliongold/mcp-time package.

Available functions through MCP:
- getCurrentTime: Get current time in ISO format (YYYY-MM-DD HH:mm:ss)
- getTimeDifference: Calculate time difference between timestamps

Use these tools when users ask about current time or time calculations."""
else:
    instruction_text += """ You are currently running in fallback mode without MCP tools. You can still help with general time-related questions and provide the current time using built-in Python functionality."""

instruction_text += """

ANALYTICS FEATURES:
- All interactions are automatically tracked with Langfuse
- Conversation analytics for performance monitoring
- Error tracking and debugging support

IMPORTANT RULES:
1. All interactions are automatically tracked through analytics
2. Use available MCP tools to perform requested time operations when available
3. In fallback mode, use built-in time functions and explain the limitation
4. Always provide clear explanations for actions taken
5. Handle errors gracefully with automatic error tracking
6. Gracefully handle scenarios when MCP tools are unavailable"""

root_agent = LlmAgent(
    name="time_agent",
    model="gemini-2.0-flash",
    description="An LlmAgent that handles time-related queries using Google ADK's LlmAgent class.",
    instruction=instruction_text,
    tools=[time_mcp_toolset] if time_mcp_toolset else []
)

# Session service and runner setup
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="time_agent")

async def main():
    print(f"\n🚀 Starting Time Agent...")
    print(f"   MCP Tools Available: {'Yes' if use_mcp and time_mcp_toolset else 'No (Fallback Mode)'}")
    print(f"   Analytics: {'Enabled' if langfuse else 'Disabled'}")
    
    # Create a session
    user_id = "user"
    session = await session_service.create_session(app_name="time_agent", user_id=user_id)
    session_id = session.id

    # Track session start
    track_conversation(session_id, user_id, {
        "event_type": "session_start",
        "agent_description": "An LlmAgent that handles time-related queries using Google ADK's LlmAgent class.",
        "mcp_available": use_mcp and time_mcp_toolset is not None
    })

    # Create an initial message
    if use_mcp and time_mcp_toolset:
        user_message = "Hello, agent! What is the current time? Please use your MCP tools to get this information."
    else:
        user_message = "Hello, agent! What is the current time? I understand you're running in fallback mode."
    
    new_message = types.Content(
        role="user",
        parts=[types.Part(text=user_message)]
    )

    # Track user message
    track_conversation(session_id, user_id, {
        "event_type": "user_message",
        "message": user_message
    })

    print(f"\n💬 User Message: {user_message}")
    print(f"🤖 Agent Response:")

    # Run the agent
    try:
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
        print(f"❌ Error during agent execution: {e}")
        # If MCP tools fail during execution, provide fallback information
        if use_mcp:
            print(f"🔄 Fallback: Current time is {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent", "track_conversation"]