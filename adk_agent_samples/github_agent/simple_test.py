"""Simple ADK Agent Test - Without MCP Dependencies"""
import os
import asyncio
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Load environment variables
load_dotenv()

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    exit(1)

print("✓ Google API Key found")

# Create a simple LlmAgent without MCP tools
root_agent = LlmAgent(
    name="simple_test_agent",
    model="gemini-2.0-flash",
    description="A simple test agent using Google ADK's LlmAgent class.",
    instruction="""You are a helpful assistant that can answer questions and have conversations.
    
    You are powered by Google's Gemini model and built using the Google Agent Development Kit (ADK).
    
    Key capabilities:
    - Natural language understanding and generation
    - Helpful, harmless, and honest responses
    - Conversation memory within the session
    
    Always be polite and helpful in your responses.""",
    tools=[]  # No external tools for simplicity
)

# Session service and runner setup
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="simple_test_agent")

async def main():
    print("🚀 Starting Simple ADK Agent Test...")
    
    # Create a session
    user_id = "test_user"
    session = await session_service.create_session(app_name="simple_test_agent", user_id=user_id)
    session_id = session.id
    
    print(f"✓ Session created: {session_id}")

    # Test message
    test_message = "Hello! Can you tell me about the Google Agent Development Kit (ADK)?"
    
    new_message = types.Content(
        role="user",
        parts=[types.Part(text=test_message)]
    )

    print(f"📨 Sending message: {test_message}")
    print("🤖 Agent response:")
    print("-" * 50)

    # Run the agent
    response_content = ""
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=new_message
    ):
        print(event, end="")
        response_content += str(event)
    
    print("\n" + "-" * 50)
    print(f"✅ Test completed successfully!")
    print(f"📝 Response length: {len(response_content)} characters")

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent"]