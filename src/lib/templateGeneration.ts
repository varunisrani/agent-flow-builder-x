import type { ExtractedNodeData } from './nodeDataExtraction';

/**
 * Generate a basic agent template using node data
 */
export function generateBasicAgentTemplate(nodeData: ExtractedNodeData): string {
  const { agentName, agentDescription, agentInstruction, agentModel } = nodeData;
  
  return `"""${agentName} - Basic Agent"""
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
    print("Example: export GOOGLE_API_KEY=your_api_key_here")
    exit(1)

# Create the LlmAgent with the required parameters
root_agent = LlmAgent(
    name="${agentName}",
    model="${agentModel}",
    description="${agentDescription}",
    instruction="""${agentInstruction}""",
    tools=[]
)

# Create session service and runner
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="${agentName}")

# Entry point for execution
if __name__ == "__main__":
    async def test_agent():
        # Create a session first
        session = await session_service.create_session(
            app_name="${agentName}",
            user_id="test_user",
            session_id="test_session"
        )
        
        # Test a simple message
        message = types.Content(role='user', parts=[types.Part(text='Hello! How can you help me?')])
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

__all__ = ['root_agent']`;
}

/**
 * Generate an MCP agent template using node data
 */
export function generateMCPAgentTemplate(nodeData: ExtractedNodeData): string {
  const { agentName, agentDescription, agentInstruction, agentModel, mcpConfigs } = nodeData;
  
  // Generate MCP toolset configurations
  const toolsetConfigs = mcpConfigs.map((config, idx) => {
    const packageName = config.smitheryMcp?.split('/').pop() || `mcp_${idx}`;
    const varName = `${packageName.replace(/[^a-zA-Z0-9_]/g, '_')}_toolset`;
    
    const fixedArgs = [...config.args];
    if (!fixedArgs.includes('--key')) {
      fixedArgs.push('--key', 'smithery_api_key');
    }
    
    return {
      varName,
      packageName: config.smitheryMcp,
      config: `# MCP toolset configuration for ${config.smitheryMcp}
${varName} = MCPToolset(
    connection_params=StdioServerParameters(
        command="${config.command}",
        args=${JSON.stringify(fixedArgs).replace('"smithery_api_key"', 'smithery_api_key')},
        env=${JSON.stringify({ ...config.envVars, "SMITHERY_API_KEY": "smithery_api_key" }).replace('"smithery_api_key"', 'smithery_api_key')}
    )
)`
    };
  });
  
  const toolsetDefs = toolsetConfigs.map(t => t.config).join('\n\n');
  const toolsetNames = toolsetConfigs.map(t => t.varName).join(', ');
  const availableFunctions = mcpConfigs.map(config => 
    `- ${config.smitheryMcp} tools for ${config.availableFunctions || 'operations'}`
  ).join('\n');
  
  return `"""${agentName} - MCP Agent"""
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

${toolsetDefs}

# Create the LlmAgent with MCP tools
root_agent = LlmAgent(
    name="${agentName}",
    model="${agentModel}",
    description="${agentDescription}",
    instruction="""${agentInstruction}

Available functions through MCP:
${availableFunctions}

IMPORTANT RULES:
1. Use the available MCP tools to perform requested operations
2. Always provide clear explanations for actions taken
3. Handle errors gracefully and provide helpful feedback""",
    tools=[${toolsetNames}]
)

# Session service and runner setup
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="${agentName}")

async def main():
    # Create a session
    user_id = "user"
    session = await session_service.create_session(app_name="${agentName}", user_id=user_id)
    session_id = session.id

    # Create an initial message (Content object)
    new_message = types.Content(
        role="user",
        parts=[types.Part(text="Hello, agent!")]
    )

    # Run the agent
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=new_message
    ):
        print(event)

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent"]`;
}

/**
 * Generate a Langfuse-enabled agent template using node data
 */
export function generateLangfuseAgentTemplate(nodeData: ExtractedNodeData): string {
  const { agentName, agentDescription, agentInstruction, agentModel, langfuseConfig, mcpConfigs } = nodeData;
  
  const hasMCP = mcpConfigs && mcpConfigs.length > 0;
  let toolsSection = '[]';
  let mcpSetupSection = '';
  let availableFunctionsSection = '';
  
  if (hasMCP) {
    const toolsetConfigs = mcpConfigs.map((config, idx) => {
      const packageName = config.smitheryMcp?.split('/').pop() || `mcp_${idx}`;
      const varName = `${packageName.replace(/[^a-zA-Z0-9_]/g, '_')}_toolset`;
      
      const fixedArgs = [...config.args];
      if (!fixedArgs.includes('--key')) {
        fixedArgs.push('--key', 'smithery_api_key');
      }
      
      return {
        varName,
        config: `# MCP toolset configuration for ${config.smitheryMcp}
${varName} = MCPToolset(
    connection_params=StdioServerParameters(
        command="${config.command}",
        args=${JSON.stringify(fixedArgs).replace('"smithery_api_key"', 'smithery_api_key')},
        env=${JSON.stringify({ ...config.envVars, "SMITHERY_API_KEY": "smithery_api_key" }).replace('"smithery_api_key"', 'smithery_api_key')}
    )
)`
      };
    });
    
    mcpSetupSection = `
# Set the Smithery API key from environment variable
smithery_api_key = os.getenv("SMITHERY_API_KEY")
if not smithery_api_key:
    raise ValueError("SMITHERY_API_KEY environment variable is not set")

${toolsetConfigs.map(t => t.config).join('\n\n')}`;
    
    toolsSection = `[${toolsetConfigs.map(t => t.varName).join(', ')}]`;
    
    availableFunctionsSection = `

Available functions through MCP:
${mcpConfigs.map(config => `- ${config.smitheryMcp} tools for ${config.availableFunctions || 'operations'}`).join('\n')}`;
  }
  
  return `"""${agentName} - Langfuse Analytics Agent"""
import os
import asyncio
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService${hasMCP ? '\nfrom google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters' : ''}
from google.genai import types
from langfuse import Langfuse

# Load environment variables
load_dotenv()

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    exit(1)
${mcpSetupSection}

# Initialize Langfuse with environment variables
langfuse = None
if os.environ.get('LANGFUSE_PUBLIC_KEY') and os.environ.get('LANGFUSE_SECRET_KEY'):
    langfuse = Langfuse(
        public_key=os.environ.get('LANGFUSE_PUBLIC_KEY'),
        secret_key=os.environ.get('LANGFUSE_SECRET_KEY'),
        host=os.environ.get('LANGFUSE_HOST', '${langfuseConfig?.host || 'https://cloud.langfuse.com'}')
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
                "project": "${langfuseConfig?.projectName || 'agent-project'}",
                "agent_name": "${agentName}",
                **metadata
            }
        )

# Create the LlmAgent with analytics tracking
root_agent = LlmAgent(
    name="${agentName}",
    model="${agentModel}",
    description="${agentDescription}",
    instruction="""${agentInstruction}${availableFunctionsSection}

ANALYTICS FEATURES:
- All interactions are automatically tracked with Langfuse
- Conversation analytics for performance monitoring
- Error tracking and debugging support

IMPORTANT RULES:
1. All interactions are automatically tracked through analytics${hasMCP ? '\n2. Use available MCP tools to perform requested operations\n3. Always provide clear explanations for actions taken\n4. Handle errors gracefully with automatic error tracking' : '\n2. Provide clear and helpful responses\n3. Handle errors gracefully with automatic error tracking'}""",
    tools=${toolsSection}
)

# Session service and runner setup
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="${agentName}")

async def main():
    # Create a session
    user_id = "user"
    session = await session_service.create_session(app_name="${agentName}", user_id=user_id)
    session_id = session.id

    # Track session start
    track_conversation(session_id, user_id, {
        "event_type": "session_start",
        "agent_description": "${agentDescription}"
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

__all__ = ["root_agent", "track_conversation"]`;
}

/**
 * Generate a memory-enabled agent template using node data
 */
export function generateMemoryAgentTemplate(nodeData: ExtractedNodeData): string {
  const { agentName, agentDescription, agentInstruction, agentModel, memoryConfig, mcpConfigs } = nodeData;
  
  const hasMCP = mcpConfigs && mcpConfigs.length > 0;
  let toolsSection = '[]';
  let mcpSetupSection = '';
  let availableFunctionsSection = '';
  
  if (hasMCP) {
    const toolsetConfigs = mcpConfigs.map((config, idx) => {
      const packageName = config.smitheryMcp?.split('/').pop() || `mcp_${idx}`;
      const varName = `${packageName.replace(/[^a-zA-Z0-9_]/g, '_')}_toolset`;
      
      const fixedArgs = [...config.args];
      if (!fixedArgs.includes('--key')) {
        fixedArgs.push('--key', 'smithery_api_key');
      }
      
      return {
        varName,
        config: `# MCP toolset configuration for ${config.smitheryMcp}
${varName} = MCPToolset(
    connection_params=StdioServerParameters(
        command="${config.command}",
        args=${JSON.stringify(fixedArgs).replace('"smithery_api_key"', 'smithery_api_key')},
        env=${JSON.stringify({ ...config.envVars, "SMITHERY_API_KEY": "smithery_api_key" }).replace('"smithery_api_key"', 'smithery_api_key')}
    )
)`
      };
    });
    
    mcpSetupSection = `
# Set the Smithery API key from environment variable
smithery_api_key = os.getenv("SMITHERY_API_KEY")
if not smithery_api_key:
    raise ValueError("SMITHERY_API_KEY environment variable is not set")

${toolsetConfigs.map(t => t.config).join('\n\n')}`;
    
    toolsSection = `[${toolsetConfigs.map(t => t.varName).join(', ')}]`;
    
    availableFunctionsSection = `

Available functions through MCP:
${mcpConfigs.map(config => `- ${config.smitheryMcp} tools for ${config.availableFunctions || 'operations'}`).join('\n')}`;
  }
  
  return `"""${agentName} - Memory-Enabled Agent"""
import os
import asyncio
import json
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService${hasMCP ? '\nfrom google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters' : ''}
from google.genai import types
from mem0 import Memory

# Load environment variables
load_dotenv()

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    exit(1)
${mcpSetupSection}

# Initialize Mem0 Memory
memory = None
if os.environ.get('MEM0_API_KEY'):
    os.environ["MEM0_API_KEY"] = os.environ.get('MEM0_API_KEY')
    memory = Memory()
    print("✓ Mem0 memory initialized")
else:
    print("Warning: MEM0_API_KEY not set. Memory features will be disabled.")

# Memory management functions
def add_to_memory(user_message: str, assistant_response: str, user_id: str = "${memoryConfig?.userId || 'default_user'}", metadata: dict = None):
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
                "memory_type": "${memoryConfig?.memoryType || 'all'}",
                "timestamp": json.dumps({"created": "now"}),
                **(metadata or {})
            }
        )
        print(f"✓ Added conversation to memory: {result}")
        return result
    except Exception as e:
        print(f"Failed to add to memory: {e}")
        return []

def search_memory(query: str, user_id: str = "${memoryConfig?.userId || 'default_user'}"):
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

def get_memory_context(user_message: str, user_id: str = "${memoryConfig?.userId || 'default_user'}"):
    """Get relevant memory context for the current conversation."""
    memories = search_memory(user_message, user_id)
    if memories:
        context = "\\n\\nRelevant context from previous conversations:\\n"
        for memory_item in memories[:3]:  # Limit to top 3 results
            context += f"- {memory_item.get('memory', '')[:200]}...\\n"
        return context
    return ""

# Create the LlmAgent with memory capabilities
root_agent = LlmAgent(
    name="${agentName}",
    model="${agentModel}",
    description="${agentDescription}",
    instruction="""${agentInstruction}${availableFunctionsSection}

MEMORY FEATURES:
- Persistent memory across conversations using Mem0
- Context-aware responses based on conversation history
- Learning from user preferences and interactions
- Memory type: ${memoryConfig?.memoryType || 'all'}

IMPORTANT RULES:
1. Use memory context to provide personalized responses
2. Remember user preferences and conversation history${hasMCP ? '\n3. Use available MCP tools to perform requested operations\n4. Always provide clear explanations for actions taken' : '\n3. Provide clear and helpful responses'}
5. Handle memory operations gracefully if memory is unavailable""",
    tools=${toolsSection}
)

# Session service and runner setup
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="${agentName}")

async def main():
    # Create a session
    user_id = "${memoryConfig?.userId || 'default_user'}"
    session = await session_service.create_session(app_name="${agentName}", user_id=user_id)
    session_id = session.id

    # Test message with memory context
    test_message = "Hello, agent!"
    memory_context = get_memory_context(test_message, user_id)
    
    full_message = test_message + memory_context
    
    new_message = types.Content(
        role="user",
        parts=[types.Part(text=full_message)]
    )

    # Run the agent
    response_content = ""
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
        "agent_name": "${agentName}"
    })

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent", "add_to_memory", "search_memory", "get_memory_context"]`;
}

/**
 * Generate a combined template with multiple features
 */
export function generateCombinedTemplate(nodeData: ExtractedNodeData): string {
  const { 
    agentName, agentDescription, agentInstruction, agentModel, 
    mcpConfigs, langfuseConfig, memoryConfig, eventHandlingConfig 
  } = nodeData;
  
  const hasMCP = mcpConfigs && mcpConfigs.length > 0;
  const hasLangfuse = !!langfuseConfig;
  const hasMemory = !!memoryConfig;
  const hasEventHandling = !!eventHandlingConfig;
  
  let imports = `import os
import asyncio
import json
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types`;

  if (hasMCP) {
    imports += '\nfrom google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters';
  }
  if (hasLangfuse) {
    imports += '\nfrom langfuse import Langfuse';
  }
  if (hasMemory) {
    imports += '\nfrom mem0 import Memory';
  }
  
  let setupSections = [];
  let toolsSection = '[]';
  let additionalFunctions = [];
  let exports = ['root_agent'];
  
  // MCP Setup
  if (hasMCP) {
    const toolsetConfigs = mcpConfigs.map((config, idx) => {
      const packageName = config.smitheryMcp?.split('/').pop() || `mcp_${idx}`;
      const varName = `${packageName.replace(/[^a-zA-Z0-9_]/g, '_')}_toolset`;
      
      const fixedArgs = [...config.args];
      if (!fixedArgs.includes('--key')) {
        fixedArgs.push('--key', 'smithery_api_key');
      }
      
      return {
        varName,
        config: `${varName} = MCPToolset(
    connection_params=StdioServerParameters(
        command="${config.command}",
        args=${JSON.stringify(fixedArgs).replace('"smithery_api_key"', 'smithery_api_key')},
        env=${JSON.stringify({ ...config.envVars, "SMITHERY_API_KEY": "smithery_api_key" }).replace('"smithery_api_key"', 'smithery_api_key')}
    )
)`
      };
    });
    
    setupSections.push(`# MCP Configuration
smithery_api_key = os.getenv("SMITHERY_API_KEY")
if not smithery_api_key:
    raise ValueError("SMITHERY_API_KEY environment variable is not set")

${toolsetConfigs.map(t => t.config).join('\n\n')}`);
    
    toolsSection = `[${toolsetConfigs.map(t => t.varName).join(', ')}]`;
  }
  
  // Langfuse Setup
  if (hasLangfuse) {
    setupSections.push(`# Langfuse Analytics Setup
langfuse = None
if os.environ.get('LANGFUSE_PUBLIC_KEY') and os.environ.get('LANGFUSE_SECRET_KEY'):
    langfuse = Langfuse(
        public_key=os.environ.get('LANGFUSE_PUBLIC_KEY'),
        secret_key=os.environ.get('LANGFUSE_SECRET_KEY'),
        host=os.environ.get('LANGFUSE_HOST', '${langfuseConfig.host}')
    )
    print("✓ Langfuse analytics initialized")
else:
    print("Warning: Langfuse credentials not set. Analytics will be disabled.")`);
    
    additionalFunctions.push(`def track_conversation(conversation_id, user_id, metadata):
    """Track conversation interactions with Langfuse."""
    if langfuse:
        langfuse.track_event(
            event_name="conversation_interaction",
            properties={
                "conversation_id": conversation_id,
                "user_id": user_id,
                "project": "${langfuseConfig.projectName}",
                "agent_name": "${agentName}",
                **metadata
            }
        )`);
    
    exports.push('track_conversation');
  }
  
  // Memory Setup
  if (hasMemory) {
    setupSections.push(`# Mem0 Memory Setup
memory = None
if os.environ.get('MEM0_API_KEY'):
    os.environ["MEM0_API_KEY"] = os.environ.get('MEM0_API_KEY')
    memory = Memory()
    print("✓ Mem0 memory initialized")
else:
    print("Warning: MEM0_API_KEY not set. Memory features will be disabled.")`);
    
    additionalFunctions.push(`def add_to_memory(user_message: str, assistant_response: str, user_id: str = "${memoryConfig.userId}", metadata: dict = None):
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
        return result
    except Exception as e:
        print(f"Failed to add to memory: {e}")
        return []

def search_memory(query: str, user_id: str = "${memoryConfig.userId}"):
    """Search memory for relevant information."""
    if not memory:
        return []
    
    try:
        results = memory.search(query, user_id=user_id)
        return results
    except Exception as e:
        print(f"Failed to search memory: {e}")
        return []`);
    
    exports.push('add_to_memory', 'search_memory');
  }
  
  // Build instruction with all features
  let fullInstruction = agentInstruction;
  
  if (hasMCP) {
    fullInstruction += `\n\nAvailable functions through MCP:\n${mcpConfigs.map(config => `- ${config.smitheryMcp} tools for ${config.availableFunctions || 'operations'}`).join('\n')}`;
  }
  
  if (hasLangfuse) {
    fullInstruction += '\n\nANALYTICS FEATURES:\n- All interactions are automatically tracked with Langfuse\n- Conversation analytics for performance monitoring';
  }
  
  if (hasMemory) {
    fullInstruction += '\n\nMEMORY FEATURES:\n- Persistent memory across conversations using Mem0\n- Context-aware responses based on conversation history';
  }
  
  if (hasEventHandling) {
    fullInstruction += '\n\nEVENT HANDLING FEATURES:\n- Comprehensive event tracking for all agent interactions\n- Real-time event monitoring and logging';
  }
  
  fullInstruction += '\n\nIMPORTANT RULES:\n1. Use all available features to provide the best user experience';
  
  if (hasMCP) fullInstruction += '\n2. Use available MCP tools to perform requested operations';
  if (hasLangfuse) fullInstruction += '\n3. All interactions are automatically tracked through analytics';
  if (hasMemory) fullInstruction += '\n4. Use memory context to provide personalized responses';
  
  return `"""${agentName} - Multi-Feature Agent"""
${imports}

# Load environment variables
load_dotenv()

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    exit(1)

${setupSections.join('\n\n')}

${additionalFunctions.length > 0 ? '\n# Additional Functions\n' + additionalFunctions.join('\n\n') : ''}

# Create the multi-feature LlmAgent
root_agent = LlmAgent(
    name="${agentName}",
    model="${agentModel}",
    description="${agentDescription}",
    instruction="""${fullInstruction}""",
    tools=${toolsSection}
)

# Session service and runner setup
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="${agentName}")

async def main():
    # Create a session
    user_id = "${memoryConfig?.userId || 'user'}"
    session = await session_service.create_session(app_name="${agentName}", user_id=user_id)
    session_id = session.id

    ${hasLangfuse ? `# Track session start
    track_conversation(session_id, user_id, {
        "event_type": "session_start",
        "agent_description": "${agentDescription}"
    })` : ''}

    # Test message
    test_message = "Hello, agent!"
    
    ${hasMemory ? `# Get memory context
    memory_results = search_memory(test_message, user_id)
    memory_context = ""
    if memory_results:
        memory_context = "\\n\\nRelevant context from previous conversations:\\n"
        for memory_item in memory_results[:3]:
            memory_context += f"- {memory_item.get('memory', '')[:200]}...\\n"
    
    full_message = test_message + memory_context` : 'full_message = test_message'}
    
    new_message = types.Content(
        role="user",
        parts=[types.Part(text=full_message)]
    )

    ${hasLangfuse ? `# Track user message
    track_conversation(session_id, user_id, {
        "event_type": "user_message",
        "message": test_message
    })` : ''}

    # Run the agent
    response_content = ""
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=new_message
    ):
        print(event)
        response_content += str(event)
    
    ${hasLangfuse ? `# Track agent response
    track_conversation(session_id, user_id, {
        "event_type": "agent_response",
        "response": response_content
    })` : ''}
    
    ${hasMemory ? `# Add conversation to memory
    add_to_memory(test_message, response_content, user_id, {
        "session_id": session_id,
        "agent_name": "${agentName}"
    })` : ''}

if __name__ == "__main__":
    asyncio.run(main())

__all__ = [${exports.map(e => `"${e}"`).join(', ')}]`;
}

/**
 * Main template generation function - routes to appropriate template
 */
export function generateTemplateFromNodeData(nodeData: ExtractedNodeData): string {
  const hasLangfuse = !!nodeData.langfuseConfig;
  const hasMemory = !!nodeData.memoryConfig;
  const hasEventHandling = !!nodeData.eventHandlingConfig;
  const hasMCP = nodeData.mcpConfigs && nodeData.mcpConfigs.length > 0;
  
  // Count active features
  const activeFeatures = [hasLangfuse, hasMemory, hasEventHandling].filter(Boolean).length;
  
  // Route to appropriate template
  if (activeFeatures > 1) {
    // Multiple features - use combined template
    return generateCombinedTemplate(nodeData);
  } else if (hasLangfuse) {
    // Langfuse only
    return generateLangfuseAgentTemplate(nodeData);
  } else if (hasMemory) {
    // Memory only
    return generateMemoryAgentTemplate(nodeData);
  } else if (hasMCP) {
    // MCP only
    return generateMCPAgentTemplate(nodeData);
  } else {
    // Basic agent
    return generateBasicAgentTemplate(nodeData);
  }
}