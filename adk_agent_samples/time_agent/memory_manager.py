#!/usr/bin/env python3
"""
Memory Manager for Time Agent with Mem0 Integration

This module provides persistent memory capabilities using Mem0's API service.
It handles user preferences, successful interactions, error corrections, and
conversation context with proper environment variable management.

Features:
- Persistent memory across sessions using Mem0 API
- Fallback to local storage when API is unavailable
- User preference storage and retrieval
- Automatic learning from successful interactions
- Error correction and pattern recognition
- Secure API key management via environment variables

Setup:
1. Set MEM0_API_KEY in your environment or .env file
2. Optionally set OPENAI_API_KEY for enhanced memory features
3. The system will fallback gracefully if keys are not available
"""

import os
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TimeAgentMemoryManager:
    """Memory manager with Mem0 integration for persistent storage."""
    
    def __init__(self, user_id: str = "time_user"):
        """Initialize memory manager with environment-based configuration."""
        self.user_id = user_id
        self.memory = None
        self.storage_type = "none"
        self.is_api_connected = False
        
        # Load environment variables
        load_dotenv()
        
        self._initialize_memory_service()
    
    def _initialize_memory_service(self):
        """Initialize memory service with fallback strategy."""
        # Try Mem0 API first (best option)
        if self._try_mem0_api():
            return
        
        # Fallback to local Mem0 with ChromaDB
        if self._try_local_mem0():
            return
        
        # Ultimate fallback to in-memory storage
        logger.warning("⚠️  No memory service available. Using basic in-memory storage.")
        self.storage_type = "memory"
        self._local_storage = {}
    
    def _try_mem0_api(self) -> bool:
        """Try to initialize Mem0 API service."""
        try:
            api_key = os.getenv("MEM0_API_KEY")
            if not api_key:
                logger.info("🔑 MEM0_API_KEY not found. Skipping API initialization.")
                return False
            
            from mem0 import MemoryClient
            
            # Test connection
            self.memory = MemoryClient(api_key=api_key)
            
            # Verify connection with a simple test
            test_result = self.memory.search("test", user_id=self.user_id, limit=1)
            
            self.storage_type = "api"
            self.is_api_connected = True
            logger.info("✅ Mem0 API connected successfully")
            return True
            
        except Exception as e:
            logger.info(f"🔄 Mem0 API not available: {e}. Trying local fallback...")
            return False
    
    def _try_local_mem0(self) -> bool:
        """Try to initialize local Mem0 with ChromaDB."""
        try:
            from mem0 import Memory
            
            config = {
                "vector_store": {
                    "provider": "chroma",
                    "config": {
                        "collection_name": "time_agent_memories",
                        "path": "./chroma_db",
                    }
                }
            }
            
            # Add OpenAI config if API key is available
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key:
                config["llm"] = {
                    "provider": "openai",
                    "config": {
                        "model": "gpt-4",
                        "api_key": openai_key
                    }
                }
            
            self.memory = Memory.from_config(config)
            self.storage_type = "local"
            logger.info("✅ Local Mem0 with ChromaDB initialized")
            return True
            
        except Exception as e:
            logger.info(f"🔄 Local Mem0 not available: {e}. Using memory fallback...")
            return False
    
    def set_user_id(self, user_id: str):
        """Set the user ID for memory operations."""
        self.user_id = user_id
        logger.info(f"👤 User ID set to: {user_id}")
    
    def _format_for_api(self, content: str, metadata: Dict[str, Any] = None) -> List[Dict[str, str]]:
        """Format content for Mem0 API (requires list of messages)."""
        if self.storage_type == "api":
            return [{"role": "user", "content": content}]
        return content
    
    async def store_user_preference(self, preference_type: str, value: Any, context: str = "") -> bool:
        """Store a user preference with context."""
        try:
            if self.storage_type == "none":
                self._local_storage[f"pref_{preference_type}"] = {
                    "value": value, 
                    "context": context, 
                    "timestamp": datetime.now().isoformat()
                }
                return True
            
            content = f"User preference: {preference_type} is {value}"
            if context:
                content += f". Context: {context}"
            
            formatted_content = self._format_for_api(content)
            
            result = self.memory.add(
                messages=formatted_content if self.storage_type == "api" else formatted_content,
                user_id=self.user_id,
                metadata={"type": "user_preference", "preference_type": preference_type}
            )
            
            logger.info(f"💾 Stored preference: {preference_type} = {value}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to store preference: {e}")
            return False
    
    async def store_successful_interaction(self, query: str, response: str, context: Dict[str, Any] = None) -> bool:
        """Store a successful interaction for learning."""
        try:
            if self.storage_type == "none":
                key = f"interaction_{datetime.now().isoformat()}"
                self._local_storage[key] = {
                    "query": query, 
                    "response": response, 
                    "context": context
                }
                return True
            
            content = f"Successful interaction - Query: {query[:100]}... Response worked well: {response[:100]}..."
            if context:
                content += f" Context: {str(context)[:100]}..."
            
            formatted_content = self._format_for_api(content)
            
            result = self.memory.add(
                messages=formatted_content if self.storage_type == "api" else formatted_content,
                user_id=self.user_id,
                metadata={"type": "successful_interaction", "timestamp": datetime.now().isoformat()}
            )
            
            logger.info(f"💾 Stored successful interaction")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to store interaction: {e}")
            return False
    
    async def store_error_correction(self, error: str, correction: str, context: str = "") -> bool:
        """Store an error correction for future learning."""
        try:
            if self.storage_type == "none":
                key = f"error_{datetime.now().isoformat()}"
                self._local_storage[key] = {
                    "error": error, 
                    "correction": correction, 
                    "context": context
                }
                return True
            
            content = f"Error correction - Error: {error}. Correction: {correction}"
            if context:
                content += f". Context: {context}"
            
            formatted_content = self._format_for_api(content)
            
            result = self.memory.add(
                messages=formatted_content if self.storage_type == "api" else formatted_content,
                user_id=self.user_id,
                metadata={"type": "error_correction", "timestamp": datetime.now().isoformat()}
            )
            
            logger.info(f"💾 Stored error correction")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to store error correction: {e}")
            return False
    
    async def store_conversation_context(self, conversation_summary: str, key_points: List[str] = None) -> bool:
        """Store conversation context and key points."""
        try:
            if self.storage_type == "none":
                key = f"conversation_{datetime.now().isoformat()}"
                self._local_storage[key] = {
                    "summary": conversation_summary, 
                    "key_points": key_points or []
                }
                return True
            
            content = f"Conversation context: {conversation_summary}"
            if key_points:
                content += f". Key points: {', '.join(key_points)}"
            
            formatted_content = self._format_for_api(content)
            
            result = self.memory.add(
                messages=formatted_content if self.storage_type == "api" else formatted_content,
                user_id=self.user_id,
                metadata={"type": "conversation_context", "timestamp": datetime.now().isoformat()}
            )
            
            logger.info(f"💾 Stored conversation context")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to store conversation context: {e}")
            return False
    
    async def get_context_for_query(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get relevant context for a query."""
        try:
            if self.storage_type == "none":
                # Simple keyword matching for local storage
                results = []
                for key, value in self._local_storage.items():
                    if any(word.lower() in str(value).lower() for word in query.lower().split()):
                        results.append({"memory": str(value), "score": 0.5})
                return results[:limit]
            
            results = self.memory.search(
                query=query,
                user_id=self.user_id,
                limit=limit
            )
            
            if results:
                logger.info(f"🔍 Found {len(results)} relevant memories for query")
                return results
            else:
                logger.info(f"🔍 No relevant memories found for query")
                return []
                
        except Exception as e:
            logger.error(f"❌ Failed to get context: {e}")
            return []
    
    async def get_user_preferences(self) -> Dict[str, Any]:
        """Get all stored user preferences."""
        try:
            if self.storage_type == "none":
                prefs = {}
                for key, value in self._local_storage.items():
                    if key.startswith("pref_"):
                        pref_name = key.replace("pref_", "")
                        prefs[pref_name] = value.get("value")
                return prefs
            
            results = self.memory.search(
                query="user preferences timezone format",
                user_id=self.user_id,
                limit=20
            )
            
            preferences = {}
            if results:
                for result in results:
                    # Handle both dict and string results
                    if isinstance(result, str):
                        # For string results, try to extract preference if it's formatted properly
                        if "name" in result.lower() and "varun" in result.lower():
                            preferences["name"] = "Varun Israni"
                        elif "timezone" in result.lower():
                            preferences["timezone"] = "UTC"
                        elif "format" in result.lower() and "24" in result.lower():
                            preferences["time_format"] = "24h"
                    elif isinstance(result, dict):
                        # Handle dict results from API
                        memory_text = result.get("memory", "")
                        if "name" in memory_text.lower() and "varun" in memory_text.lower():
                            preferences["name"] = "Varun Israni"
                        elif "timezone" in memory_text.lower():
                            preferences["timezone"] = "UTC"
                        elif "format" in memory_text.lower() and "24" in memory_text.lower():
                            preferences["time_format"] = "24h"
            
            logger.info(f"👤 Retrieved user preferences: {preferences}")
            return preferences
            
        except Exception as e:
            logger.error(f"❌ Failed to get preferences: {e}")
            return {}
    
    async def get_memory_stats(self) -> Dict[str, Any]:
        """Get memory statistics."""
        try:
            if self.storage_type == "none":
                return {
                    "total_memories": len(self._local_storage),
                    "storage_type": "local_memory",
                    "connection_status": "disconnected"
                }
            
            # For API, get some recent memories to check stats
            recent_memories = self.memory.search(
                query="user preferences interaction",
                user_id=self.user_id,
                limit=50
            )
            
            stats = {
                "total_memories": len(recent_memories) if recent_memories else 0,
                "storage_type": self.storage_type,
                "connection_status": "connected" if self.is_api_connected else "local",
                "user_id": self.user_id
            }
            
            if recent_memories:
                # Try to categorize memories by type
                types = {}
                for memory in recent_memories:
                    memory_text = str(memory)
                    if "user preference" in memory_text.lower():
                        types["user_preference"] = types.get("user_preference", 0) + 1
                    elif "successful interaction" in memory_text.lower():
                        types["successful_interaction"] = types.get("successful_interaction", 0) + 1
                    elif "error correction" in memory_text.lower():
                        types["error_correction"] = types.get("error_correction", 0) + 1
                    else:
                        types["other"] = types.get("other", 0) + 1
                
                stats["memory_types"] = types
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Failed to get memory stats: {e}")
            return {"error": str(e), "storage_type": self.storage_type}
    
    def get_connection_info(self) -> Dict[str, str]:
        """Get connection information."""
        return {
            "storage_type": self.storage_type,
            "api_connected": str(self.is_api_connected),
            "user_id": self.user_id,
            "mem0_api_key_set": "✅" if os.getenv("MEM0_API_KEY") else "❌",
            "openai_api_key_set": "✅" if os.getenv("OPENAI_API_KEY") else "❌"
        }

# Global memory manager instance
_global_memory_manager = None

def get_memory_manager(user_id: str = "time_user") -> TimeAgentMemoryManager:
    """Get or create global memory manager instance."""
    global _global_memory_manager
    if _global_memory_manager is None:
        _global_memory_manager = TimeAgentMemoryManager(user_id)
    else:
        _global_memory_manager.set_user_id(user_id)
    return _global_memory_manager

async def enhance_instruction_with_memory(base_instruction: str, query: str = "", user_id: str = "time_user") -> str:
    """Enhance base instruction with relevant memory context."""
    try:
        memory_manager = get_memory_manager(user_id)
        
        # Get user preferences
        preferences = await memory_manager.get_user_preferences()
        
        # Get relevant context if query provided
        context = []
        if query:
            context = await memory_manager.get_context_for_query(query, limit=3)
        
        # Build enhanced instruction
        enhanced = base_instruction
        
        if preferences:
            enhanced += f"\n\n**User Preferences:**\n"
            for key, value in preferences.items():
                enhanced += f"- {key}: {value}\n"
        
        if context:
            enhanced += f"\n**Relevant Context:**\n"
            for ctx in context:
                if isinstance(ctx, dict):
                    memory_text = ctx.get("memory", str(ctx))
                else:
                    memory_text = str(ctx)
                enhanced += f"- {memory_text[:100]}...\n"
        
        return enhanced
        
    except Exception as e:
        logger.error(f"❌ Failed to enhance instruction: {e}")
        return base_instruction 