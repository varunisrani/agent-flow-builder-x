"""time_agent - Memory-Enabled Agent"""
import os
import asyncio
import json
from datetime import datetime, timezone
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from mem0 import Memory

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    # Don't exit here - let the agent continue without full functionality

print(f"🔧 Agent Configuration:")
print(f"   Memory enabled: {bool(os.environ.get('MEM0_API_KEY'))}")
print(f"   Running in memory-focused mode")

# Initialize Mem0 Memory
memory = None
if os.environ.get('MEM0_API_KEY'):
    os.environ["MEM0_API_KEY"] = os.environ.get('MEM0_API_KEY')
    try:
        memory = Memory()
        print("✓ Mem0 memory initialized")
    except Exception as e:
        print(f"Failed to initialize Mem0: {e}")
        memory = None
else:
    print("Warning: MEM0_API_KEY not set. Memory features will be disabled.")

# Memory management functions
def add_to_memory(user_message: str, assistant_response: str, user_id: str = "default_user", metadata: dict = None):
    """Add conversation to memory for learning and context."""
    if not memory:
        return []
    
    try:
        conversation = [
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": assistant_response}
        ]
        
        result = memory.add(
            conversation, 
            user_id=user_id, 
            metadata={
                "agent": "time_agent",
                "memory_type": "preferences",
                "timestamp": json.dumps({"created": "now"}),
                **(metadata or {})
            }
        )
        print(f"✓ Added conversation to memory: {result}")
        return result
    except Exception as e:
        print(f"Failed to add to memory: {e}")
        return []

def search_memory(query: str, user_id: str = "default_user"):
    """Search memory for relevant information."""
    if not memory:
        return []
    
    try:
        results = memory.search(query, user_id=user_id)
        print(f"✓ Found {len(results)} relevant memories")
        return results
    except Exception as e:
        print(f"Failed to search memory: {e}")
        return []

def get_memory_context(user_message: str, user_id: str = "default_user"):
    """Get relevant memory context for the current conversation."""
    memories = search_memory(user_message, user_id)
    if memories:
        context = "\n\nRelevant context from previous conversations:\n"
        # Handle different possible return types from Mem0
        try:
            # If memories is a list-like object
            if hasattr(memories, '__iter__') and not isinstance(memories, str):
                memory_list = list(memories)[:3]  # Convert to list and limit to top 3
                for memory_item in memory_list:
                    if isinstance(memory_item, dict):
                        memory_text = memory_item.get('memory', str(memory_item))
                    else:
                        memory_text = str(memory_item)
                    context += f"- {memory_text[:200]}...\n"
            else:
                # If memories is a single item
                memory_text = memories.get('memory', str(memories)) if isinstance(memories, dict) else str(memories)
                context += f"- {memory_text[:200]}...\n"
        except Exception as e:
            print(f"Error processing memories: {e}")
            context += f"- Previous interaction found but could not be processed\n"
        return context
    return ""

# Simple time functions for fallback
def get_current_time():
    """Get current time in ISO format."""
    return datetime.now(timezone.utc).isoformat()

def get_time_difference(time1: str, time2: str):
    """Calculate difference between two times."""
    try:
        dt1 = datetime.fromisoformat(time1.replace('Z', '+00:00'))
        dt2 = datetime.fromisoformat(time2.replace('Z', '+00:00'))
        diff = abs((dt2 - dt1).total_seconds())
        return f"{diff} seconds"
    except Exception as e:
        return f"Error calculating time difference: {e}"

# Create the LlmAgent with memory capabilities
root_agent = LlmAgent(
    name="time_agent",
    model="gemini-2.0-flash",
    description="A memory-enabled agent that can handle time-related queries and learns from conversations.",
    instruction=f"""You are a time-aware agent with persistent memory capabilities using Mem0.

MEMORY FEATURES:
- Persistent memory across conversations using Mem0
- Context-aware responses based on conversation history
- Learning from user preferences and interactions
- Memory type: preferences

AVAILABLE FUNCTIONS:
- Current time: {get_current_time()}
- Time calculations available upon request

IMPORTANT RULES:
1. Use memory context to provide personalized responses
2. Remember user preferences and conversation history
3. Provide helpful time-related information
4. Always provide clear explanations for actions taken
5. Learn from each interaction to improve future responses

When users ask about time, provide accurate information and remember their preferences for future interactions.""",
    tools=[]  # No MCP tools for now, focusing on memory
)

# Session service and runner setup
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="time_agent")

async def main():
    # Create a session
    user_id = "default_user"
    session = await session_service.create_session(app_name="time_agent", user_id=user_id)
    session_id = session.id

    # Test message with memory context
    test_message = "Hello, what's the current time?"
    memory_context = get_memory_context(test_message, user_id)
    
    full_message = test_message + memory_context
    
    new_message = types.Content(
        role="user",
        parts=[types.Part(text=full_message)]
    )

    # Run the agent
    response_content = ""
    print(f"\n🤖 Running time_agent with memory...")
    print(f"📝 User message: {test_message}")
    if memory_context:
        print(f"🧠 Memory context: {memory_context.strip()}")
    
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=new_message
    ):
        print(event)
        response_content += str(event)
    
    # Add conversation to memory
    add_to_memory(test_message, response_content, user_id, {
        "session_id": session_id,
        "agent_name": "time_agent"
    })

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent", "add_to_memory", "search_memory", "get_memory_context"]
