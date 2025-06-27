import os
import asyncio
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
# Removed MCP imports for now
from langfuse import Langfuse

# Load environment variables from .env file
load_dotenv()

# Set default SMITHERY_API_KEY if not provided
if 'SMITHERY_API_KEY' not in os.environ:
    os.environ['SMITHERY_API_KEY'] = 'demo-key'

# Check for Google AI API key
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    print("Example: export GOOGLE_API_KEY=your_api_key_here")
    exit(1)

print("✓ Environment variables loaded from .env file")

# Initialize Langfuse with environment variables (optional)
langfuse = None
if os.environ.get('LANGFUSE_PUBLIC_KEY') and os.environ.get('LANGFUSE_SECRET_KEY'):
    langfuse = Langfuse(
        public_key=os.environ.get('LANGFUSE_PUBLIC_KEY'),
        secret_key=os.environ.get('LANGFUSE_SECRET_KEY'),
        host=os.environ.get('LANGFUSE_HOST', 'https://cloud.langfuse.com')
    )

# Function to track conversations
def track_conversation(conversation_id, user_id, metadata):
    if langfuse:
        langfuse.track(conversation_id, user_id, metadata)

# Simple time tool function
def get_current_time():
    """Get the current time"""
    import datetime
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# Create the LlmAgent with the required parameters
root_agent = LlmAgent(
    name="time_agent",
    model="gemini-2.0-flash",
    description="An LlmAgent that handles time-related queries using Google ADK's LlmAgent class.",
    instruction="You are a helpful assistant that can provide the current time when asked. Use the get_current_time tool to provide accurate time information.",
    tools=[get_current_time]
)

# Create session service and runner
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="time_agent")

# Entry point for execution
if __name__ == "__main__":
    async def test_agent():
        # Create a session first
        session = await session_service.create_session(
            app_name="time_agent",
            user_id="test_user",
            session_id="test_session"
        )
        
        # Test a simple message
        message = Content(role='user', parts=[Part(text='What time is it?')])
        results = []
        async for event in runner.run_async(
            user_id="test_user",
            session_id="test_session", 
            new_message=message
        ):
            results.append(event)
            
        print(f"Agent successfully ran! Number of events: {len(results)}")
        for i, result in enumerate(results):
            print(f"Event {i}: {result}")
    
    try:
        asyncio.run(test_agent())
    except Exception as e:
        print(f"Error running the agent: {e}")

# Exporting the analytics agent and tracking function
__all__ = ['root_agent', 'track_conversation']