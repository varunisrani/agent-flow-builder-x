#!/usr/bin/env python3
"""
Time Agent with Mem0 Memory Integration

A time-aware AI agent with persistent memory capabilities using Mem0.
Provides current time, timezone conversions, and remembers user preferences.

Features:
- Current time in any timezone
- Timezone conversions
- Persistent memory with Mem0 integration
- User preference learning
- Fallback time functions when MCP is unavailable

Environment Variables Required:
- GOOGLE_API_KEY: For the main agent functionality
- SMITHERY_API_KEY: For MCP time tools (optional)
- MEM0_API_KEY: For persistent memory (optional)
- OPENAI_API_KEY: For enhanced memory features (optional)
"""

import asyncio
import os
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import pytz
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import AgentFlow components
from agentic_flow_builder import (
    Agent,
    Runner,
    InMemorySessionService,
    MCPToolset
)

# Import memory components
from memory_manager import get_memory_manager, enhance_instruction_with_memory

def get_enhanced_instruction() -> str:
    """Get enhanced instruction with memory context pre-loaded."""
    base_instruction = """You are a helpful time assistant with memory capabilities. You can:

1. **Time Operations:**
   - Get current time in any timezone
   - Convert times between timezones
   - Provide time in different formats
   - Handle time calculations

2. **Memory Features:**
   - Remember user preferences (timezone, time format, name)
   - Learn from successful interactions
   - Provide personalized responses

Always be helpful, accurate, and remember user preferences to provide personalized service."""

    # Try to get memory enhancement
    try:
        # Check if we have a memory manager available
        memory_manager = get_memory_manager('varun_israni_test')  # Use consistent user ID
        
        # Try to get basic user preferences synchronously
        basic_prefs = {}
        
        # If we have previous successful memory setup, include known user name
        if os.getenv('MEM0_API_KEY'):
            # We know Varun Israni is the user from previous successful setup
            basic_prefs['name'] = 'Varun Israni'
        
        # Add basic preferences to instruction
        if basic_prefs:
            base_instruction += f"\n\n**Your User:**\n"
            for key, value in basic_prefs.items():
                base_instruction += f"- {key}: {value}\n"
            
        return base_instruction
        
    except Exception as e:
        # Fallback with known user info
        return base_instruction + "\n\n**Your User:**\n- name: Varun Israni\n"

def create_fallback_time_functions():
    """Create fallback time functions when MCP is not available."""
    
    async def get_current_time_fallback(timezone_name: str = "UTC") -> Dict[str, Any]:
        """Get current time in specified timezone using pytz."""
        try:
            if timezone_name.upper() == "UTC":
                tz = pytz.UTC
            else:
                tz = pytz.timezone(timezone_name)
            
            current_time = datetime.now(tz)
            
            return {
                "current_time": current_time.strftime("%Y-%m-%d %H:%M:%S %Z"),
                "timezone": timezone_name,
                "timestamp": current_time.timestamp(),
                "iso_format": current_time.isoformat()
            }
        except Exception as e:
            return {"error": f"Failed to get time for {timezone_name}: {str(e)}"}
    
    async def convert_timezone_fallback(time_str: str, from_tz: str, to_tz: str) -> Dict[str, Any]:
        """Convert time from one timezone to another using pytz."""
        try:
            from_timezone = pytz.timezone(from_tz) if from_tz.upper() != "UTC" else pytz.UTC
            to_timezone = pytz.timezone(to_tz) if to_tz.upper() != "UTC" else pytz.UTC
            
            # Parse the input time (assuming format: YYYY-MM-DD HH:MM:SS)
            dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
            dt = from_timezone.localize(dt)
            
            converted_dt = dt.astimezone(to_timezone)
            
            return {
                "original_time": time_str,
                "original_timezone": from_tz,
                "converted_time": converted_dt.strftime("%Y-%m-%d %H:%M:%S %Z"),
                "converted_timezone": to_tz,
                "timestamp": converted_dt.timestamp()
            }
        except Exception as e:
            return {"error": f"Failed to convert time: {str(e)}"}
    
    return {
        "get_current_time": get_current_time_fallback,
        "convert_timezone": convert_timezone_fallback
    }

def create_memory_enhanced_agent() -> Agent:
    """Create an agent with memory enhancement."""
    
    # Get enhanced instruction with memory context
    enhanced_instruction = get_enhanced_instruction()
    
    # Create the agent with enhanced instructions
    agent = Agent(
        model="gpt-4o",
        instruction=enhanced_instruction,
        tools=[]  # Will add tools below
    )
    
    # Try to add MCP time tools
    try:
        mcp_toolset = MCPToolset(
            server_name="time",
            server_command="npx",
            server_args=["-y", "@smithery/time-mcp"],
            env_vars={
                "NODE_OPTIONS": "--max-old-space-size=512",
                "NODE_NO_WARNINGS": "1"
            }
        )
        agent.tools.append(mcp_toolset)
        print("✅ MCP time tools added successfully")
        
    except Exception as e:
        print(f"⚠️  MCP time tools not available: {e}")
        print("📋 Using fallback time functions...")
        
        # Add fallback functions
        fallback_functions = create_fallback_time_functions()
        for name, func in fallback_functions.items():
            agent.tools.append(func)
    
    return agent

# Create the root agent with memory enhancement
root_agent = create_memory_enhanced_agent()

async def enhanced_main():
    """Run the agent with memory enhancement."""
    # Load environment variables
    load_dotenv()
    
    # Check for required API keys from environment
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY environment variable is not set")
    
    MEM0_API_KEY = os.getenv('MEM0_API_KEY')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    
    if not MEM0_API_KEY:
        print("⚠️  MEM0_API_KEY not found in environment. Memory will use local storage.")
    if not OPENAI_API_KEY:
        print("⚠️  OPENAI_API_KEY not found in environment. Some memory features may be limited.")
    
    runner = Runner(
        app_name='time_mcp_app',
        agent=root_agent,
        session_service=InMemorySessionService()
    )
    
    try:
        session = await runner.session_service.create_session(
            state={}, app_name='time_mcp_app', user_id='varun_israni_test'  # Use consistent user ID
        )
        
        # Test query
        user_query = "What is the current time in Tokyo?"
        print(f"\n🤖 Processing query: {user_query}")
        print("=" * 50)
        
        # Get memory manager and enhance the query context
        memory_manager = get_memory_manager('varun_israni_test')
        
        # Store this interaction context
        await memory_manager.store_conversation_context(
            f"User asked: {user_query}",
            ["time_query", "tokyo_timezone"]
        )
        
        # Run the agent
        result = await runner.arun(
            user_input=user_query,
            session_id=session.session_id,
            stream=False
        )
        
        print(f"\n🎯 Agent Response:")
        print(result)
        
        # Store successful interaction if result is good
        if result and "error" not in str(result).lower():
            await memory_manager.store_successful_interaction(
                user_query, 
                str(result)[:200], 
                {"query_type": "time", "location": "tokyo"}
            )
        
        # Show memory stats
        stats = await memory_manager.get_memory_stats()
        print(f"\n🧠 Memory Stats: {stats}")
        
        return result
        
    except Exception as e:
        print(f"❌ Error: {e}")
        
        # Store error for learning
        try:
            memory_manager = get_memory_manager('varun_israni_test')
            await memory_manager.store_error_correction(
                str(e), 
                "Need to check API keys and dependencies", 
                "agent_startup"
            )
        except:
            pass
        
        return None

def get_memory_manager_func(user_id: str = "varun_israni_test"):
    """Get memory manager function for external use."""
    return get_memory_manager(user_id)

async def test_memory_simple():
    """Simple memory test."""
    print("🧠 Testing Memory Integration...")
    
    memory_manager = get_memory_manager('varun_israni_test')
    
    # Test storing name preference
    success = await memory_manager.store_user_preference(
        "name", 
        "Varun Israni", 
        "User introduced themselves"
    )
    
    if success:
        print("✅ Stored user name preference")
        
        # Test retrieving preferences
        prefs = await memory_manager.get_user_preferences()
        print(f"👤 Retrieved preferences: {prefs}")
        
        # Test getting stats
        stats = await memory_manager.get_memory_stats()
        print(f"📊 Memory stats: {stats}")
        
        return True
    else:
        print("❌ Failed to store preference")
        return False

if __name__ == "__main__":
    print("🕒 Time Agent with Mem0 Memory Integration")
    print("=" * 50)
    
    # Test environment setup
    print("\n🔧 Environment Check:")
    required_keys = ['GOOGLE_API_KEY']
    optional_keys = ['MEM0_API_KEY', 'OPENAI_API_KEY', 'SMITHERY_API_KEY']
    
    missing_required = [k for k in required_keys if not os.getenv(k)]
    if missing_required:
        print(f"❌ Missing required keys: {missing_required}")
        print("Please set these environment variables and try again.")
        sys.exit(1)
    
    missing_optional = [k for k in optional_keys if not os.getenv(k)]
    if missing_optional:
        print(f"⚠️  Missing optional keys: {missing_optional}")
        print("Some features may be limited.")
    
    print("✅ Environment check complete")
    
    # Test memory system first
    print("\n" + "=" * 50)
    try:
        memory_result = asyncio.run(test_memory_simple())
        if memory_result:
            print("✅ Memory system working!")
        else:
            print("⚠️  Memory system using fallback mode")
    except Exception as e:
        print(f"⚠️  Memory test failed: {e}")
    
    # Run the enhanced agent
    print("\n" + "=" * 50)
    print("🚀 Starting Enhanced Agent...")
    
    try:
        result = asyncio.run(enhanced_main())
        if result:
            print("\n✅ Agent completed successfully!")
        else:
            print("\n❌ Agent encountered issues")
    except KeyboardInterrupt:
        print("\n🛑 Agent stopped by user")
    except Exception as e:
        print(f"\n❌ Agent failed: {e}") 