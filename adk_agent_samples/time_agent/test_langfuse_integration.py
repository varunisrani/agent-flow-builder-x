"""Test script for Langfuse integration with Time Agent"""
import os
import asyncio
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from langfuse import Langfuse
from agent import create_root_agent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def test_langfuse_connection():
    """Test if Langfuse is properly configured and can connect."""
    print("🧪 Testing Langfuse Connection...")
    
    # Load environment variables
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
    
    langfuse_secret_key = os.getenv('LANGFUSE_SECRET_KEY')
    langfuse_public_key = os.getenv('LANGFUSE_PUBLIC_KEY')
    langfuse_host = os.getenv('LANGFUSE_HOST', 'https://cloud.langfuse.com')
    
    if not langfuse_secret_key or not langfuse_public_key:
        print("❌ Langfuse credentials not found!")
        print("Please set the following environment variables:")
        print("- LANGFUSE_SECRET_KEY=sk-lf-your_secret_key")
        print("- LANGFUSE_PUBLIC_KEY=pk-lf-your_public_key")
        print("- LANGFUSE_HOST=https://cloud.langfuse.com (optional)")
        return False
    
    try:
        # Initialize Langfuse
        langfuse = Langfuse(
            secret_key=langfuse_secret_key,
            public_key=langfuse_public_key,
            host=langfuse_host
        )
        
        # Test authentication
        if langfuse.auth_check():
            print("✅ Langfuse connection successful!")
            print(f"📍 Connected to: {langfuse_host}")
            
            # Create a test trace
            trace = langfuse.trace(name="test_trace", input="Testing Langfuse integration")
            generation = trace.generation(
                name="test_generation",
                model="test",
                input="Hello Langfuse!",
                output="Integration test successful!"
            )
            
            # Flush to ensure data is sent
            langfuse.flush()
            print("✅ Test trace created successfully!")
            return True
        else:
            print("❌ Langfuse authentication failed!")
            print("Please check your credentials.")
            return False
            
    except Exception as e:
        print(f"❌ Langfuse connection failed: {str(e)}")
        return False

def test_agent_creation():
    """Test if the agent can be created with Langfuse integration."""
    print("\n🤖 Testing Agent Creation...")
    
    try:
        agent = create_root_agent()
        print("✅ Agent created successfully with Langfuse integration!")
        return agent
    except Exception as e:
        print(f"❌ Agent creation failed: {str(e)}")
        return None

async def test_agent_interaction(agent):
    """Test agent interaction and Langfuse tracing."""
    print("\n💬 Testing Agent Interaction...")
    
    if not agent:
        print("❌ No agent to test!")
        return False
    
    try:
        # Create runner
        runner = Runner(
            app_name='langfuse_test_app',
            agent=agent,
            session_service=InMemorySessionService(),
            inputs={
                'client': genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))
            }
        )
        
        # Create session
        session = runner.session_service.create_session(
            state={}, app_name='langfuse_test_app', user_id='test_user'
        )
        
        print("🕐 Asking agent: 'What is the current time in New York?'")
        
        # Track this interaction with Langfuse
        langfuse = Langfuse()
        trace = langfuse.trace(
            name="time_agent_test",
            input="What is the current time in New York?",
            user_id="test_user",
            session_id=session.id
        )
        
        # Run the agent
        response_parts = []
        async for event in runner.run_async(
            session_id=session.id,
            user_id=session.user_id,
            new_message=types.Content(
                role='user',
                parts=[types.Part(text="What is the current time in New York?")]
            )
        ):
            print(f"📨 Event: {event}")
            if hasattr(event, 'content') and event.content:
                for part in event.content.parts:
                    if hasattr(part, 'text'):
                        response_parts.append(part.text)
        
        response = " ".join(response_parts)
        
        # Update trace with response
        trace.update(output=response)
        
        # Create generation within trace
        generation = trace.generation(
            name="time_query",
            model="gemini-2.0-flash",
            input="What is the current time in New York?",
            output=response
        )
        
        # Flush to ensure data is sent to Langfuse
        langfuse.flush()
        
        print("✅ Agent interaction completed!")
        print("✅ Interaction logged to Langfuse!")
        return True
        
    except Exception as e:
        print(f"❌ Agent interaction failed: {str(e)}")
        return False
    finally:
        if hasattr(agent, '_exit_stack'):
            await agent._exit_stack.aclose()

async def run_all_tests():
    """Run all tests."""
    print("🚀 Starting Langfuse Integration Tests")
    print("=" * 50)
    
    # Test 1: Langfuse connection
    langfuse_ok = test_langfuse_connection()
    
    # Test 2: Agent creation
    agent = test_agent_creation()
    
    # Test 3: Agent interaction (only if previous tests pass)
    if langfuse_ok and agent:
        interaction_ok = await test_agent_interaction(agent)
    else:
        print("\n⚠️  Skipping agent interaction test due to previous failures")
        interaction_ok = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print(f"Langfuse Connection: {'✅ PASS' if langfuse_ok else '❌ FAIL'}")
    print(f"Agent Creation: {'✅ PASS' if agent else '❌ FAIL'}")
    print(f"Agent Interaction: {'✅ PASS' if interaction_ok else '❌ FAIL'}")
    
    if langfuse_ok and agent and interaction_ok:
        print("\n🎉 All tests passed! Your Langfuse integration is working correctly!")
        print("🔍 Check your Langfuse dashboard to see the traced interactions.")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")

if __name__ == '__main__':
    asyncio.run(run_all_tests()) 