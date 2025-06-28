"""time_agent - Event Handling Agent"""
import os
import asyncio
import logging
import json
from datetime import datetime
from typing import Dict, List, Any
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
        args=["-y","@smithery/cli@latest","run","@yokingma/time-mcp","--key",smithery_api_key],
        env={"NODE_OPTIONS":"--no-warnings --experimental-fetch","SMITHERY_API_KEY":smithery_api_key}
    )
)

# Event Handling Setup
# Configure logging for event tracking
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agent_events.log'),
        logging.StreamHandler()
    ]
)
event_logger = logging.getLogger('agent_events')

# Event Handling Class
class EventHandler:
    """Comprehensive event handling system for agent interactions."""
    
    def __init__(self):
        self.event_history: List[Dict[str, Any]] = []
        self.listeners = {
            'user_message': True,
            'agent_response': True,
            'tool_call': True,
            'error': True
        }
        self.analytics_enabled = True
        self.history_enabled = True
    
    def log_event(self, event_type: str, data: Dict[str, Any], user_id: str = "default"):
        """Log an event with comprehensive tracking."""
        if not self.listeners.get(event_type, False):
            return
        
        event = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'user_id': user_id,
            'agent_name': 'time_agent',
            'data': data
        }
        
        # Log to file/console
        event_logger.info(f"[{event_type.upper()}] User: {user_id} | Data: {data}")
        
        # Store in history if enabled
        if self.history_enabled:
            self.event_history.append(event)
            # Keep only last 1000 events to prevent memory issues
            if len(self.event_history) > 1000:
                self.event_history = self.event_history[-1000:]
        
        return event
    
    def log_user_message(self, message: str, user_id: str = "default"):
        """Log user message event."""
        return self.log_event('user_message', {
            'message': message,
            'message_length': len(message),
            'timestamp': datetime.now().isoformat()
        }, user_id)
    
    def log_agent_response(self, response: str, user_id: str = "default"):
        """Log agent response event."""
        return self.log_event('agent_response', {
            'response': response,
            'response_length': len(response),
            'timestamp': datetime.now().isoformat()
        }, user_id)
    
    def log_tool_call(self, tool_name: str, parameters: Dict[str, Any], result: str, user_id: str = "default"):
        """Log tool call event."""
        return self.log_event('tool_call', {
            'tool_name': tool_name,
            'parameters': parameters,
            'result': result,
            'success': True,
            'timestamp': datetime.now().isoformat()
        }, user_id)
    
    def log_error(self, error_type: str, error_message: str, user_id: str = "default"):
        """Log error event."""
        return self.log_event('error', {
            'error_type': error_type,
            'error_message': error_message,
            'timestamp': datetime.now().isoformat()
        }, user_id)
    
    def get_event_history(self, event_type: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get event history with optional filtering."""
        if not self.history_enabled:
            return []
        
        events = self.event_history
        if event_type:
            events = [e for e in events if e['event_type'] == event_type]
        
        return events[-limit:]
    
    def get_event_stats(self) -> Dict[str, Any]:
        """Get event statistics."""
        if not self.history_enabled:
            return {}
        
        stats = {}
        for event in self.event_history:
            event_type = event['event_type']
            stats[event_type] = stats.get(event_type, 0) + 1
        
        return {
            'total_events': len(self.event_history),
            'event_counts': stats,
            'first_event': self.event_history[0]['timestamp'] if self.event_history else None,
            'last_event': self.event_history[-1]['timestamp'] if self.event_history else None
        }

# Initialize event handler
event_handler = EventHandler()

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

EVENT HANDLING FEATURES:
- Comprehensive event tracking for all agent interactions
- Real-time event monitoring and logging to files and console
- Event history with filtering and analytics
- Configurable event listeners for different event types

ANALYTICS FEATURES:
- All interactions are automatically tracked with Langfuse
- Conversation analytics for performance monitoring
- Error tracking and debugging support

IMPORTANT RULES:
1. All interactions are automatically tracked through the event handling system
2. Use available MCP tools to perform requested operations
3. Always provide clear explanations for actions taken
4. Events are logged with timestamps and user context
5. Error handling includes automatic error event logging""",
    tools=[time_mcp_toolset]
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

    # Test message
    test_message = "Hello, agent! What time is it and how does your event handling work?"
    
    # Log user message event
    event_handler.log_user_message(test_message, user_id)
    
    new_message = types.Content(
        role="user",
        parts=[types.Part(text=test_message)]
    )

    # Track user message
    track_conversation(session_id, user_id, {
        "event_type": "user_message",
        "message": test_message
    })

    # Run the agent with comprehensive event logging
    response_content = ""
    try:
        print(f"🚀 Starting agent execution with event handling...")
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message
        ):
            print(event)
            response_content += str(event)
            
            # Log each agent event
            event_handler.log_agent_response(str(event), user_id)
            
            # Track agent response
            track_conversation(session_id, user_id, {
                "event_type": "agent_response",
                "response": str(event)
            })
    except Exception as e:
        # Log error event
        event_handler.log_error(type(e).__name__, str(e), user_id)
        print(f"❌ Error during agent execution: {e}")
        raise
    
    # Print comprehensive event statistics
    stats = event_handler.get_event_stats()
    print(f"\n📊 Event Statistics:")
    print(f"   Total Events: {stats.get('total_events', 0)}")
    print(f"   Event Counts: {stats.get('event_counts', {})}")
    
    # Print recent events
    recent_events = event_handler.get_event_history(limit=10)
    print(f"\n📋 Recent Events ({len(recent_events)}):")
    for i, event in enumerate(recent_events, 1):
        print(f"   {i}. [{event['event_type'].upper()}] {event['timestamp']}")
        print(f"      Data: {json.dumps(event['data'], indent=6)}")
    
    # Demonstrate event filtering
    user_events = event_handler.get_event_history(event_type='user_message')
    agent_events = event_handler.get_event_history(event_type='agent_response')
    print(f"\n📈 Event Breakdown:")
    print(f"   User Messages: {len(user_events)}")
    print(f"   Agent Responses: {len(agent_events)}")
    
    print(f"\n✅ Event handling demonstration completed!")
    print(f"📝 Check 'agent_events.log' for detailed event logs")

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent", "track_conversation", "event_handler", "EventHandler"]