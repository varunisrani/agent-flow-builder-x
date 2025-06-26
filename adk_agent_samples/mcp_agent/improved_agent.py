from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.genai import types
import asyncio
import logging
import json
from typing import Dict, List, Callable, Any
from enum import Enum
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class EventType(Enum):
    """Event types for better categorization"""
    USER_MESSAGE = "user_message"
    AGENT_RESPONSE = "agent_response"
    TOOL_CALL = "tool_call"
    TOOL_RESPONSE = "tool_response"
    ERROR = "error"
    SESSION_START = "session_start"
    SESSION_END = "session_end"
in this event handling not working proelry no node can't create in @NaturalLanguageInput.tsx sovle it must other anylis mermoy option and mcp intregation remain same
class EventHandler:
    """Enhanced event handler with callback management"""
    
    def __init__(self):
        self.listeners: Dict[EventType, List[Callable]] = {event_type: [] for event_type in EventType}
        self.event_history: List[Dict] = []
        self.middleware: List[Callable] = []
    
    def add_listener(self, event_type: EventType, callback: Callable):
        """Register an event listener"""
        self.listeners[event_type].append(callback)
        logger.info(f"Added listener for {event_type.value}")
    
    def remove_listener(self, event_type: EventType, callback: Callable):
        """Remove an event listener"""
        if callback in self.listeners[event_type]:
            self.listeners[event_type].remove(callback)
            logger.info(f"Removed listener for {event_type.value}")
    
    def add_middleware(self, middleware: Callable):
        """Add middleware for event processing"""
        self.middleware.append(middleware)
    
    async def emit_event(self, event_type: EventType, data: Any):
        """Emit an event with data"""
        event_data = {
            'type': event_type.value,
            'data': data,
            'timestamp': datetime.now().isoformat(),
            'id': len(self.event_history)
        }
        
        # Process through middleware
        for middleware in self.middleware:
            try:
                event_data = await self._call_if_async(middleware, event_data)
            except Exception as e:
                logger.error(f"Middleware error: {e}")
        
        # Store in history
        self.event_history.append(event_data)
        
        # Notify listeners
        for listener in self.listeners[event_type]:
            try:
                await self._call_if_async(listener, event_data)
            except Exception as e:
                logger.error(f"Listener error for {event_type.value}: {e}")
    
    async def _call_if_async(self, func: Callable, *args) -> Any:
        """Call function whether it's async or sync"""
        if asyncio.iscoroutinefunction(func):
            return await func(*args)
        else:
            return func(*args)

# Event Listeners
async def on_user_message(event_data: Dict):
    """Handle user message events"""
    logger.info(f"📨 User message: {event_data['data'].get('content', 'N/A')}")

async def on_agent_response(event_data: Dict):
    """Handle agent response events"""
    logger.info(f"🤖 Agent responded: {event_data['data'].get('content', 'N/A')}")

async def on_tool_call(event_data: Dict):
    """Handle tool call events"""
    tool_name = event_data['data'].get('tool_name', 'Unknown')
    logger.info(f"🛠️ Tool called: {tool_name}")

async def on_error(event_data: Dict):
    """Handle error events"""
    error = event_data['data'].get('error', 'Unknown error')
    logger.error(f"❌ Error occurred: {error}")

# Middleware
async def logging_middleware(event_data: Dict) -> Dict:
    """Log all events"""
    logger.debug(f"Event: {event_data['type']} at {event_data['timestamp']}")
    return event_data

async def analytics_middleware(event_data: Dict) -> Dict:
    """Add analytics data"""
    event_data['analytics'] = {
        'processed_at': datetime.now().isoformat(),
        'user_agent': 'DocQueryAgent/1.0'
    }
    return event_data

# MCP toolset configuration
toolset = MCPToolset(
    connection_params=StdioServerParameters(
        command="npx",
        args=["-y", "@smithery/cli@latest", "run", "@upstash/context7-mcp", "--key", "040afa77-557a-4a7b-9169-3f1f2b9d685f"],
        env={"NODE_OPTIONS": "--no-warnings --experimental-fetch", "SMITHERY_API_KEY": "040afa77-557a-4a7b-9169-3f1f2b9d685f"}
    )
)

# Enhanced agent with event handling
root_agent = LlmAgent(
    name="DocQueryAgent",
    model="gemini-2.0-flash",
    description="An LlmAgent with advanced event handling capabilities for MCP operations",
    instruction="You are an intelligent agent with comprehensive event tracking. Use MCP tools and provide detailed responses while maintaining event history.",
    tools=[toolset]
)

# Global event handler
event_handler = EventHandler()

# Setup event listeners
event_handler.add_listener(EventType.USER_MESSAGE, on_user_message)
event_handler.add_listener(EventType.AGENT_RESPONSE, on_agent_response)
event_handler.add_listener(EventType.TOOL_CALL, on_tool_call)
event_handler.add_listener(EventType.ERROR, on_error)

# Setup middleware
event_handler.add_middleware(logging_middleware)
event_handler.add_middleware(analytics_middleware)

# Session service and runner
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="DocQueryAgent")

async def process_agent_events():
    """Enhanced event processing with comprehensive handling"""
    user_id = "user"
    session = session_service.create_session(state={}, app_name="DocQueryAgent", user_id=user_id)
    session_id = session.id
    
    # Emit session start event
    await event_handler.emit_event(EventType.SESSION_START, {
        'session_id': session_id,
        'user_id': user_id
    })
    
    # Sample conversations with event tracking
    messages = [
        "Hello, can you help me with document queries?",
        "What tools are available to you?",
        "Can you search for information about Python asyncio?"
    ]
    
    try:
        for message_text in messages:
            # Emit user message event
            await event_handler.emit_event(EventType.USER_MESSAGE, {
                'content': message_text,
                'session_id': session_id
            })
            
            # Create message
            new_message = types.Content(
                role="user",
                parts=[types.Part(text=message_text)]
            )
            
            # Process with agent and handle events
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=new_message
            ):
                await handle_event(event)
            
            # Brief pause between messages
            await asyncio.sleep(1)
            
    except Exception as e:
        await event_handler.emit_event(EventType.ERROR, {
            'error': str(e),
            'session_id': session_id
        })
    finally:
        # Emit session end event
        await event_handler.emit_event(EventType.SESSION_END, {
            'session_id': session_id,
            'total_events': len(event_handler.event_history)
        })

async def handle_event(event):
    """Enhanced event handler with type-specific processing"""
    try:
        event_data = {
            'raw_event': str(event),
            'timestamp': datetime.now().isoformat()
        }
        
        # Classify and emit appropriate events
        if hasattr(event, 'content') and event.content:
            # Agent response
            await event_handler.emit_event(EventType.AGENT_RESPONSE, {
                'content': str(event.content),
                'event_type': type(event).__name__
            })
        elif hasattr(event, 'actions') and event.actions:
            # Tool call
            await event_handler.emit_event(EventType.TOOL_CALL, {
                'actions': str(event.actions),
                'tool_name': getattr(event, 'tool_name', 'Unknown')
            })
        
        # Print formatted event
        print(f"🔄 Event: {type(event).__name__} | {datetime.now().strftime('%H:%M:%S')}")
        print(f"   Content: {getattr(event, 'content', 'No content')}")
        print(f"   Actions: {getattr(event, 'actions', 'No actions')}")
        print("-" * 50)
        
    except Exception as e:
        await event_handler.emit_event(EventType.ERROR, {
            'error': f"Event handling error: {str(e)}",
            'event': str(event)
        })

async def show_event_summary():
    """Display event summary and statistics"""
    print("\n" + "="*60)
    print("📊 EVENT SUMMARY")
    print("="*60)
    
    # Event type counts
    event_counts = {}
    for event in event_handler.event_history:
        event_type = event['type']
        event_counts[event_type] = event_counts.get(event_type, 0) + 1
    
    for event_type, count in event_counts.items():
        print(f"  {event_type}: {count} events")
    
    print(f"\n  Total Events: {len(event_handler.event_history)}")
    print(f"  Active Listeners: {sum(len(listeners) for listeners in event_handler.listeners.values())}")
    print(f"  Middleware: {len(event_handler.middleware)}")

async def main():
    """Main execution with comprehensive event handling"""
    print("🚀 Starting DocQueryAgent with Enhanced Event Handling")
    print("-" * 60)
    
    try:
        await process_agent_events()
        await show_event_summary()
        
    except KeyboardInterrupt:
        await event_handler.emit_event(EventType.ERROR, {
            'error': 'User interrupted execution'
        })
        print("\n⏹️ Agent stopped by user")
    except Exception as e:
        await event_handler.emit_event(EventType.ERROR, {
            'error': f'Unexpected error: {str(e)}'
        })
        print(f"\n❌ Error: {e}")
    finally:
        print("\n✅ Agent execution completed")

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent", "event_handler"] 