"""time_agent - Langfuse Analytics Agent"""
import os
import asyncio
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.genai import types
from langfuse import Langfuse

# Load environment variables
load_dotenv()

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    exit(1)

# Set the Smithery API key from environment variable
smithery_api_key = os.getenv("SMITHERY_API_KEY")
if not smithery_api_key:
    raise ValueError("SMITHERY_API_KEY environment variable is not set")

# MCP toolset configuration for @yokingma/time-mcp
time_mcp_toolset = MCPToolset(
    connection_params=StdioServerParameters(
        command="npx",
        args=["-y","@smithery/cli@latest","run","--key",smithery_api_key],
        env={"NODE_OPTIONS":"--no-warnings --experimental-fetch","SMITHERY_API_KEY":smithery_api_key}
    )
)

# MCP toolset configuration for @yokingma/time-mcp
time_mcp_toolset = MCPToolset(
    connection_params=StdioServerParameters(
        command="npx",
        args=["-y","@smithery/cli@latest","run","--key",smithery_api_key],
        env={"NODE_OPTIONS":"--no-warnings --experimental-fetch","SMITHERY_API_KEY":smithery_api_key}
    )
)

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
        langfuse.track_event(
            event_name="conversation_interaction",
            properties={
                "conversation_id": conversation_id,
                "user_id": user_id,
                "project": "langfuse",
                "agent_name": "time_agent",
                **metadata
            }
        )

# Create the LlmAgent with analytics tracking
root_agent = LlmAgent(
    name="time_agent",
    model="gemini-2.0-flash",
    description="An LlmAgent that handles time-related queries using Google ADK's LlmAgent class.",
    instruction="""You are an agent that can use Smithery MCP to perform operations. Use the Smithery MCP tool to interact with external systems and APIs.

Available functions through MCP:
- @yokingma/time-mcp tools for MCP client for @yokingma/time-mcp operations
- @yokingma/time-mcp tools for MCP tool for @yokingma/time-mcp operations

ANALYTICS FEATURES:
- All interactions are automatically tracked with Langfuse
- Conversation analytics for performance monitoring
- Error tracking and debugging support

IMPORTANT RULES:
1. All interactions are automatically tracked through analytics
2. Use available MCP tools to perform requested operations
3. Always provide clear explanations for actions taken
4. Handle errors gracefully with automatic error tracking""",
    tools=[time_mcp_toolset, time_mcp_toolset]
)

# Session service and runner setup
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="time_agent")

async def main():
    # Create a session
    user_id = "user"
    session = await session_service.create_session(app_name="time_agent", user_id=user_id)
    session_id = session.id

    # Track session start
    track_conversation(session_id, user_id, {
        "event_type": "session_start",
        "agent_description": "An LlmAgent that handles time-related queries using Google ADK's LlmAgent class."
    })

    # Create an initial message
    new_message = types.Content(
        role="user",
        parts=[types.Part(text="Hello, agent!")]
    )

    # Track user message
    track_conversation(session_id, user_id, {
        "event_type": "user_message",
        "message": "Hello, agent!"
    })

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

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent", "track_conversation"]