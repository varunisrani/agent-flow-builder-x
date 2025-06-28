import type { Node, Edge } from '@xyflow/react';
import type { BaseNodeData } from '@/components/nodes/BaseNode';
import { verifyAndFixCode, type VerificationProgress } from './codeVerification';

export interface MCPConfig {
  enabled: boolean;
  type: string;
  command: string;
  args: string[];
  envVars: { [key: string]: string };
  smitheryMcp?: string;
  smitheryApiKey?: string;
  profileId?: string;
  availableFunctions?: string;
}

export interface LangfuseConfig {
  enabled: boolean;
  publicKey: string;
  secretKey: string;
  host: string;
  projectName: string;
}

export interface MemoryConfig {
  enabled: boolean;
  apiKey: string;
  host: string;
  userId: string;
  organization?: string;
  memoryType: 'preferences' | 'conversation' | 'knowledge' | 'all';
  retentionDays: number;
}

export interface EventHandlingConfig {
  enabled: boolean;
  eventTypes: string[];
  middleware: string[];
  listeners: { [key: string]: boolean };
  historyEnabled: boolean;
  analyticsEnabled: boolean;
}

function varNameFromPackage(mcpPackage: string, idx: number): string {
  const slug = mcpPackage.split('/').pop() || `mcp_${idx}`;
  const base = slug.replace(/-mcp$/i, '').replace(/[^a-zA-Z0-9_]/g, '_');
  return `${base}_toolset`;
}

export function dedupeConfigs(configs: MCPConfig[]): MCPConfig[] {
  const seen = new Set<string>();
  const unique: MCPConfig[] = [];
  
  configs.forEach(cfg => {
    // Create a more comprehensive key for deduplication
    const pkg = cfg.smitheryMcp || cfg.args.find(a => a.startsWith('@')) || '';
    const command = cfg.command || '';
    const key = `${pkg}|${command}`;
    
    if (!seen.has(key) && pkg) {
      seen.add(key);
      unique.push(cfg);
    }
  });
  
  console.log('Deduplication result:', { 
    original: configs.length, 
    deduplicated: unique.length,
    packages: unique.map(cfg => cfg.smitheryMcp || cfg.args.find(a => a.startsWith('@')) || 'unknown')
  });
  
  return unique;
}

// Function to extract Langfuse configuration from nodes
export function extractLangfuseConfigFromNodes(nodes: Node<BaseNodeData>[]): LangfuseConfig | null {
  const langfuseNode = nodes.find(n => n.data.type === 'langfuse');
  
  if (!langfuseNode || !langfuseNode.data.langfuseEnabled) {
    return null;
  }
  
  return {
    enabled: true,
    publicKey: langfuseNode.data.langfusePublicKey as string || '',
    secretKey: langfuseNode.data.langfuseSecretKey as string || '',
    host: langfuseNode.data.langfuseHost as string || 'https://cloud.langfuse.com',
    projectName: langfuseNode.data.langfuseProjectName as string || 'agent-project'
  };
}

// Function to check if nodes contain Langfuse configuration
export function hasLangfuseNodes(nodes: Node<BaseNodeData>[]): boolean {
  return nodes.some(n => n.data.type === 'langfuse' && n.data.langfuseEnabled);
}

// Function to extract Memory configuration from nodes
export function extractMemoryConfigFromNodes(nodes: Node<BaseNodeData>[]): MemoryConfig | null {
  const memoryNode = nodes.find(n => n.data.type === 'memory');
  
  if (!memoryNode || !memoryNode.data.memoryEnabled) {
    return null;
  }
  
  return {
    enabled: true,
    apiKey: memoryNode.data.memoryApiKey as string || '',
    host: memoryNode.data.memoryHost as string || 'https://api.mem0.ai',
    userId: memoryNode.data.memoryUserId as string || 'default_user',
    organization: memoryNode.data.memoryOrganization as string,
    memoryType: (memoryNode.data.memoryType as 'preferences' | 'conversation' | 'knowledge' | 'all') || 'all',
    retentionDays: (memoryNode.data.memoryRetention as number) || 30
  };
}

// Function to check if nodes contain Memory configuration
export function hasMemoryNodes(nodes: Node<BaseNodeData>[]): boolean {
  return nodes.some(n => n.data.type === 'memory' && n.data.memoryEnabled);
}

// Function to extract Event Handling configuration from nodes
export function extractEventHandlingConfigFromNodes(nodes: Node<BaseNodeData>[]): EventHandlingConfig | null {
  const eventHandlingNode = nodes.find(n => n.data.type === 'event-handling');
  
  if (!eventHandlingNode || !eventHandlingNode.data.eventHandlingEnabled) {
    return null;
  }
  
  return {
    enabled: true,
    eventTypes: eventHandlingNode.data.eventTypes as string[] || ['user_message', 'agent_response', 'tool_call', 'error'],
    middleware: eventHandlingNode.data.eventMiddleware as string[] || ['logging_middleware'],
    listeners: eventHandlingNode.data.eventListeners as { [key: string]: boolean } || {
      'user_message': true,
      'agent_response': true,
      'tool_call': true,
      'error': true
    },
    historyEnabled: eventHandlingNode.data.eventHistoryEnabled as boolean || true,
    analyticsEnabled: eventHandlingNode.data.eventAnalyticsEnabled as boolean || false
  };
}

// Function to check if nodes contain Event Handling configuration
export function hasEventHandlingNodes(nodes: Node<BaseNodeData>[]): boolean {
  return nodes.some(n => n.data.type === 'event-handling' && n.data.eventHandlingEnabled);
}


// Generate Langfuse-enabled code for agents
export function generateLangfuseCode(nodes: Node<BaseNodeData>[], langfuseConfig: LangfuseConfig, mcpConfigs?: MCPConfig[]): string {
  const agentNode = nodes.find(n => n.data.type === 'agent');
  if (!agentNode) {
    return generateDefaultSearchAgentCodeWithLangfuse(langfuseConfig);
  }

  const agentName = agentNode.data.label?.replace(/[^a-zA-Z0-9_]/g, '_') || 'LangfuseAgent';
  const agentDescription = agentNode.data.description || 'Langfuse-enabled agent with analytics';
  const agentInstruction = agentNode.data.instruction || agentNode.data.prompt ||
    "You are a helpful assistant with analytics tracking for observability and performance monitoring.";

  // Check if we also have MCP tools
  const hasMcpTools = mcpConfigs && mcpConfigs.length > 0;
  const dedupedConfigs = hasMcpTools ? dedupeConfigs(mcpConfigs) : [];

  return `"""${agentName} with Langfuse Analytics"""
import os
import asyncio
import logging
import json
import base64
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
${hasMcpTools ? `from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters` : 'from google.adk.tools import google_search'}
from langfuse import Langfuse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def create_root_agent():
    """Create and return the root agent instance."""
    # Load environment variables from both locations
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

    # Configure Google AI client
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY environment variable is not set")

    # Initialize Langfuse
    langfuse_secret_key = os.getenv('LANGFUSE_SECRET_KEY')
    langfuse_public_key = os.getenv('LANGFUSE_PUBLIC_KEY')
    langfuse_host = os.getenv('LANGFUSE_HOST', '${langfuseConfig.host}')
    
    if langfuse_secret_key and langfuse_public_key:
        langfuse = Langfuse(
            secret_key=langfuse_secret_key,
            public_key=langfuse_public_key,
            host=langfuse_host
        )
        logger.info("Langfuse initialized successfully")
    else:
        logger.warning("Langfuse credentials not found in environment variables. Please set LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY")
        langfuse = None

    # Initialize Google AI client
    genai_client = genai.Client(api_key=GOOGLE_API_KEY)

${hasMcpTools ? `    # MCP Configuration${dedupedConfigs.map((config, idx) => {
    const packageName = config.smitheryMcp?.split('/').pop() || `mcp_${idx}`;
    const envKey = `SMITHERY_API_KEY`;
    return `
    ${envKey.toLowerCase()}_key = os.getenv('${envKey}')
    if not ${envKey.toLowerCase()}_key:
        raise ValueError("${envKey} environment variable is not set")`;
  }).join('')}` : ''}

    # Create ${hasMcpTools ? 'MCP-enabled' : 'standard'} agent with FIXED parameter order
    return LlmAgent(
        name='${agentName}',
        model='gemini-2.0-flash',
        description="${agentDescription}",
        instruction="""${agentInstruction}${hasMcpTools ? `

Available functions through MCP:
${dedupedConfigs.map(config => `- ${config.smitheryMcp} tools for ${config.availableFunctions || 'operations'}`).join('\n')}

IMPORTANT RULES:
1. Use the available MCP tools to perform requested operations
2. Always provide clear explanations for actions taken
3. Handle errors gracefully and provide helpful feedback` : ''}""",
        tools=[
${hasMcpTools ? dedupedConfigs.map((config, idx) => {
            const packageName = config.smitheryMcp?.split('/').pop() || `mcp_${idx}`;
            const fixedArgs = [...config.args];
            if (config.smitheryMcp) {
              const runIndex = fixedArgs.indexOf('run');
              if (runIndex !== -1 && runIndex + 1 < fixedArgs.length) {
                fixedArgs[runIndex + 1] = config.smitheryMcp;
              }
            }
            if (!fixedArgs.includes('--key')) {
              fixedArgs.push('--key', 'smithery_api_key_key');
            }
            
            return `            MCPToolset(
                connection_params=StdioServerParameters(
                    command="${config.command}",
                    args=[
${fixedArgs.map(arg => `                        "${arg}"`).join(',\n')}
                    ]
                )
            )`;
          }).join(',\n') : '            google_search'}
        ]
    )

# Create the root agent instance
root_agent = create_root_agent()

def track_conversation(conversation_id, user_id, message):
    """Track conversation interactions with Langfuse."""
    try:
        # Initialize Langfuse if not already done
        langfuse_secret_key = os.getenv('LANGFUSE_SECRET_KEY')
        langfuse_public_key = os.getenv('LANGFUSE_PUBLIC_KEY')
        langfuse_host = os.getenv('LANGFUSE_HOST', '${langfuseConfig.host}')
        
        if langfuse_secret_key and langfuse_public_key:
            langfuse = Langfuse(
                secret_key=langfuse_secret_key,
                public_key=langfuse_public_key,
                host=langfuse_host
            )
            
            langfuse.track_event(
                event_name="conversation_interaction",
                properties={
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "message": message,
                    "project": "${langfuseConfig.projectName}",
                    "agent_name": "${agentName}"
                }
            )
            logger.info(f"Tracked conversation interaction for user {user_id}")
        else:
            logger.warning("Langfuse tracking skipped - credentials not configured")
    except Exception as e:
        logger.error(f"Failed to track conversation: {e}")

async def main():
    """Run the agent."""
    session_service = InMemorySessionService()
    runner = Runner(
        agent=root_agent,
        session_service=session_service,
        app_name='${langfuseConfig.projectName || 'agent_flow_project'}'
    )
    
    try:
        # FIXED: Use async session creation with correct parameters
        session = await session_service.create_session(
            app_name='${langfuseConfig.projectName || 'agent_flow_project'}',
            user_id='${langfuseConfig.projectName || 'agent'}_user'
        )
        async for event in runner.run_async(
            session_id=session.id,
            user_id=session.user_id,
            new_message=types.Content(
                role='user',
                parts=[types.Part(text="Hello! How can you help me today?")]
            )
        ):
            print(event)
            # Track the interaction
            track_conversation(session.id, session.user_id, str(event))
    finally:
        if hasattr(root_agent, '_exit_stack'):
            await root_agent._exit_stack.aclose()

if __name__ == '__main__':
    asyncio.run(main())

# Export the agent and tracking functions
__all__ = ['root_agent', 'track_conversation']
`;
}

// Generate Event Handling-enabled code for agents
export function generateEventHandlingCode(nodes: Node<BaseNodeData>[], eventHandlingConfig: EventHandlingConfig, langfuseConfig?: LangfuseConfig, memoryConfig?: MemoryConfig, mcpConfigs?: MCPConfig[]): string {
  const agentNode = nodes.find(n => n.data.type === 'agent');
  if (!agentNode) {
    return generateDefaultEventHandlingAgentCode(eventHandlingConfig);
  }

  const agentName = agentNode.data.label?.replace(/[^a-zA-Z0-9_]/g, '_') || 'EventHandlingAgent';
  const agentDescription = agentNode.data.description || 'Event handling enabled agent with comprehensive monitoring';
  const agentInstruction = agentNode.data.instruction || agentNode.data.prompt ||
    "You are a helpful assistant with comprehensive event handling for monitoring and analytics.";

  // Check if we also have other integrations
  const hasLangfuse = langfuseConfig && langfuseConfig.enabled;
  const hasMemory = memoryConfig && memoryConfig.enabled;
  const hasMcpTools = mcpConfigs && mcpConfigs.length > 0;
  const dedupedConfigs = hasMcpTools ? dedupeConfigs(mcpConfigs) : [];

  // Generate event types based on configuration
  const eventTypes = eventHandlingConfig.eventTypes || ['user_message', 'agent_response', 'tool_call', 'error'];
  const middleware = eventHandlingConfig.middleware || ['logging_middleware'];
  const listeners = eventHandlingConfig.listeners || {};

  return `"""${agentName} with Enhanced Event Handling"""
import os
import asyncio
import logging
import json
from typing import Dict, List, Callable, Any
from enum import Enum
from datetime import datetime
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
${hasMcpTools ? `from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters` : 'from google.adk.tools import google_search'}
${hasLangfuse ? 'from langfuse import Langfuse' : ''}
${hasMemory ? 'from mem0 import Memory' : ''}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class EventType(Enum):
    """Event types for better categorization"""
    ${eventTypes.map(type => `${type.toUpperCase()} = "${type}"`).join('\n    ')}

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
        ${eventHandlingConfig.historyEnabled ? 'self.event_history.append(event_data)' : '# Event history disabled'}
        
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
${listeners.user_message !== false ? `async def on_user_message(event_data: Dict):
    """Handle user message events"""
    logger.info(f"📨 User message: {event_data['data'].get('content', 'N/A')}")` : ''}

${listeners.agent_response !== false ? `async def on_agent_response(event_data: Dict):
    """Handle agent response events"""
    logger.info(f"🤖 Agent responded: {event_data['data'].get('content', 'N/A')}")` : ''}

${listeners.tool_call !== false ? `async def on_tool_call(event_data: Dict):
    """Handle tool call events"""
    tool_name = event_data['data'].get('tool_name', 'Unknown')
    logger.info(f"🛠️ Tool called: {tool_name}")` : ''}

${listeners.error !== false ? `async def on_error(event_data: Dict):
    """Handle error events"""
    error = event_data['data'].get('error', 'Unknown error')
    logger.error(f"❌ Error occurred: {error}")` : ''}

# Middleware
${middleware.includes('logging_middleware') ? `async def logging_middleware(event_data: Dict) -> Dict:
    """Log all events"""
    logger.debug(f"Event: {event_data['type']} at {event_data['timestamp']}")
    return event_data` : ''}

${middleware.includes('analytics_middleware') ? `async def analytics_middleware(event_data: Dict) -> Dict:
    """Add analytics data"""
    event_data['analytics'] = {
        'processed_at': datetime.now().isoformat(),
        'user_agent': '${agentName}/1.0'
    }
    return event_data` : ''}

def create_root_agent():
    """Create and return the root agent instance with event handling."""
    # Load environment variables from both locations
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

    # Configure Google AI client
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY environment variable is not set")

${hasLangfuse ? `    # Initialize Langfuse
    langfuse_secret_key = os.getenv('LANGFUSE_SECRET_KEY')
    langfuse_public_key = os.getenv('LANGFUSE_PUBLIC_KEY')
    langfuse_host = os.getenv('LANGFUSE_HOST', '${langfuseConfig?.host}')
    
    if langfuse_secret_key and langfuse_public_key:
        langfuse = Langfuse(
            secret_key=langfuse_secret_key,
            public_key=langfuse_public_key,
            host=langfuse_host
        )
        logger.info("Langfuse initialized successfully")
    else:
        logger.warning("Langfuse credentials not found in environment variables")
        langfuse = None` : ''}

${hasMemory ? `    # Initialize Mem0 Memory
    mem0_api_key = os.getenv('MEM0_API_KEY')
    mem0_host = os.getenv('MEM0_HOST', '${memoryConfig?.host}')
    mem0_user_id = os.getenv('MEM0_USER_ID', '${memoryConfig?.userId}')
    
    if mem0_api_key:
        os.environ["MEM0_API_KEY"] = mem0_api_key
        memory = Memory()
        logger.info("Mem0 memory initialized successfully")
    else:
        logger.warning("Mem0 API key not found in environment variables")
        memory = None` : ''}

    # Initialize Google AI client
    genai_client = genai.Client(api_key=GOOGLE_API_KEY)

${hasMcpTools ? `    # MCP Configuration${dedupedConfigs.map((config, idx) => {
    const packageName = config.smitheryMcp?.split('/').pop() || `mcp_${idx}`;
    const envKey = `SMITHERY_API_KEY`;
    return `
    ${envKey.toLowerCase()}_key = os.getenv('${envKey}')
    if not ${envKey.toLowerCase()}_key:
        raise ValueError("${envKey} environment variable is not set")`;
  }).join('')}` : ''}

    # Create event handling enhanced agent with FIXED parameter order
    return LlmAgent(
        name='${agentName}',
        model='gemini-2.0-flash',
        description="${agentDescription}",
        instruction="""${agentInstruction}${hasMcpTools ? `

Available functions through MCP:
${dedupedConfigs.map(config => `- ${config.smitheryMcp} tools for ${config.availableFunctions || 'operations'}`).join('\n')}` : ''}

EVENT HANDLING FEATURES:
- Comprehensive event tracking for all agent interactions
- Real-time event monitoring and logging
- Event history for debugging and analytics
- Middleware support for custom event processing

IMPORTANT RULES:
1. All interactions are automatically tracked through event handling
2. Use available tools to perform requested operations
3. Provide clear explanations for actions taken
4. Handle errors gracefully with automatic error event tracking${hasMcpTools ? `
5. Use the available MCP tools to perform requested operations
6. Always provide clear explanations for actions taken
7. Handle errors gracefully and provide helpful feedback` : ''}""",
        tools=[
${hasMcpTools ? dedupedConfigs.map((config, idx) => {
            const packageName = config.smitheryMcp?.split('/').pop() || `mcp_${idx}`;
            const fixedArgs = [...config.args];
            if (config.smitheryMcp) {
              const runIndex = fixedArgs.indexOf('run');
              if (runIndex !== -1 && runIndex + 1 < fixedArgs.length) {
                fixedArgs[runIndex + 1] = config.smitheryMcp;
              }
            }
            if (!fixedArgs.includes('--key')) {
              fixedArgs.push('--key', 'smithery_api_key_key');
            }
            
            return `            MCPToolset(
                connection_params=StdioServerParameters(
                    command="${config.command}",
                    args=[
${fixedArgs.map(arg => `                        "${arg}"`).join(',\n')}
                    ]
                )
            )`;
          }).join(',\n') : '            google_search'}
        ]
    )

# Create the root agent instance
root_agent = create_root_agent()

# Global event handler
event_handler = EventHandler()

# Setup event listeners
${listeners.user_message !== false ? 'event_handler.add_listener(EventType.USER_MESSAGE, on_user_message)' : ''}
${listeners.agent_response !== false ? 'event_handler.add_listener(EventType.AGENT_RESPONSE, on_agent_response)' : ''}
${listeners.tool_call !== false ? 'event_handler.add_listener(EventType.TOOL_CALL, on_tool_call)' : ''}
${listeners.error !== false ? 'event_handler.add_listener(EventType.ERROR, on_error)' : ''}

# Setup middleware
${middleware.includes('logging_middleware') ? 'event_handler.add_middleware(logging_middleware)' : ''}
${middleware.includes('analytics_middleware') ? 'event_handler.add_middleware(analytics_middleware)' : ''}

${hasLangfuse ? `def track_conversation(conversation_id, user_id, message):
    """Track conversation interactions with Langfuse."""
    try:
        langfuse_secret_key = os.getenv('LANGFUSE_SECRET_KEY')
        langfuse_public_key = os.getenv('LANGFUSE_PUBLIC_KEY')
        langfuse_host = os.getenv('LANGFUSE_HOST', '${langfuseConfig?.host}')
        
        if langfuse_secret_key and langfuse_public_key:
            langfuse = Langfuse(
                secret_key=langfuse_secret_key,
                public_key=langfuse_public_key,
                host=langfuse_host
            )
            
            langfuse.track_event(
                event_name="conversation_interaction",
                properties={
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "message": message,
                    "project": "${langfuseConfig?.projectName}",
                    "agent_name": "${agentName}"
                }
            )
            logger.info(f"Tracked conversation interaction for user {user_id}")
        else:
            logger.warning("Langfuse tracking skipped - credentials not configured")
    except Exception as e:
        logger.error(f"Failed to track conversation: {e}")` : ''}

${hasMemory ? `def add_to_memory(user_message: str, assistant_response: str, user_id: str = "${memoryConfig?.userId}", metadata: dict = None):
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
                "agent": "${agentName}",
                "memory_type": "${memoryConfig?.memoryType}",
                "timestamp": json.dumps({"created": "now"}),
                **(metadata or {})
            }
        )
        logger.info(f"Added conversation to memory for user {user_id}")
        return result
    except Exception as e:
        logger.error(f"Failed to add to memory: {e}")
        return []` : ''}

async def process_agent_events():
    """Enhanced event processing with comprehensive handling"""
    user_id = "user"
    session_service = InMemorySessionService()
    runner = Runner(agent=root_agent, session_service=session_service, app_name="${agentName}")
    
    # FIXED: Use async session creation with correct parameters
    session = await session_service.create_session(app_name="${agentName}", user_id=user_id)
    session_id = session.id
    
    # Emit session start event
    await event_handler.emit_event(EventType.SESSION_START, {
        'session_id': session_id,
        'user_id': user_id
    })
    
    # Sample conversations with event tracking
    messages = [
        "Hello, can you help me?",
        "What tools are available to you?",
        "Can you demonstrate your capabilities?"
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
${hasLangfuse ? `            # Track with Langfuse if enabled
            track_conversation("session", "user", str(event.content))` : ''}
${hasMemory ? `            # Add to memory if enabled
            add_to_memory("user_input", str(event.content), "user")` : ''}
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

${eventHandlingConfig.analyticsEnabled ? `async def show_event_summary():
    """Display event summary and statistics"""
    print("\\n" + "="*60)
    print("📊 EVENT SUMMARY")
    print("="*60)
    
    # Event type counts
    event_counts = {}
    for event in event_handler.event_history:
        event_type = event['type']
        event_counts[event_type] = event_counts.get(event_type, 0) + 1
    
    for event_type, count in event_counts.items():
        print(f"  {event_type}: {count} events")
    
    print(f"\\n  Total Events: {len(event_handler.event_history)}")
    print(f"  Active Listeners: {sum(len(listeners) for listeners in event_handler.listeners.values())}")
    print(f"  Middleware: {len(event_handler.middleware)}")` : ''}

async def main():
    """Main execution with comprehensive event handling"""
    print("🚀 Starting ${agentName} with Enhanced Event Handling")
    print("-" * 60)
    
    try:
        await process_agent_events()
        ${eventHandlingConfig.analyticsEnabled ? 'await show_event_summary()' : ''}
        
    except KeyboardInterrupt:
        await event_handler.emit_event(EventType.ERROR, {
            'error': 'User interrupted execution'
        })
        print("\\n⏹️ Agent stopped by user")
    except Exception as e:
        await event_handler.emit_event(EventType.ERROR, {
            'error': f'Unexpected error: {str(e)}'
        })
        print(f"\\n❌ Error: {e}")
    finally:
        print("\\n✅ Agent execution completed")

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent", "event_handler"${hasLangfuse ? ', "track_conversation"' : ''}${hasMemory ? ', "add_to_memory"' : ''}]
`;
}

// Generate Memory-enabled code for agents  
export function generateMemoryCode(nodes: Node<BaseNodeData>[], memoryConfig: MemoryConfig, langfuseConfig?: LangfuseConfig, mcpConfigs?: MCPConfig[]): string {
  const agentNode = nodes.find(n => n.data.type === 'agent');
  if (!agentNode) {
    return generateDefaultMemoryAgentCode(memoryConfig);
  }

  const agentName = agentNode.data.label?.replace(/[^a-zA-Z0-9_]/g, '_') || 'MemoryAgent';
  const agentDescription = agentNode.data.description || 'Memory-enabled agent with persistent context and learning';
  const agentInstruction = agentNode.data.instruction || agentNode.data.prompt ||
    "You are a helpful assistant with memory capabilities for personalized and context-aware responses.";

  // Check if we also have Langfuse or MCP tools
  const hasLangfuse = langfuseConfig && langfuseConfig.enabled;
  const hasMcpTools = mcpConfigs && mcpConfigs.length > 0;
  const dedupedConfigs = hasMcpTools ? dedupeConfigs(mcpConfigs) : [];

  return `"""${agentName} with Mem0 Memory Integration"""
import os
import asyncio
import logging
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
${hasMcpTools ? `from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters` : 'from google.adk.tools import google_search'}
${hasLangfuse ? 'from langfuse import Langfuse' : ''}
from mem0 import Memory

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def create_root_agent():
    """Create and return the root agent instance with memory integration."""
    # Load environment variables from both locations
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

    # Configure Google AI client
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY environment variable is not set")

    # Initialize Mem0 Memory
    mem0_api_key = os.getenv('MEM0_API_KEY')
    mem0_host = os.getenv('MEM0_HOST', '${memoryConfig.host}')
    mem0_user_id = os.getenv('MEM0_USER_ID', '${memoryConfig.userId}')
    
    if mem0_api_key:
        os.environ["MEM0_API_KEY"] = mem0_api_key
        memory = Memory()
        logger.info("Mem0 memory initialized successfully")
    else:
        logger.warning("Mem0 API key not found in environment variables. Please set MEM0_API_KEY")
        memory = None

${hasLangfuse ? `    # Initialize Langfuse
    langfuse_secret_key = os.getenv('LANGFUSE_SECRET_KEY')
    langfuse_public_key = os.getenv('LANGFUSE_PUBLIC_KEY')
    langfuse_host = os.getenv('LANGFUSE_HOST', '${langfuseConfig?.host}')
    
    if langfuse_secret_key and langfuse_public_key:
        langfuse = Langfuse(
            secret_key=langfuse_secret_key,
            public_key=langfuse_public_key,
            host=langfuse_host
        )
        logger.info("Langfuse initialized successfully")
    else:
        logger.warning("Langfuse credentials not found in environment variables")
        langfuse = None` : ''}

    # Initialize Google AI client
    genai_client = genai.Client(api_key=GOOGLE_API_KEY)

${hasMcpTools ? `    # MCP Configuration${dedupedConfigs.map((config, idx) => {
    const packageName = config.smitheryMcp?.split('/').pop() || `mcp_${idx}`;
    const envKey = `SMITHERY_API_KEY`;
    return `
    ${envKey.toLowerCase()}_key = os.getenv('${envKey}')
    if not ${envKey.toLowerCase()}_key:
        raise ValueError("${envKey} environment variable is not set")`;
  }).join('')}` : ''}

    # Create memory-enhanced agent with context injection
    def get_memory_enhanced_instruction(user_id: str = "${memoryConfig.userId}") -> str:
        """Get instruction enhanced with user's memory context."""
        base_instruction = """${agentInstruction}${hasMcpTools ? `

Available functions through MCP:
${dedupedConfigs.map(config => `- ${config.smitheryMcp} tools for ${config.availableFunctions || 'operations'}`).join('\n')}` : ''}

MEMORY INTEGRATION:
- You have access to persistent memory to remember user preferences and context
- Always consider relevant memories when responding to provide personalized assistance
- Learn from interactions to improve future responses

IMPORTANT RULES:
1. Use memory to provide personalized and context-aware responses
2. Remember important user preferences and information
3. Learn from successful interactions and user feedback${hasMcpTools ? `
4. Use the available MCP tools to perform requested operations
5. Always provide clear explanations for actions taken
6. Handle errors gracefully and provide helpful feedback` : ''}"""
        
        if memory:
            try:
                # Retrieve relevant memories for context
                memories = memory.search(f"user preferences and context", user_id=user_id, limit=5)
                memory_context = "\\n".join([f"- {m['memory']}" for m in memories.get('results', [])])
                
                if memory_context:
                    return f"{base_instruction}\\n\\nRelevant Context from Memory:\\n{memory_context}"
            except Exception as e:
                logger.error(f"Failed to retrieve memories: {e}")
        
        return base_instruction

    return LlmAgent(
        name='${agentName}',
        model='gemini-2.0-flash',
        description="${agentDescription}",
        instruction=get_memory_enhanced_instruction(),
        tools=[
${hasMcpTools ? dedupedConfigs.map((config, idx) => {
            const packageName = config.smitheryMcp?.split('/').pop() || `mcp_${idx}`;
            const fixedArgs = [...config.args];
            if (config.smitheryMcp) {
              const runIndex = fixedArgs.indexOf('run');
              if (runIndex !== -1 && runIndex + 1 < fixedArgs.length) {
                fixedArgs[runIndex + 1] = config.smitheryMcp;
              }
            }
            if (!fixedArgs.includes('--key')) {
              fixedArgs.push('--key', 'smithery_api_key_key');
            }
            
            return `            MCPToolset(
                connection_params=StdioServerParameters(
                    command="${config.command}",
                    args=[
${fixedArgs.map(arg => `                        "${arg}"`).join(',\n')}
                    ]
                )
            )`;
          }).join(',\n') : '            google_search'}
        ]
    )

# Create the root agent instance
root_agent = create_root_agent()

def add_to_memory(user_message: str, assistant_response: str, user_id: str = "${memoryConfig.userId}", metadata: dict = None):
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
                "agent": "${agentName}",
                "memory_type": "${memoryConfig.memoryType}",
                "timestamp": json.dumps({"created": "now"}),
                **(metadata or {})
            }
        )
        logger.info(f"Added conversation to memory for user {user_id}")
        return result
    except Exception as e:
        logger.error(f"Failed to add to memory: {e}")
        return []

def get_relevant_memories(query: str, user_id: str = "${memoryConfig.userId}", limit: int = 5):
    """Retrieve relevant memories for a query."""
    if not memory:
        return []
    
    try:
        result = memory.search(query, user_id=user_id, limit=limit)
        return result.get('results', [])
    except Exception as e:
        logger.error(f"Failed to search memories: {e}")
        return []

async def run_with_memory(user_message: str, user_id: str = "${memoryConfig.userId}"):
    """Enhanced run function with memory integration."""
    
    # Create session with FIXED Runner constructor
    session_service = InMemorySessionService()
    runner = Runner(
        agent=root_agent,
        session_service=session_service,
        app_name='${agentName}_app'
    )
    
    try:
        # FIXED: Use async session creation with correct parameters
        session = await session_service.create_session(
            app_name='${agentName}_app',
            user_id=user_id
        )
        
        # Create message
        new_message = types.Content(
            role="user",
            parts=[types.Part(text=user_message)]
        )
        
        response_content = ""
        
        # Run agent and collect response
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session.id,
            new_message=new_message
        ):
            if hasattr(event, 'content') and event.content:
                response_content += str(event.content)
            print(event)
        
        # Add conversation to memory for learning
        add_to_memory(user_message, response_content, user_id)
        
        return response_content
    finally:
        if hasattr(root_agent, '_exit_stack'):
            await root_agent._exit_stack.aclose()

async def main():
    """Run the memory-enabled agent."""
    # Example usage with memory
    await run_with_memory("Hello, I'm interested in learning about AI agents", "${memoryConfig.userId}")
    await run_with_memory("I prefer concise technical explanations", "${memoryConfig.userId}")  # Will remember this preference
    await run_with_memory("Can you help me with my project?", "${memoryConfig.userId}")  # Will use remembered preferences

if __name__ == '__main__':
    asyncio.run(main())

# Export the agent and memory functions
__all__ = ['root_agent', 'add_to_memory', 'get_relevant_memories', 'run_with_memory']
`;
}

// Generate default event handling agent code
export function generateDefaultEventHandlingAgentCode(eventHandlingConfig: EventHandlingConfig): string {
  const eventTypes = eventHandlingConfig.eventTypes || ['user_message', 'agent_response', 'tool_call', 'error'];
  const middleware = eventHandlingConfig.middleware || ['logging_middleware'];
  const listeners = eventHandlingConfig.listeners || {};

  return `"""Default Event Handling Agent"""
import os
import asyncio
import logging
import json
from typing import Dict, List, Callable, Any
from enum import Enum
from datetime import datetime
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools import google_search

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("event_handling_agent")

class EventType(Enum):
    """Event types for better categorization"""
    ${eventTypes.map(type => `${type.toUpperCase()} = "${type}"`).join('\n    ')}

class EventHandler:
    """Event handler with callback management"""
    
    def __init__(self):
        self.listeners: Dict[EventType, List[Callable]] = {event_type: [] for event_type in EventType}
        self.event_history: List[Dict] = []
        self.middleware: List[Callable] = []
    
    def add_listener(self, event_type: EventType, callback: Callable):
        """Register an event listener"""
        self.listeners[event_type].append(callback)
        logger.info(f"Added listener for {event_type.value}")
    
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
        ${eventHandlingConfig.historyEnabled ? 'self.event_history.append(event_data)' : '# Event history disabled'}
        
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
${listeners.user_message !== false ? `async def on_user_message(event_data: Dict):
    """Handle user message events"""
    logger.info(f"📨 User message: {event_data['data'].get('content', 'N/A')}")` : ''}

${listeners.agent_response !== false ? `async def on_agent_response(event_data: Dict):
    """Handle agent response events"""
    logger.info(f"🤖 Agent responded: {event_data['data'].get('content', 'N/A')}")` : ''}

${listeners.tool_call !== false ? `async def on_tool_call(event_data: Dict):
    """Handle tool call events"""
    tool_name = event_data['data'].get('tool_name', 'Unknown')
    logger.info(f"🛠️ Tool called: {tool_name}")` : ''}

${listeners.error !== false ? `async def on_error(event_data: Dict):
    """Handle error events"""
    error = event_data['data'].get('error', 'Unknown error')
    logger.error(f"❌ Error occurred: {error}")` : ''}

# Middleware
${middleware.includes('logging_middleware') ? `async def logging_middleware(event_data: Dict) -> Dict:
    """Log all events"""
    logger.debug(f"Event: {event_data['type']} at {event_data['timestamp']}")
    return event_data` : ''}

${middleware.includes('analytics_middleware') ? `async def analytics_middleware(event_data: Dict) -> Dict:
    """Add analytics data"""
    event_data['analytics'] = {
        'processed_at': datetime.now().isoformat(),
        'user_agent': 'EventHandlingAgent/1.0'
    }
    return event_data` : ''}

# Load environment variables
load_dotenv()

# Create the event handling agent
root_agent = Agent(
    name="event_handling_agent",
    model="gemini-2.0-flash",
    description="Agent with comprehensive event handling for monitoring and analytics",
    instruction="Use Google Search to find information and automatically track all interactions through event handling.",
    tools=[google_search]
)

# Global event handler
event_handler = EventHandler()

# Setup event listeners
${listeners.user_message !== false ? 'event_handler.add_listener(EventType.USER_MESSAGE, on_user_message)' : ''}
${listeners.agent_response !== false ? 'event_handler.add_listener(EventType.AGENT_RESPONSE, on_agent_response)' : ''}
${listeners.tool_call !== false ? 'event_handler.add_listener(EventType.TOOL_CALL, on_tool_call)' : ''}
${listeners.error !== false ? 'event_handler.add_listener(EventType.ERROR, on_error)' : ''}

# Setup middleware
${middleware.includes('logging_middleware') ? 'event_handler.add_middleware(logging_middleware)' : ''}
${middleware.includes('analytics_middleware') ? 'event_handler.add_middleware(analytics_middleware)' : ''}

# Enhanced agent wrapper with event handling
class EventHandlingAgent:
    def __init__(self, agent):
        self.agent = agent
    
    async def chat_with_events(self, message: str):
        """Chat with automatic event tracking"""
        try:
            # Emit user message event
            await event_handler.emit_event(EventType.USER_MESSAGE, {
                'content': message
            })
            
            # Get response from agent
            response = self.agent.chat(message)
            
            # Emit agent response event
            await event_handler.emit_event(EventType.AGENT_RESPONSE, {
                'content': str(response)
            })
            
            return response
        except Exception as e:
            # Emit error event
            await event_handler.emit_event(EventType.ERROR, {
                'error': str(e),
                'message': message
            })
            logger.error(f"Error in event handling chat: {e}")
            # Fallback to regular chat
            return self.agent.chat(message)

# Create event handling enabled agent
event_agent = EventHandlingAgent(root_agent)

${eventHandlingConfig.analyticsEnabled ? `def show_event_summary():
    """Display event summary and statistics"""
    print("\\n" + "="*60)
    print("📊 EVENT SUMMARY")
    print("="*60)
    
    # Event type counts
    event_counts = {}
    for event in event_handler.event_history:
        event_type = event['type']
        event_counts[event_type] = event_counts.get(event_type, 0) + 1
    
    for event_type, count in event_counts.items():
        print(f"  {event_type}: {count} events")
    
    print(f"\\n  Total Events: {len(event_handler.event_history)}")
    print(f"  Active Listeners: {sum(len(listeners) for listeners in event_handler.listeners.values())}")
    print(f"  Middleware: {len(event_handler.middleware)}")` : ''}

__all__ = ["root_agent", "event_handler", "event_agent"${eventHandlingConfig.analyticsEnabled ? ', "show_event_summary"' : ''}]

if __name__ == "__main__":
    try:
        async def main():
            response = await event_agent.chat_with_events("Hello, I'm testing event handling")
            print("Agent Response:", response)
            ${eventHandlingConfig.analyticsEnabled ? 'show_event_summary()' : ''}
        
        asyncio.run(main())
    except Exception as e:
        logger.error(f"Error running agent: {e}")
        raise`;
}

// Generate default memory agent code
export function generateDefaultMemoryAgentCode(memoryConfig: MemoryConfig): string {
  return `"""Default Memory-Enabled Agent"""
import os
import logging
import json
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools import google_search
from mem0 import Memory

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("memory_agent")

# Load environment variables
load_dotenv()

# Initialize Mem0 Memory
mem0_api_key = os.getenv("MEM0_API_KEY")
mem0_host = os.getenv("MEM0_HOST", "${memoryConfig.host}")
mem0_user_id = os.getenv("MEM0_USER_ID", "${memoryConfig.userId}")

if not mem0_api_key:
    logger.warning("Mem0 API key not found. Memory features will be disabled.")
    memory = None
else:
    os.environ["MEM0_API_KEY"] = mem0_api_key
    memory = Memory()
    logger.info("Mem0 memory initialized successfully")

# Create the memory-enhanced agent
root_agent = Agent(
    name="memory_agent",
    model="gemini-2.0-flash",
    description="Agent with persistent memory for personalized responses and learning",
    instruction="Use Google Search to find information and remember user preferences and context for personalized assistance.",
    tools=[google_search]
)

# Memory functions
def add_conversation_to_memory(user_input: str, agent_response: str, user_id: str = "${memoryConfig.userId}"):
    """Add conversation to memory for learning"""
    if memory:
        try:
            conversation = [
                {"role": "user", "content": user_input},
                {"role": "assistant", "content": agent_response}
            ]
            result = memory.add(conversation, user_id=user_id, metadata={
                "agent_name": "memory_agent",
                "memory_type": "${memoryConfig.memoryType}",
                "timestamp": json.dumps({"created": "now"})
            })
            return result
        except Exception as e:
            logger.error(f"Failed to add conversation to memory: {e}")
            return []
    return []

def get_user_context(user_id: str = "${memoryConfig.userId}", limit: int = 5):
    """Get relevant user context from memory"""
    if memory:
        try:
            result = memory.search(f"user preferences and context", user_id=user_id, limit=limit)
            return result.get('results', [])
        except Exception as e:
            logger.error(f"Failed to retrieve user context: {e}")
    return []

# Enhanced agent wrapper with memory
class MemoryAgent:
    def __init__(self, agent):
        self.agent = agent
    
    def chat_with_memory(self, message: str, user_id: str = "${memoryConfig.userId}"):
        """Chat with memory integration"""
        try:
            # Get user context from memory
            context = get_user_context(user_id)
            context_info = "\\n".join([f"- {m['memory']}" for m in context])
            
            # Enhance message with context if available
            if context_info:
                enhanced_message = f"{message}\\n\\nRelevant context: {context_info}"
            else:
                enhanced_message = message
            
            # Get response from agent
            response = self.agent.chat(enhanced_message)
            
            # Add conversation to memory
            add_conversation_to_memory(message, str(response), user_id)
            
            return response
        except Exception as e:
            logger.error(f"Error in memory chat: {e}")
            # Fallback to regular chat
            return self.agent.chat(message)

# Create memory-enabled agent
memory_agent = MemoryAgent(root_agent)

__all__ = ["root_agent", "memory_agent", "add_conversation_to_memory", "get_user_context"]

if __name__ == "__main__":
    try:
        response = memory_agent.chat_with_memory("Hello, I'm interested in AI and machine learning")
        print("Agent Response:", response)
    except Exception as e:
        logger.error(f"Error running agent: {e}")
        raise`;
}

// Generate MCP code for agents
export function generateMCPCode(nodes: Node<BaseNodeData>[], mcpConfigs: MCPConfig[]): string {
  const agentNode = nodes.find(n => n.data.type === 'agent');
  if (!agentNode) {
    return generateDefaultSearchAgentCode();
  }

  const agentName = agentNode.data.label?.toLowerCase().replace(/\s+/g, '_') || 'mcp_agent';
  const agentDescription = agentNode.data.description || 'MCP-enabled agent';
  const agentInstruction = agentNode.data.instruction || agentNode.data.prompt ||
    "You are a helpful assistant that can use MCP tools to assist users.";

  const toolsets: string[] = [];
  const toolsetNames: string[] = [];
const uniqueConfigs = dedupeConfigs(mcpConfigs);
uniqueConfigs.forEach((cfg, idx) => {
  const mcpPackage = cfg.smitheryMcp || cfg.args.find(arg => arg.startsWith('@')) || '@smithery/mcp-example';
  const packageName = mcpPackage.split('/').pop() || `mcp_${idx}`;
  const varName = varNameFromPackage(mcpPackage, idx);

    console.log('Generating MCP code with config:', {
      index: idx,
      command: cfg.command,
      args: cfg.args,
      envVars: cfg.envVars,
      smitheryMcp: cfg.smitheryMcp,
      smitheryApiKey: cfg.smitheryApiKey,
      extractedMcpPackage: mcpPackage,
      packageName
    });

    const fixedArgs = [...cfg.args];
    if (cfg.smitheryMcp) {
      const runIndex = fixedArgs.indexOf('run');
      if (runIndex !== -1 && runIndex + 1 < fixedArgs.length) {
        fixedArgs[runIndex + 1] = cfg.smitheryMcp;
      } else if (runIndex !== -1) {
        fixedArgs.splice(runIndex + 1, 0, cfg.smitheryMcp);
      }
    }
    if (!fixedArgs.includes('--key')) {
      fixedArgs.push('--key', 'smithery_api_key');
    } else {
      const keyIndex = fixedArgs.indexOf('--key');
      if (keyIndex !== -1 && (keyIndex + 1 >= fixedArgs.length || fixedArgs[keyIndex + 1] === '--key')) {
        fixedArgs[keyIndex + 1] = 'smithery_api_key';
      }
    }
    
    // Add profile parameter if provided
    if (cfg.profileId && !fixedArgs.includes('--profile')) {
      fixedArgs.push('--profile', cfg.profileId);
    }

    const toolset = `# MCP toolset configuration for ${packageName}
${varName} = MCPToolset(
    connection_params=StdioServerParameters(
        command="${cfg.command}",
        args=${JSON.stringify(fixedArgs).replace('"smithery_api_key"', 'smithery_api_key').replace(/"\*\*\*.*?\*\*\*"/g, 'smithery_api_key')},
        env=${JSON.stringify({ ...cfg.envVars, "SMITHERY_API_KEY": "smithery_api_key" }).replace('"smithery_api_key"', 'smithery_api_key')}
    )
)`;

    toolsets.push(toolset);
    toolsetNames.push(varName);
  });

  const toolsetList = toolsetNames.join(', ');

  return `"""${agentName} MCP Agent"""
import os
import asyncio
import logging
import json
import base64
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def create_root_agent():
    """Create and return the root agent instance."""
    # Load environment variables from both locations
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

    # Configure Google AI client
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY environment variable is not set")

    # Initialize Google AI client
    genai_client = genai.Client(api_key=GOOGLE_API_KEY)

    # MCP Configuration
    smithery_api_key = os.getenv('SMITHERY_API_KEY')
    if not smithery_api_key:
        raise ValueError("SMITHERY_API_KEY environment variable is not set")

    # Create MCP-enabled agent with FIXED parameter order
    return LlmAgent(
        name='${agentName}',
        model='gemini-2.0-flash',
        description="${agentDescription}",
        instruction="""${agentInstruction}

Available functions through MCP:
${uniqueConfigs.map(config => `- ${config.smitheryMcp} tools for ${config.availableFunctions || 'operations'}`).join('\n')}

IMPORTANT RULES:
1. Use the available MCP tools to perform requested operations
2. Always provide clear explanations for actions taken
3. Handle errors gracefully and provide helpful feedback""",
        tools=[
${uniqueConfigs.map((config, idx) => {
            const packageName = config.smitheryMcp?.split('/').pop() || `mcp_${idx}`;
            const fixedArgs = [...config.args];
            if (config.smitheryMcp) {
              const runIndex = fixedArgs.indexOf('run');
              if (runIndex !== -1 && runIndex + 1 < fixedArgs.length) {
                fixedArgs[runIndex + 1] = config.smitheryMcp;
              } else if (runIndex !== -1) {
                fixedArgs.splice(runIndex + 1, 0, config.smitheryMcp);
              }
            }
            if (!fixedArgs.includes('--key')) {
              fixedArgs.push('--key', 'smithery_api_key');
            }
            
            return `            MCPToolset(
                connection_params=StdioServerParameters(
                    command="${config.command}",
                    args=[
${fixedArgs.map(arg => `                        "${arg}"`).join(',\n')}
                    ]
                )
            )`;
          }).join(',\n')}
        ]
    )

# Create the root agent instance
root_agent = create_root_agent()

async def main():
    """Run the agent with FIXED async patterns."""
    session_service = InMemorySessionService()
    runner = Runner(
        agent=root_agent,
        session_service=session_service,
        app_name='${agentName}_app'
    )
    
    try:
        # FIXED: Use async session creation with correct parameters
        session = await session_service.create_session(
            app_name='${agentName}_app',
            user_id='${agentName}_user'
        )
        async for event in runner.run_async(
            user_id=session.user_id,
            session_id=session.id,
            new_message=types.Content(
                role='user',
                parts=[types.Part(text="Hello! How can you help me today?")]
            )
        ):
            print(event)
    finally:
        if hasattr(root_agent, '_exit_stack'):
            await root_agent._exit_stack.aclose()

if __name__ == '__main__':
    asyncio.run(main())

__all__ = ['root_agent']`;
}

// Generate default search agent code with Langfuse integration
export function generateDefaultSearchAgentCodeWithLangfuse(langfuseConfig: LangfuseConfig): string {
  return `"""Default Search Agent with Langfuse Analytics"""
import os
import logging
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools import google_search
from langfuse import Langfuse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("search_agent")

# Load environment variables
load_dotenv()

# Initialize Langfuse for analytics
langfuse_public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
langfuse_secret_key = os.getenv("LANGFUSE_SECRET_KEY")
langfuse_host = os.getenv("LANGFUSE_HOST", "${langfuseConfig.host}")

if not langfuse_public_key or not langfuse_secret_key:
    logger.warning("Langfuse credentials not found. Analytics will be disabled.")
    langfuse = None
else:
    langfuse = Langfuse(
        public_key=langfuse_public_key,
        secret_key=langfuse_secret_key,
        host=langfuse_host
    )
    logger.info("Langfuse analytics initialized successfully")

# Create the agent
root_agent = Agent(
    name="search_agent",
    model="gemini-2.0-flash",
    description="Agent that performs web searches and provides accurate information with analytics",
    instruction="Use Google Search to find accurate and up-to-date information. Always cite your sources.",
    tools=[google_search]
)

# Analytics wrapper function
def track_conversation(user_input: str, agent_response: str, metadata: dict = None):
    """Track conversation with Langfuse analytics"""
    if langfuse:
        try:
            langfuse.trace(
                name="search_agent_conversation",
                input={"user_input": user_input},
                output={"agent_response": agent_response},
                metadata={
                    "agent_name": "search_agent",
                    "project": "${langfuseConfig.projectName}",
                    **(metadata or {})
                }
            )
        except Exception as e:
            logger.error(f"Failed to track conversation: {e}")

# Enhanced agent wrapper with analytics
class AnalyticsAgent:
    def __init__(self, agent):
        self.agent = agent
    
    def chat(self, message: str):
        """Chat with analytics tracking"""
        try:
            response = self.agent.chat(message)
            track_conversation(message, str(response))
            return response
        except Exception as e:
            logger.error(f"Error in agent chat: {e}")
            if langfuse:
                langfuse.trace(
                    name="agent_error",
                    input={"user_input": message},
                    output={"error": str(e)},
                    metadata={"agent_name": "search_agent", "project": "${langfuseConfig.projectName}"}
                )
            raise

# Create analytics-enabled agent
analytics_agent = AnalyticsAgent(root_agent)

__all__ = ["root_agent", "analytics_agent", "track_conversation"]

if __name__ == "__main__":
    try:
        response = analytics_agent.chat("What are the latest developments in AI?")
        print("Agent Response:", response)
    except Exception as e:
        logger.error(f"Error running agent: {e}")
        raise`;
}

// Generate default search agent code
export function generateDefaultSearchAgentCode(): string {
  return `"""Default Search Agent"""
import os
import logging
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools import google_search

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("search_agent")

# Load environment variables
load_dotenv()

# Create the agent - FIXED: Use correct parameter order and names
root_agent = Agent(
    name="search_agent",
    model="gemini-2.0-flash",
    description="Agent that performs web searches and provides accurate information",
    instruction="Use Google Search to find accurate and up-to-date information. Always cite your sources.",
    tools=[google_search]
)

__all__ = ["root_agent"]

if __name__ == "__main__":
    try:
        response = root_agent.chat("What are the latest developments in AI?")
        print("Agent Response:", response)
    except Exception as e:
        logger.error(f"Error running agent: {e}")
        raise`;
}

// Helper function to detect MCP code
export function isMcpCode(code: string): boolean {
  const mcpIndicators = [
    'MCPToolset',
    'StdioServerParameters',
    'LlmAgent',
    'Runner',
    'InMemorySessionService'
  ];
  
  return mcpIndicators.some(indicator => code.includes(indicator));
}

// Generate fallback MCP code
export function generateFallbackMcpCode(mcpPackage?: string): string {
  const packageToUse = mcpPackage || '@smithery/mcp-example';
  const defaultConfig: MCPConfig = {
    enabled: true,
    type: 'smithery',
    command: 'npx',
    args: ['-y', '@smithery/cli@latest', 'run', packageToUse, '--key', 'smithery_api_key'],
    envVars: { 'NODE_OPTIONS': '--no-warnings --experimental-fetch', 'SMITHERY_API_KEY': 'smithery_api_key' },
    smitheryMcp: packageToUse
  };

  return generateMCPCode([], [defaultConfig]);
}

// Generate ADK code (compatibility function)
export function generateADKCode(nodes: Node<BaseNodeData>[], _edges: Edge[], mcpConfigs?: MCPConfig[]): string {
  // Check for Event Handling nodes first (highest priority for comprehensive monitoring)
  const eventHandlingConfig = extractEventHandlingConfigFromNodes(nodes);
  
  // Check for Memory nodes (second priority)
  const memoryConfig = extractMemoryConfigFromNodes(nodes);
  
  // Check for Langfuse nodes
  const langfuseConfig = extractLangfuseConfigFromNodes(nodes);
  
  // Check if there are MCP nodes to determine if we should use MCP
  const mcpNodes = nodes.filter(node =>
    node.data.type === 'mcp-client' ||
    node.data.type === 'mcp-server' ||
    node.data.type === 'mcp-tool'
  );

  // Debug logging
  console.log('generateADKCode called with:', {
    totalNodes: nodes.length,
    eventHandlingConfig: eventHandlingConfig ? 'detected' : 'none',
    memoryConfig: memoryConfig ? 'detected' : 'none',
    langfuseConfig: langfuseConfig ? 'detected' : 'none',
    mcpNodes: mcpNodes.length,
    mcpConfigs: mcpConfigs ? mcpConfigs.length : 0,
    nodeTypes: nodes.map(n => ({ id: n.id, type: n.data.type, label: n.data.label }))
  });

  // If we have Event Handling configuration, use Event Handling-enabled code generation (highest priority)
  if (eventHandlingConfig) {
    console.log('Generating Event Handling-enabled code');
    
    if (mcpConfigs && mcpConfigs.length > 0) {
      console.log('Using provided MCP configs with Event Handling');
      return generateEventHandlingCode(nodes, eventHandlingConfig, langfuseConfig, memoryConfig, dedupeConfigs(mcpConfigs));
    }
    
    if (mcpNodes.length > 0) {
      console.log('Creating MCP config from nodes for Event Handling');
      // Extract MCP packages from all MCP nodes
      const defaultConfigs: MCPConfig[] = mcpNodes.map(mcpNode => {
        const mcpPackage = (mcpNode.data.smitheryMcp as string) ||
                          (mcpNode.data.mcpToolId as string) ||
                          '@smithery/mcp-example';

        return {
          enabled: true,
          type: 'smithery',
          command: 'npx',
          args: ['-y', '@smithery/cli@latest', 'run', mcpPackage, '--key', 'smithery_api_key'],
          envVars: { 'NODE_OPTIONS': '--no-warnings --experimental-fetch', 'SMITHERY_API_KEY': 'smithery_api_key' },
          smitheryMcp: mcpPackage
        };
      });
      
      return generateEventHandlingCode(nodes, eventHandlingConfig, langfuseConfig, memoryConfig, dedupeConfigs(defaultConfigs));
    }
    
    console.log('Generating Event Handling-only code');
    return generateEventHandlingCode(nodes, eventHandlingConfig, langfuseConfig, memoryConfig);
  }

  // If we have Memory configuration, use Memory-enabled code generation (second priority)
  if (memoryConfig) {
    console.log('Generating Memory-enabled code');
    
    if (mcpConfigs && mcpConfigs.length > 0) {
      console.log('Using provided MCP configs with Memory');
      return generateMemoryCode(nodes, memoryConfig, langfuseConfig, dedupeConfigs(mcpConfigs));
    }
    
    if (mcpNodes.length > 0) {
      console.log('Creating MCP config from nodes for Memory');
      // Extract MCP packages from all MCP nodes
      const defaultConfigs: MCPConfig[] = mcpNodes.map(mcpNode => {
        const mcpPackage = (mcpNode.data.smitheryMcp as string) ||
                          (mcpNode.data.mcpToolId as string) ||
                          '@smithery/mcp-example';

        return {
          enabled: true,
          type: 'smithery',
          command: 'npx',
          args: ['-y', '@smithery/cli@latest', 'run', mcpPackage, '--key', 'smithery_api_key'],
          envVars: { 'NODE_OPTIONS': '--no-warnings --experimental-fetch', 'SMITHERY_API_KEY': 'smithery_api_key' },
          smitheryMcp: mcpPackage
        };
      });
      
      return generateMemoryCode(nodes, memoryConfig, langfuseConfig, dedupeConfigs(defaultConfigs));
    }
    
    console.log('Generating Memory-only code');
    return generateMemoryCode(nodes, memoryConfig, langfuseConfig);
  }

  // If we have Langfuse configuration, use Langfuse-enabled code generation
  if (langfuseConfig) {
    console.log('Generating Langfuse-enabled code');
    
    if (mcpConfigs && mcpConfigs.length > 0) {
      console.log('Using provided MCP configs with Langfuse');
      return generateLangfuseCode(nodes, langfuseConfig, dedupeConfigs(mcpConfigs));
    }
    
    if (mcpNodes.length > 0) {
      console.log('Creating MCP config from nodes for Langfuse');
      // Extract MCP packages from all MCP nodes
      const defaultConfigs: MCPConfig[] = mcpNodes.map(mcpNode => {
        const mcpPackage = (mcpNode.data.smitheryMcp as string) ||
                          (mcpNode.data.mcpToolId as string) ||
                          '@smithery/mcp-example';

        return {
          enabled: true,
          type: 'smithery',
          command: 'npx',
          args: ['-y', '@smithery/cli@latest', 'run', mcpPackage, '--key', 'smithery_api_key'],
          envVars: { 'NODE_OPTIONS': '--no-warnings --experimental-fetch', 'SMITHERY_API_KEY': 'smithery_api_key' },
          smitheryMcp: mcpPackage
        };
      });
      
      return generateLangfuseCode(nodes, langfuseConfig, dedupeConfigs(defaultConfigs));
    }
    
    console.log('Generating Langfuse-only code (no MCP)');
    return generateLangfuseCode(nodes, langfuseConfig);
  }

  // No special features, use standard generation
  console.log('No special features detected, using standard generation');
  
  if (mcpConfigs && mcpConfigs.length > 0) {
    console.log('Using provided MCP configs');
    return generateMCPCode(nodes, dedupeConfigs(mcpConfigs));
  }

  if (mcpNodes.length > 0) {
    console.log('Creating MCP config from nodes');
    // Extract MCP packages from all MCP nodes
    const defaultConfigs: MCPConfig[] = mcpNodes.map(mcpNode => {
      const mcpPackage = (mcpNode.data.smitheryMcp as string) ||
                        (mcpNode.data.mcpToolId as string) ||
                        '@smithery/mcp-example';

      return {
        enabled: true,
        type: 'smithery',
        command: 'npx',
        args: ['-y', '@smithery/cli@latest', 'run', mcpPackage, '--key', 'smithery_api_key'],
        envVars: { 'NODE_OPTIONS': '--no-warnings --experimental-fetch', 'SMITHERY_API_KEY': 'smithery_api_key' },
        smitheryMcp: mcpPackage
      };
    });
    
    return generateMCPCode(nodes, dedupeConfigs(defaultConfigs));
  }

  console.log('Generating default search agent code');
  return generateDefaultSearchAgentCode();
}

// Generate code with verification layer
export async function generateVerifiedCode(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  mcpEnabled: boolean = true,
  apiKey?: string,
  onProgress?: (progress: VerificationProgress) => void,
  mcpConfig?: MCPConfig[]
): Promise<string> {
  // Step 1: Generate initial code
  onProgress?.({
    step: "generation",
    progress: 20,
    message: "Generating initial code..."
  });

 const dedupedConfig = mcpConfig ? dedupeConfigs(mcpConfig) : undefined;
let generatedCode: string;
if (apiKey) {
  generatedCode = await generateCodeWithAI(nodes, edges, mcpEnabled, apiKey, dedupedConfig);
} else {
  generatedCode = generateADKCode(nodes, edges, dedupedConfig);
}

  // Step 2: Extract node data for verification
  const mcpNodes = nodes.filter(n =>
    n.data.type === 'mcp-client' ||
    n.data.type === 'mcp-server' ||
    n.data.type === 'mcp-tool'
  );
  const agentNodes = nodes.filter(n => n.data.type === 'agent');

  const mcpPackages = mcpNodes.map(n =>
    (n.data.smitheryMcp as string) ||
    (n.data.mcpToolId as string) ||
    '@smithery/mcp-example'
  );

  // Extract agent data
  const agentNode = agentNodes[0];
  const nodeData = {
    mcpPackage: mcpPackages,
    agentName: agentNode?.data.label as string,
    agentDescription: agentNode?.data.description as string,
    agentInstruction: agentNode?.data.instruction as string || agentNode?.data.prompt as string
  };

  // Step 3: Verify and fix code with node data
  onProgress?.({
    step: "verification",
    progress: 50,
    message: "Verifying code for known errors..."
  });

  const verificationResult = await verifyAndFixCode(generatedCode, onProgress, nodeData);

  // Step 4: Return fixed code
  onProgress?.({
    step: "complete",
    progress: 100,
    message: `Verification complete! ${verificationResult.errors.length} errors fixed.`
  });

  return verificationResult.fixedCode;
}

// Generate code using OpenAI/OpenRouter API based on node data
export async function generateCodeWithAI(
  nodes: Node<BaseNodeData>[],
  _edges: Edge[],
  mcpEnabled: boolean = true,
  apiKey?: string,
  mcpConfig?: MCPConfig[]
): Promise<string> {
  const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

  const dedupedConfig = mcpConfig ? dedupeConfigs(mcpConfig) : undefined;
  const langfuseConfig = extractLangfuseConfigFromNodes(nodes);
  const memoryConfig = extractMemoryConfigFromNodes(nodes);
  const eventHandlingConfig = extractEventHandlingConfigFromNodes(nodes);

  // Enhanced prompts for integrations
  if (eventHandlingConfig) {
    console.log('Event handling config detected, enhancing OpenRouter prompts with event handling integration');
  }
  if (memoryConfig) {
    console.log('Memory config detected, enhancing OpenRouter prompts with memory integration');
  }
  if (langfuseConfig) {
    console.log('Langfuse config detected, enhancing OpenRouter prompts with analytics integration');
  }

if (!apiKey) {
  console.warn('No API key provided, falling back to local generation');
  return generateADKCode(nodes, _edges, dedupedConfig);
}


  // Prepare node data for the AI prompt
  const nodeData = nodes.map(node => ({
    id: node.id,
    type: node.data.type,
    label: node.data.label,
    description: node.data.description || '',
    instruction: node.data.instruction || '',
    prompt: node.data.prompt || '',
    modelType: node.data.modelType || ''
  }));

  // Find agent nodes to get main configuration
  const agentNodes = nodes.filter(n => n.data.type === 'agent');
  const mcpNodes = nodes.filter(n =>
    n.data.type === 'mcp-client' ||
    n.data.type === 'mcp-server' ||
    n.data.type === 'mcp-tool'
  );

  // Detect active features for smart routing (same logic as template system)
  const hasLangfuse = !!langfuseConfig;
  const hasMemory = !!memoryConfig;
  const hasEventHandling = !!eventHandlingConfig;
  const hasMCP = mcpEnabled;
  
  // Count active features (excluding MCP since it can combine with others)
  const activeFeatures = [hasLangfuse, hasMemory, hasEventHandling].filter(Boolean).length;
  const isMultiFeature = activeFeatures > 1;
  
  console.log(`🔍 Feature Detection: MCP=${hasMCP}, Langfuse=${hasLangfuse}, Memory=${hasMemory}, Events=${hasEventHandling}, Active=${activeFeatures}, Multi=${isMultiFeature}`);

  // Create comprehensive system prompt based on detected node types with smart routing
  let systemPrompt;
  
  if (isMultiFeature) {
    // Multi-feature agent (Langfuse + Memory + Event Handling combinations)
    systemPrompt = `You are an expert Python developer specializing in Google ADK (Agent Development Kit) with multiple advanced features integration.

    GENERATE A MULTI-FEATURE AGENT COMBINING ALL DETECTED FEATURES:
    ${hasLangfuse ? '✓ Langfuse Analytics Integration' : ''}
    ${hasMemory ? '✓ Mem0 Memory Integration' : ''}
    ${hasEventHandling ? '✓ Event Handling System' : ''}
    ${hasMCP ? '✓ MCP (Model Context Protocol) Tools' : ''}

    CRITICAL: Create ONE comprehensive agent that integrates ALL features seamlessly.

    MULTI-FEATURE TEMPLATE STRUCTURE:
    """Agent Name - Multi-Feature Agent"""
    import os
    import asyncio
    import json
    from dotenv import load_dotenv
    from google.adk.agents import LlmAgent
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types
    ${hasMCP ? 'from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters' : ''}
    ${hasLangfuse ? 'from langfuse import Langfuse' : ''}
    ${hasMemory ? 'from mem0 import Memory' : ''}
    ${hasEventHandling ? 'from typing import Dict, List, Callable, Any\nfrom enum import Enum\nfrom datetime import datetime' : ''}

    # Load environment variables
    load_dotenv()

    # Check for required API keys
    if 'GOOGLE_API_KEY' not in os.environ:
        print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
        exit(1)

    INTEGRATION REQUIREMENTS:
    1. Initialize ALL detected features with proper environment variable checks
    2. Create unified setup functions that work together
    3. Integrate all features into the main agent instruction
    4. Include all feature functions in __all__ export
    5. Add proper tracking/memory/event calls in main() function
    6. Use exact LlmAgent parameter order: name, model, description, instruction, tools
    7. Ensure all features work together harmoniously

    SPECIFIC INTEGRATION PATTERNS:
    
    ${hasMCP ? `# MCP Integration (if MCP detected)
    smithery_api_key = os.getenv("SMITHERY_API_KEY")
    if not smithery_api_key:
        raise ValueError("SMITHERY_API_KEY environment variable is not set")
    
    # Create MCP toolsets for each package
    toolset_name = MCPToolset(
        connection_params=StdioServerParameters(
            command="command",
            args=["args", "--key", smithery_api_key],
            env={"NODE_OPTIONS": "--no-warnings --experimental-fetch", "SMITHERY_API_KEY": smithery_api_key}
        )
    )` : ''}

    ${hasLangfuse ? `# Langfuse Integration (if Analytics detected)
    langfuse = None
    if os.environ.get('LANGFUSE_PUBLIC_KEY') and os.environ.get('LANGFUSE_SECRET_KEY'):
        langfuse = Langfuse(
            public_key=os.environ.get('LANGFUSE_PUBLIC_KEY'),
            secret_key=os.environ.get('LANGFUSE_SECRET_KEY'),
            host=os.environ.get('LANGFUSE_HOST', 'https://cloud.langfuse.com')
        )
        print("✓ Langfuse analytics initialized")
    
    def track_conversation(conversation_id, user_id, metadata):
        if langfuse:
            langfuse.track_event(
                event_name="conversation_interaction",
                properties={
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    **metadata
                }
            )` : ''}

    ${hasMemory ? `# Memory Integration (if Memory detected)
    memory = None
    if os.environ.get('MEM0_API_KEY'):
        os.environ["MEM0_API_KEY"] = os.environ.get('MEM0_API_KEY')
        memory = Memory()
        print("✓ Mem0 memory initialized")
    
    def add_to_memory(user_message: str, assistant_response: str, user_id: str = "default_user", metadata: dict = None):
        if not memory:
            return []
        try:
            conversation = [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": assistant_response}
            ]
            result = memory.add(conversation, user_id=user_id, metadata=metadata or {})
            return result
        except Exception as e:
            print(f"Failed to add to memory: {e}")
            return []
    
    def search_memory(query: str, user_id: str = "default_user"):
        if not memory:
            return []
        try:
            results = memory.search(query, user_id=user_id)
            return results
        except Exception as e:
            print(f"Failed to search memory: {e}")
            return []` : ''}

    ${hasEventHandling ? `# Event Handling Integration (if Events detected)
    class EventType(Enum):
        USER_MESSAGE = "user_message"
        AGENT_RESPONSE = "agent_response"
        TOOL_CALL = "tool_call"
        ERROR = "error"
    
    class EventHandler:
        def __init__(self):
            self.listeners = {}
            self.event_history = []
        
        def emit_event(self, event_type: EventType, data: Dict[str, Any]):
            event = {"type": event_type.value, "data": data, "timestamp": datetime.now()}
            self.event_history.append(event)
            print(f"Event: {event_type.value} - {data}")
    
    event_handler = EventHandler()` : ''}

    CRITICAL MAIN FUNCTION INTEGRATION:
    In the main() function, ensure you:
    ${hasLangfuse ? '- Call track_conversation() for session start, user messages, and agent responses' : ''}
    ${hasMemory ? '- Call search_memory() before agent responses and add_to_memory() after responses' : ''}
    ${hasEventHandling ? '- Call event_handler.emit_event() at key interaction points' : ''}

    CRITICAL: This is a COMBINED agent - integrate ALL features into ONE cohesive system.`;
  } else if (hasMCP) {
    // Single MCP agent
    systemPrompt = `You are an expert Python developer specializing in Google ADK (Agent Development Kit) with MCP (Model Context Protocol) integration using Smithery.

    GENERATE CODE EXACTLY LIKE THIS TEMPLATE PATTERN:

    """Agent Name - MCP Agent"""
    import os
    import asyncio
    from dotenv import load_dotenv
    from google.adk.agents import LlmAgent
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
    from google.genai import types

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

    # MCP toolset configuration
    toolset_name = MCPToolset(
        connection_params=StdioServerParameters(
            command="command_here",
            args=["args", "here", "--key", smithery_api_key],
            env={"NODE_OPTIONS": "--no-warnings --experimental-fetch", "SMITHERY_API_KEY": smithery_api_key}
        )
    )

    # Create the LlmAgent with MCP tools
    root_agent = LlmAgent(
        name="agent_name",
        model="gemini-2.0-flash",
        description="Agent description",
        instruction="""Agent instruction with available functions""",
        tools=[toolset_name]
    )

    CRITICAL REQUIREMENTS:
    - Follow this EXACT structure and pattern
    - Use exact import order and initialization pattern
    - Include proper environment variable validation
    - Include proper MCP toolset configuration with Smithery API key
    - Use exact LlmAgent parameter order: name, model, description, instruction, tools
    - Include async main() function with proper session handling
    - Always include __all__ = ["root_agent"] export`;
  } else {
    // Basic agent
    systemPrompt = `You are an expert Python developer specializing in Google ADK (Agent Development Kit).

    GENERATE CODE EXACTLY LIKE THIS TEMPLATE PATTERN:

    """Agent Name - Basic Agent"""
    import os
    import asyncio
    from dotenv import load_dotenv
    from google.adk.agents import LlmAgent
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types

    # Load environment variables
    load_dotenv()

    # Check for Google AI API key
    if 'GOOGLE_API_KEY' not in os.environ:
        print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
        exit(1)

    # Create the LlmAgent with the required parameters
    root_agent = LlmAgent(
        name="agent_name",
        model="gemini-2.0-flash",
        description="Agent description",
        instruction="""Agent instruction""",
        tools=[]
    )

    CRITICAL REQUIREMENTS:
    - Follow this EXACT import structure and pattern
    - Use proper environment variable validation
    - Use exact LlmAgent parameter order: name, model, description, instruction, tools
    - Include async main() function with proper session handling
    - Always include __all__ = ["root_agent"] export`;
  }

  // Multi-feature integration is now handled in the unified system prompt above
  // No need for individual feature additions since we use smart routing

  // Extract comprehensive MCP configuration details for the prompt
  const mcpDetails = dedupedConfig ? dedupedConfig.map((cfg, idx) => {
    const mcpPackage = cfg.smitheryMcp || cfg.args.find(arg => arg.startsWith('@')) || '@smithery/mcp-example';
    return {
      index: idx,
      package: mcpPackage,
      command: cfg.command,
      args: cfg.args,
      envVars: cfg.envVars
    };
  }) : [];

  const userPrompt = `Generate Google ADK agent code with these specifications:

🔍 **FEATURE DETECTION SUMMARY:**
- Active Features: ${activeFeatures} (${isMultiFeature ? 'MULTI-FEATURE AGENT' : 'Single Feature Agent'})
- Features: ${[hasMCP && 'MCP', hasLangfuse && 'Langfuse', hasMemory && 'Memory', hasEventHandling && 'Events'].filter(Boolean).join(', ') || 'Basic Agent'}
${isMultiFeature ? '⚠️ CRITICAL: Generate ONE combined agent integrating ALL features together' : ''}

**AGENT DETAILS:**
- Name: ${agentNodes.length > 0 ? (agentNodes[0].data.label || 'search_agent') : 'search_agent'}
- Description: ${agentNodes.length > 0 ? (agentNodes[0].data.description || 'AI agent for task automation') : 'AI agent for task automation'}
- Instructions: ${agentNodes.length > 0 ? (agentNodes[0].data.instruction || agentNodes[0].data.prompt || 'Use available tools to help users') : 'Use available tools to help users'}

${mcpEnabled ? `**MCP TOOLS:** ${mcpDetails.map(detail => `${detail.package}`).join(', ')}
MCP Configuration Details:
${mcpDetails.map((detail, idx) => `Tool ${idx + 1}: ${detail.package}
- Command: ${detail.command}  
- Args: ${detail.args.join(' ')}
- Environment: ${Object.keys(detail.envVars).join(', ')}`).join('\n')}` : '**MCP TOOLS:** None'}

${eventHandlingConfig ? `**EVENT HANDLING:** ✓ Enabled
- Types: ${eventHandlingConfig.eventTypes.join(', ')}
- Middleware: ${eventHandlingConfig.middleware.join(', ')}
- History: ${eventHandlingConfig.historyEnabled ? 'Yes' : 'No'}` : '**EVENT HANDLING:** ✗ Disabled'}

${memoryConfig ? `**MEMORY (MEM0):** ✓ Enabled  
- Type: ${memoryConfig.memoryType}
- User: ${memoryConfig.userId}
- Host: ${memoryConfig.host}` : '**MEMORY (MEM0):** ✗ Disabled'}

${langfuseConfig ? `**ANALYTICS (LANGFUSE):** ✓ Enabled
- Project: ${langfuseConfig.projectName} 
- Host: ${langfuseConfig.host}` : '**ANALYTICS (LANGFUSE):** ✗ Disabled'}

**CRITICAL REQUIREMENTS:**
1. Follow the EXACT template patterns shown in system prompt
2. Use exact import structure and initialization patterns
3. Include proper environment variable validation
4. Generate ONE MCPToolset per unique package (no duplicates)
5. Include async main() function with proper session handling
6. Export all required functions in __all__ list
7. Add proper error handling and logging statements
${isMultiFeature ? '8. 🚨 CRITICAL: Combine ALL enabled features into ONE cohesive agent\n9. 🚨 CRITICAL: Initialize ALL features in proper order\n10. 🚨 CRITICAL: Include ALL feature functions in main() execution flow' : ''}

Generate ONLY the complete Python code following the template patterns.`;

  try {
    const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://agent-flow-builder.com',
        'X-Title': 'Agent Flow Builder'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const result = await response.json();
    const generatedCode = result.choices[0]?.message?.content || '';

    // Clean the generated code
    const cleanedCode = generatedCode.replace(/```python\n/g, '').replace(/```\n?/g, '').trim();

    // Validate the generated code
    if (!cleanedCode || cleanedCode.length < 100) {
      throw new Error('Generated code too short');
    }

    // CRITICAL: Always verify and fix AI-generated code using our verification system
    console.log('Verifying AI-generated code for Google ADK compliance...');
    try {
      const verificationResult = await verifyAndFixCode(
        cleanedCode, 
        undefined, // no progress callback for now
        {
          mcpPackage: dedupedConfig?.[0]?.smitheryMcp,
          agentName: agentNodes[0]?.data.label || 'ai_agent',
          agentDescription: agentNodes[0]?.data.description || 'AI-generated agent',
          agentInstruction: agentNodes[0]?.data.instruction || agentNodes[0]?.data.prompt || 'You are a helpful assistant'
        }
      );
      
      if (verificationResult.errors.length > 0) {
        console.log(`Fixed ${verificationResult.errors.length} errors in AI-generated code:`, verificationResult.errors.map(e => e.type));
      }
      
      return verificationResult.fixedCode;
    } catch (verificationError) {
      console.error('Code verification failed, falling back to template generation:', verificationError);
      // If verification fails, fall back to template generation
      return generateADKCode(nodes, _edges, dedupedConfig);
    }
 } catch (error) {
  console.error('Error calling OpenRouter API:', error);
  // Fall back to local generation
  return generateADKCode(nodes, _edges, dedupedConfig);
}

}