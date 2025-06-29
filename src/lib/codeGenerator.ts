import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '@/components/nodes/BaseNode';

// OpenRouter configuration - use environment variable for API key
const OPENROUTER_API_KEY = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.VITE_OPENROUTER_API_KEY 
  : process.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_BASE = typeof import.meta !== 'undefined' && import.meta.env 
  ? (import.meta.env.VITE_OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1')
  : (process.env.VITE_OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1');

// Helper types
type Framework = 'adk' | 'mcp' | 'langfuse' | 'memory' | 'event-handling' | 'combined' | 'standard';

/**
 * Generates code for the given flow nodes and edges based on the selected framework
 */
export async function generateCode(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  framework: Framework,
  options?: {
    signal?: AbortSignal;
    onProgress?: (progress: number) => void;
  }
): Promise<string> {
  // If there are no nodes, return a template for the selected framework
  // Allow AI generation even with no edges - agent can still be configured with features
  if (nodes.length === 0) {
    return getFrameworkTemplate(framework);
  }

  // Prepare the node data in a comprehensive format for the API
  const nodeData = nodes.map(node => ({
    id: node.id,
    type: node.data.type,
    label: node.data.label,
    description: node.data.description || '',
    instruction: node.data.instruction || '',
    modelType: node.data.modelType || '',
    // MCP related data
    smitheryMcp: node.data.smitheryMcp,
    mcpCommand: node.data.mcpCommand,
    mcpArgs: node.data.mcpArgs,
    // Langfuse related data
    langfuseEnabled: node.data.langfuseEnabled,
    langfusePublicKey: node.data.langfusePublicKey,
    langfuseSecretKey: node.data.langfuseSecretKey,
    langfuseHost: node.data.langfuseHost,
    langfuseProjectName: node.data.langfuseProjectName,
    // Memory related data
    memoryEnabled: node.data.memoryEnabled,
    memoryApiKey: node.data.memoryApiKey,
    memoryHost: node.data.memoryHost,
    memoryUserId: node.data.memoryUserId,
    memoryType: node.data.memoryType,
    // Event handling related data
    eventHandlingEnabled: node.data.eventHandlingEnabled,
    eventTypes: node.data.eventTypes,
    eventMiddleware: node.data.eventMiddleware,
  }));

  // Create a simplified representation of edges
  const edgeData = edges.map(edge => ({
    source: edge.source,
    target: edge.target,
    label: edge.label || '',
  }));

  try {
    // Create a system message that explains what we want
    const systemMessage = `
      You are an expert Python developer who specializes in creating agent-based AI systems.
      You will be given a flow diagram represented as nodes and edges, and you need to generate
      Python code that implements this flow using the ${getFrameworkName(framework)} framework.
      
      CRITICAL: You MUST generate code that matches the specified framework (${framework}). 
      Do NOT default to MCP or other patterns unless explicitly requested.
      
      Generate clean, well-commented code with proper error handling. Include imports, class definitions,
      and a main function that demonstrates how to use the code. The code should be complete and runnable.
      
      For context, here are the node types and their meanings:
      - agent: An autonomous agent that can use tools and models
      - tool: A capability an agent can use (e.g., web search, calculator)
      - model: An AI model (e.g., GPT-4, Claude, etc.)
      - function: A custom function that performs a specific task
      - datasource: A source of data the agent can access
      - memory: Memory nodes require Mem0 integration
      - langfuse: Analytics nodes require Langfuse integration
      - mcp-client/mcp-server: MCP protocol nodes require MCPToolset
      - event-handling: Event nodes require custom event handling system
      
      ${getFrameworkSpecificInstructions(framework)}
    `;

    // Check if OpenRouter API key is available
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured. Please set VITE_OPENROUTER_API_KEY in your environment.');
    }

    // Report progress
    options?.onProgress?.(0.1);

    // Make the OpenRouter API call
    const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://agent-flow-builder.com',
        'X-Title': 'Agent Flow Builder'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          {
            role: 'user',
            content: getExplicitPromptForMode(framework, nodeData),
          },
        ],
        temperature: 1,
        max_tokens: 14000,
      }),
      signal: options?.signal
    });

    options?.onProgress?.(0.8);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    options?.onProgress?.(0.9);

    // Extract and return the generated code
    const generatedCode = result.choices[0]?.message?.content || '';
    
    if (!generatedCode) {
      throw new Error('No code generated by AI. Please try again.');
    }

    options?.onProgress?.(1.0);
    
    // Clean up the code (remove markdown code blocks if present)
    return cleanCodeResponse(generatedCode);
  } catch (error) {
    console.error('Error generating code with OpenAI:', error);
    throw new Error('Failed to generate code. Please try again later.');
  }
}

/**
 * Helper function to get the display name of the framework
 */
function getFrameworkName(framework: Framework): string {
  switch (framework) {
    case 'adk':
    case 'standard':
      return 'Google Agent Development Kit (ADK)';
    case 'mcp':
      return 'Google ADK with MCP Protocol';
    case 'langfuse':
      return 'Google ADK with Langfuse Analytics';
    case 'memory':
      return 'Google ADK with Mem0 Memory';
    case 'event-handling':
      return 'Google ADK with Event Handling';
    case 'combined':
      return 'Google ADK with Multiple Features';
    default:
      return 'Google Agent Development Kit (ADK)';
  }
}

/**
 * Helper function to get framework-specific instructions
 */
function getFrameworkSpecificInstructions(framework: Framework): string {
  switch (framework) {
    case 'adk':
    case 'standard':
      return `
        Use the Google Agent Development Kit (ADK) to implement this flow.
        
        CRITICAL: This is STANDARD mode - create a basic ADK agent without special features.
        DO NOT include MCP, Memory, Langfuse, or other advanced features.
        DO NOT import MCPToolset, StdioServerParameters, mem0, langfuse, or smithery-related code.
        
        Include appropriate imports for the ADK library, tool definitions, and agent configurations.
        Use the LlmAgent class as the main way to define agents and their properties.
        
        Required imports:
        from google.adk.agents import LlmAgent
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai import types
        import asyncio
        import os
        from dotenv import load_dotenv
        
        Always include proper async main function and proper session management.
        
        FORBIDDEN: Do not include any MCP, Memory, Langfuse, or advanced features.
      `;
    
    case 'mcp':
      return `
        Use the Google Agent Development Kit (ADK) with MCP Protocol support.
        
        CRITICAL: For MCP tools, use ONLY direct initialization of MCPToolset instances with StdioServerParameters.
        
        Required imports:
        from google.adk.agents import LlmAgent
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
        from google.genai import types
        import asyncio
        import os
        from dotenv import load_dotenv
        
        CORRECT MCP SYNTAX:
        smithery_api_key = os.getenv("SMITHERY_API_KEY")
        if not smithery_api_key:
            raise ValueError("SMITHERY_API_KEY environment variable is not set")
            
        mcp_toolset = MCPToolset(
            connection_params=StdioServerParameters(
                command="npx",
                args=["-y", "@smithery/cli@latest", "run", "PACKAGE_NAME", "--key", smithery_api_key],
                env={"NODE_OPTIONS": "--no-warnings --experimental-fetch", "SMITHERY_API_KEY": smithery_api_key}
            )
        )
        
        Use the MCP toolset in the LlmAgent tools parameter.
      `;
      
    case 'langfuse':
      return `
        Use the Google Agent Development Kit (ADK) with Langfuse Analytics integration.
        
        CRITICAL: This is LANGFUSE mode - you MUST include Langfuse analytics features.
        DO NOT include MCP, Memory, or other non-Langfuse features.
        DO NOT import MCPToolset, StdioServerParameters, mem0, or smithery-related code.
        
        Required imports:
        from google.adk.agents import LlmAgent
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai import types
        from langfuse import Langfuse
        import asyncio
        import os
        from dotenv import load_dotenv
        
        Initialize Langfuse client:
        langfuse = Langfuse(
            public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
            secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
            host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
        )
        
        Create wrapper functions to log agent interactions to Langfuse with traces and spans.
        Include proper error handling and cleanup.
        
        FORBIDDEN: Do not include any MCP, Memory, or Smithery code.
      `;
      
    case 'memory':
      return `
        Use the Google Agent Development Kit (ADK) with Mem0 Memory integration.
        
        CRITICAL: This is MEMORY mode - you MUST include Mem0 memory features.
        DO NOT include MCP, Langfuse, or other non-memory features.
        DO NOT import MCPToolset, StdioServerParameters, or smithery-related code.
        
        Required imports:
        from google.adk.agents import LlmAgent
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai import types
        import mem0
        import asyncio
        import os
        from dotenv import load_dotenv
        
        Initialize Mem0 client:
        memory_client = mem0.Memory(
            api_key=os.getenv("MEM0_API_KEY"),
            host=os.getenv("MEM0_HOST", "https://api.mem0.ai")
        )
        
        Create memory-enhanced agent wrapper that:
        1. Retrieves relevant memories before responding
        2. Stores new information after responses
        3. Manages memory types (preferences, conversation, knowledge)
        Include proper user isolation and memory cleanup.
        
        FORBIDDEN: Do not include any MCP, Smithery, or Langfuse code.
      `;
      
    case 'event-handling':
      return `
        Use the Google Agent Development Kit (ADK) with Event Handling system.
        
        Required imports:
        from google.adk.agents import LlmAgent
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai import types
        import asyncio
        import os
        import json
        from datetime import datetime
        from typing import Dict, Any, List
        from dotenv import load_dotenv
        
        Create an EventHandler class that:
        1. Logs various event types (user_message, agent_response, tool_call, error)
        2. Maintains event history if enabled
        3. Supports middleware for event processing
        4. Includes analytics and monitoring capabilities
        
        Wrap agent interactions with proper event logging.
      `;
      
    case 'combined':
      return `
        Use the Google Agent Development Kit (ADK) with multiple integrated features.
        
        Required imports (combine all relevant ones):
        from google.adk.agents import LlmAgent
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
        from google.genai import types
        from langfuse import Langfuse
        import mem0
        import asyncio
        import os
        import json
        from datetime import datetime
        from typing import Dict, Any, List
        from dotenv import load_dotenv
        
        Implement all enabled features:
        1. MCP Protocol support if MCP nodes are present
        2. Langfuse Analytics if Langfuse nodes are present
        3. Mem0 Memory if Memory nodes are present
        4. Event Handling if Event Handling nodes are present
        
        Create a unified wrapper that orchestrates all features together.
        Ensure proper initialization order and error handling.
      `;
      
    default:
      return '';
  }
}

/**
 * Generate explicit prompt for each mode to ensure AI follows the correct pattern
 */
function getExplicitPromptForMode(framework: Framework, nodeData: any[]): string {
  // Extract agent details from nodes
  const agentNode = nodeData.find(node => node.type === 'agent');
  const agentName = agentNode?.label || 'test_agent';
  const agentDescription = agentNode?.description || 'A test agent';
  const agentInstruction = agentNode?.instruction || 'You are a helpful assistant.';
  const agentModel = agentNode?.modelType || 'gemini-2.0-flash';

  switch (framework) {
    case 'memory':
      return `Generate a Google ADK agent with Mem0 memory integration. 

I need you to create a Python script with:
1. Mem0 memory client initialization
2. Memory-enhanced agent wrapper functions  
3. Conversation history management

START YOUR CODE WITH THESE EXACT IMPORTS:
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import mem0
import asyncio
import os
from dotenv import load_dotenv

DO NOT import MCPToolset, StdioServerParameters, langfuse, or any MCP-related code.

Agent details:
- Name: ${agentName}
- Model: ${agentModel}
- Description: ${agentDescription}
- Instruction: ${agentInstruction}

Include memory functionality with mem0.Memory() client and wrapper functions.

UNIQUE REQUEST ID: memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    case 'langfuse':
      return `CRITICAL: Generate a LANGFUSE analytics agent - MUST include Langfuse features!

I need you to create a Python script with:
1. Langfuse client initialization with environment variables
2. Analytics tracking wrapper functions
3. Trace and span management for agent conversations

MANDATORY IMPORTS (use these EXACTLY):
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from langfuse import Langfuse
import asyncio
import os
from dotenv import load_dotenv

ABSOLUTELY FORBIDDEN IMPORTS:
- MCPToolset (DO NOT USE)
- StdioServerParameters (DO NOT USE)
- mem0 (DO NOT USE)
- smithery (DO NOT USE)

Agent details:
- Name: ${agentName}
- Model: ${agentModel}
- Description: ${agentDescription}
- Instruction: ${agentInstruction}

MUST INCLUDE:
- Langfuse client initialization
- Analytics wrapper functions
- Trace creation and finalization
- Event logging for conversations

UNIQUE REQUEST ID: langfuse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    case 'mcp':
      return `Generate a Google ADK agent with MCP protocol integration.

I need you to create a Python script with:
1. MCPToolset initialization with StdioServerParameters
2. Smithery MCP tool configuration
3. MCP-enabled agent setup

START YOUR CODE WITH THESE EXACT IMPORTS:
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.genai import types
import asyncio
import os
from dotenv import load_dotenv

DO NOT import mem0, langfuse, or any non-MCP features.

Agent details:
- Name: ${agentName}
- Model: ${agentModel}
- Description: ${agentDescription}
- Instruction: ${agentInstruction}

Include MCP toolset with proper Smithery configuration and StdioServerParameters.

UNIQUE REQUEST ID: mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    case 'event-handling':
      return `CRITICAL: Generate an EVENT HANDLING agent - MUST include event system!

I need you to create a Python script with:
1. Event handler class with comprehensive logging
2. Event middleware and listeners
3. Agent wrapper with real-time event tracking

MANDATORY IMPORTS (use these EXACTLY):
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import asyncio
import os
import json
from datetime import datetime
from typing import Dict, Any, List
from dotenv import load_dotenv

ABSOLUTELY FORBIDDEN IMPORTS:
- MCPToolset (DO NOT USE)
- StdioServerParameters (DO NOT USE)
- mem0 (DO NOT USE)
- langfuse (DO NOT USE)
- smithery (DO NOT USE)

Agent details:
- Name: ${agentName}
- Model: ${agentModel}
- Description: ${agentDescription}
- Instruction: ${agentInstruction}

MUST INCLUDE:
- EventHandler class with logging
- Event middleware system
- Event listeners and processors
- Real-time event analytics`;

    case 'combined':
      return `Generate a Google ADK agent with multiple integrated features.

I need you to create a Python script with:
1. Multiple feature integrations (MCP, Langfuse, Memory)
2. Unified wrapper class managing all features
3. Comprehensive initialization and coordination

START YOUR CODE WITH THESE EXACT IMPORTS:
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.genai import types
from langfuse import Langfuse
import mem0
import asyncio
import os
import json
from datetime import datetime
from dotenv import load_dotenv

Agent details:
- Name: ${agentName}
- Model: ${agentModel}
- Description: ${agentDescription}
- Instruction: ${agentInstruction}

Implement all features: MCP tools, Langfuse analytics, Mem0 memory, in a unified architecture.`;

    case 'adk':
    case 'standard':
    default:
      return `CRITICAL: Generate a STANDARD Google ADK agent - NO advanced features allowed!

I need you to create a Python script with:
1. Basic LlmAgent setup ONLY
2. Session management 
3. Simple async main function

MANDATORY IMPORTS (use these EXACTLY):
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import asyncio
import os
from dotenv import load_dotenv

ABSOLUTELY FORBIDDEN IMPORTS:
- MCPToolset (DO NOT USE)
- StdioServerParameters (DO NOT USE)
- mem0 (DO NOT USE) 
- langfuse (DO NOT USE)
- smithery (DO NOT USE)

Agent details:
- Name: ${agentName}
- Model: ${agentModel}
- Description: ${agentDescription}
- Instruction: ${agentInstruction}

SIMPLE STANDARD AGENT ONLY - no MCP, memory, analytics, or other features!

UNIQUE REQUEST ID: standard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Helper function to clean up code responses from OpenAI
 */
function cleanCodeResponse(response: string): string {
  // Remove markdown code blocks if present
  const codeBlockMatch = response.match(/```(?:python)?\s*([\s\S]*?)\s*```/);
  
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }
  
  return response.trim();
}

/**
 * Helper function to get a starter template for the selected framework
 */
function getFrameworkTemplate(framework: Framework): string {
  switch (framework) {
    case 'adk':
    case 'standard':
      return `"""Standard ADK Agent"""
import os
import asyncio
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for Google AI API key
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    print("Example: export GOOGLE_API_KEY=your_api_key_here")
    exit(1)

# Create the LlmAgent with the required parameters
root_agent = LlmAgent(
    name="standard_agent",
    model="gemini-2.0-flash",
    description="Standard ADK agent",
    instruction="You are a helpful assistant.",
    tools=[]
)

# Create session service and runner
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="standard_agent")

# Entry point for execution
if __name__ == "__main__":
    async def test_agent():
        # Create a session first
        session = await session_service.create_session(
            app_name="standard_agent",
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

    case 'mcp':
      return `"""MCP-enabled ADK Agent"""
import os
import asyncio
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.genai import types

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    print("Example: export GOOGLE_API_KEY=your_api_key_here")
    exit(1)

# Check for Smithery API key and set up MCP tools
use_mcp = os.environ.get('SMITHERY_API_KEY') is not None
smithery_api_key = os.environ.get('SMITHERY_API_KEY', 'your_smithery_api_key_here')

print(f"MCP tools: {'enabled' if use_mcp else 'disabled (no SMITHERY_API_KEY)'}")

# MCP toolset configuration (only if API key is available)
upstash_context7_mcp_toolset = None
if use_mcp:
    print("   Initializing upstash_context7_mcp_toolset...")
    upstash_context7_mcp_toolset = MCPToolset(
        connection_params=StdioServerParameters(
            command="npx",
            args=["-y", "@smithery/cli@latest", "run", "@upstash/context7-mcp", "--key", smithery_api_key],
            env={"NODE_OPTIONS": "--no-warnings --experimental-fetch", "SMITHERY_API_KEY": smithery_api_key}
        )
    )
else:
    print("   Skipping upstash_context7_mcp_toolset (no API key)")

# Create the LlmAgent with MCP tools
root_agent = LlmAgent(
    name="mcp_agent",
    model="gemini-2.0-flash",
    description="Agent with MCP tool support",
    instruction=\"""You are an agent that can use MCP tools to perform operations.

AVAILABLE TOOLS:
- @upstash/context7-mcp tools for operations

When MCP is not available, the agent operates in basic mode without external tools and gracefully degrades functionality.\""",
    tools=[upstash_context7_mcp_toolset] if upstash_context7_mcp_toolset else []
)

# Create session service and runner
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="mcp_agent")

# Entry point for execution
if __name__ == "__main__":
    async def test_agent():
        # Create a session first
        session = await session_service.create_session(
            app_name="mcp_agent",
            user_id="test_user",
            session_id="test_session"
        )
        
        # Test a simple message
        message = types.Content(role='user', parts=[types.Part(text='Hello! Can you help me with Upstash operations?')])
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

    case 'langfuse':
      return `"""Langfuse Analytics-enabled ADK Agent"""
import os
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from langfuse import Langfuse

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    print("Example: export GOOGLE_API_KEY=your_api_key_here")
    exit(1)

# Initialize Langfuse Analytics
langfuse = None
if os.environ.get('LANGFUSE_PUBLIC_KEY') and os.environ.get('LANGFUSE_SECRET_KEY'):
    langfuse = Langfuse(
        public_key=os.environ.get('LANGFUSE_PUBLIC_KEY'),
        secret_key=os.environ.get('LANGFUSE_SECRET_KEY'),
        host=os.environ.get('LANGFUSE_HOST', 'https://cloud.langfuse.com')
    )
    print("✓ Langfuse analytics initialized")
else:
    print("Warning: Langfuse credentials not set. Analytics will be disabled.")
    print("Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY environment variables.")

# Analytics functions
def create_trace(session_id: str, user_id: str, input_message: str):
    """Create a new Langfuse trace for conversation tracking."""
    if not langfuse:
        return None
    
    try:
        trace = langfuse.trace(
            name="analytics_agent_conversation",
            user_id=user_id,
            session_id=session_id,
            input=input_message,
            metadata={
                "agent": "analytics_agent",
                "timestamp": datetime.now().isoformat()
            }
        )
        print(f"✓ Created analytics trace: {trace.id}")
        return trace
    except Exception as e:
        print(f"Failed to create analytics trace: {e}")
        return None

def log_agent_event(trace, event_type: str, data: any):
    """Log agent events to Langfuse for analytics."""
    if not trace:
        return
    
    try:
        trace.event(
            name=event_type,
            input=str(data),
            metadata={
                "timestamp": datetime.now().isoformat(),
                "event_type": event_type
            }
        )
    except Exception as e:
        print(f"Failed to log event {event_type}: {e}")

def finalize_trace(trace, output: str, status: str = "completed"):
    """Finalize the analytics trace with output and status."""
    if not trace:
        return
    
    try:
        trace.update(
            output=output,
            status=status,
            end_time=datetime.now()
        )
        print(f"✓ Finalized analytics trace with status: {status}")
    except Exception as e:
        print(f"Failed to finalize trace: {e}")

# Create the LlmAgent with analytics capabilities
root_agent = LlmAgent(
    name="analytics_agent",
    model="gemini-2.0-flash",
    description="Agent with Langfuse analytics tracking",
    instruction="""You are a helpful assistant with comprehensive analytics tracking.

ANALYTICS FEATURES:
- Real-time conversation tracking with Langfuse
- Performance monitoring and metrics collection
- User interaction analytics and insights
- Detailed event logging for debugging and optimization

All interactions are logged for quality improvement and performance analysis.""",
    tools=[]
)

# Create session service and runner
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="analytics_agent")

# Entry point for execution
if __name__ == "__main__":
    async def test_agent():
        # Create a session first
        session = await session_service.create_session(
            app_name="analytics_agent",
            user_id="test_user",
            session_id="test_session"
        )
        
        # Test message for analytics
        message = types.Content(role='user', parts=[types.Part(text='Hello! I want to test analytics features.')])
        
        # Create analytics trace
        trace = create_trace("test_session", "test_user", "Hello! I want to test analytics features.")
        
        # Run the agent with analytics tracking
        results = []
        try:
            async for event in runner.run_async(
                user_id="test_user",
                session_id="test_session", 
                new_message=message
            ):
                results.append(event)
                # Log each event to analytics
                log_agent_event(trace, "agent_response", event)
                
            print(f"Agent successfully ran! Number of events: {len(results)}")
            for i, result in enumerate(results):
                print(f"Event {i}: {result}")
            
            # Finalize analytics trace
            finalize_trace(trace, f"Processed {len(results)} events successfully")
            
        except Exception as e:
            print(f"Error running the agent: {e}")
            finalize_trace(trace, f"Error: {e}", "error")
    
    try:
        asyncio.run(test_agent())
    except Exception as e:
        print(f"Error running the agent: {e}")

__all__ = ['root_agent']`;

    case 'memory':
      return `"""Memory-enabled ADK Agent"""
import os
import asyncio
import json
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

# Initialize Mem0 Memory
memory = None
if os.environ.get('MEM0_API_KEY'):
    os.environ["MEM0_API_KEY"] = os.environ.get('MEM0_API_KEY')
    memory = Memory()
    print("✓ Mem0 memory initialized")
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
                "agent": "memory_agent",
                "memory_type": "all",
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
        context = "\\n\\nRelevant context from previous conversations:\\n"
        for memory_item in memories[:3]:  # Limit to top 3 results
            context += f"- {memory_item.get('memory', '')[:200]}...\\n"
        return context
    return ""

# Create the LlmAgent with memory capabilities
root_agent = LlmAgent(
    name="memory_agent",
    model="gemini-2.0-flash",
    description="Agent with memory capabilities",
    instruction=\"""You are a helpful assistant with persistent memory capabilities.

MEMORY FEATURES:
- Persistent memory across conversations using Mem0
- Context-aware responses based on conversation history
- Learning from user preferences and interactions
- Memory type: all

You can remember previous conversations, user preferences, and learned information to provide more personalized and contextual responses.\""",
    tools=[]
)

# Create session service and runner
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="memory_agent")

# Entry point for execution
if __name__ == "__main__":
    async def test_agent():
        # Create a session first
        session = await session_service.create_session(
            app_name="memory_agent",
            user_id="test_user",
            session_id="test_session"
        )
        
        # Test message for memory
        user_message = "Hello! My name is Alice and I love programming in Python."
        message = types.Content(role='user', parts=[types.Part(text=user_message)])
        
        # Get memory context
        memory_context = get_memory_context(user_message, "test_user")
        print(f"Memory context: {memory_context}")
        
        # Run the agent with memory enhancement
        results = []
        try:
            async for event in runner.run_async(
                user_id="test_user",
                session_id="test_session", 
                new_message=message
            ):
                results.append(event)
                
            print(f"Agent successfully ran! Number of events: {len(results)}")
            for i, result in enumerate(results):
                print(f"Event {i}: {result}")
            
            # Add conversation to memory
            if results:
                assistant_response = str(results[-1]) if results else "No response"
                add_to_memory(user_message, assistant_response, "test_user")
            
        except Exception as e:
            print(f"Error running the agent: {e}")
    
    try:
        asyncio.run(test_agent())
    except Exception as e:
        print(f"Error running the agent: {e}")

__all__ = ['root_agent']`;

    case 'event-handling':
      return `"""Event Handling-enabled ADK Agent"""
import os
import asyncio
import json
from datetime import datetime
from typing import Dict, Any, List
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for Google AI API key
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    print("Example: export GOOGLE_API_KEY=your_api_key_here")
    exit(1)

# Event handling system
class EventHandler:
    def __init__(self, enabled_events: List[str], history_enabled: bool = True, analytics_enabled: bool = False):
        self.enabled_events = enabled_events
        self.history_enabled = history_enabled
        self.analytics_enabled = analytics_enabled
        self.event_history = []
        self.event_stats = {}
        self.middleware = ['logging_middleware']
        
    def log_event(self, event_type: str, data: Any, user_id: str, session_id: str, metadata: dict = None):
        """Log events with comprehensive tracking and analytics."""
        if event_type not in self.enabled_events:
            return
            
        # Create event record
        event_record = {
            "id": f"{event_type}_{datetime.now().timestamp()}",
            "timestamp": datetime.now().isoformat(),
            "type": event_type,
            "data": str(data)[:500],  # Limit data length
            "user_id": user_id,
            "session_id": session_id,
            "metadata": metadata or {}
        }
        
        # Apply middleware processing
        for middleware in self.middleware:
            event_record = self.apply_middleware(middleware, event_record)
        
        # Store in history if enabled
        if self.history_enabled:
            self.event_history.append(event_record)
            
        # Update analytics stats
        if self.analytics_enabled:
            self.update_event_stats(event_type)
            
        # Log to console with formatting
        print(f"[EVENT] {event_type.upper()} | {user_id} | {session_id}")
        print(f"  Time: {event_record['timestamp']}")
        print(f"  Data: {event_record['data'][:100]}{'...' if len(str(data)) > 100 else ''}")
        if metadata:
            print(f"  Meta: {metadata}")
        print()
        
    def apply_middleware(self, middleware_name: str, event_record: dict) -> dict:
        """Apply middleware processing to events."""
        if middleware_name == 'logging_middleware':
            # Add logging metadata
            event_record['metadata']['processed_by'] = 'logging_middleware'
            event_record['metadata']['processed_at'] = datetime.now().isoformat()
        return event_record
        
    def update_event_stats(self, event_type: str):
        """Update analytics statistics for events."""
        if event_type not in self.event_stats:
            self.event_stats[event_type] = {'count': 0, 'last_seen': None}
        self.event_stats[event_type]['count'] += 1
        self.event_stats[event_type]['last_seen'] = datetime.now().isoformat()
        
    def get_event_history(self, user_id: str = None, session_id: str = None, event_type: str = None):
        """Get filtered event history."""
        filtered_events = self.event_history
        
        if user_id:
            filtered_events = [e for e in filtered_events if e['user_id'] == user_id]
        if session_id:
            filtered_events = [e for e in filtered_events if e['session_id'] == session_id]
        if event_type:
            filtered_events = [e for e in filtered_events if e['type'] == event_type]
            
        return filtered_events
        
    def get_analytics_summary(self):
        """Get analytics summary of all events."""
        total_events = len(self.event_history)
        return {
            'total_events': total_events,
            'event_types': self.event_stats,
            'unique_users': len(set(e['user_id'] for e in self.event_history)),
            'unique_sessions': len(set(e['session_id'] for e in self.event_history))
        }

# Initialize comprehensive event handler
event_handler = EventHandler(
    enabled_events=["user_message", "agent_response", "tool_call", "error"],
    history_enabled=True,
    analytics_enabled=False
)

# Create the LlmAgent with event handling capabilities
root_agent = LlmAgent(
    name="event_agent",
    model="gemini-2.0-flash",
    description="Agent with comprehensive event handling",
    instruction="""You are a helpful assistant with comprehensive event handling and monitoring.

EVENT HANDLING FEATURES:
- Real-time event logging and tracking
- Event history and analytics
- Middleware processing for events
- Performance monitoring and debugging
- Event types: user_message, agent_response, tool_call, error

All interactions are monitored and logged for debugging, analytics, and performance optimization.""",
    tools=[]
)

# Create session service and runner
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="event_agent")

# Entry point for execution
if __name__ == "__main__":
    async def test_agent():
        # Create a session first
        session = await session_service.create_session(
            app_name="event_agent",
            user_id="test_user",
            session_id="test_session"
        )
        
        # Test message for event handling
        user_message = "Hello! I want to test event handling features."
        message = types.Content(role='user', parts=[types.Part(text=user_message)])
        
        # Log user message event
        event_handler.log_event(
            "user_message", 
            user_message, 
            "test_user", 
            "test_session",
            {"message_length": len(user_message), "source": "test"}
        )
        
        # Run the agent with event tracking
        results = []
        try:
            async for event in runner.run_async(
                user_id="test_user",
                session_id="test_session", 
                new_message=message
            ):
                results.append(event)
                # Log each agent response event
                event_handler.log_event(
                    "agent_response", 
                    event, 
                    "test_user", 
                    "test_session",
                    {"event_index": len(results), "event_type": type(event).__name__}
                )
                
            print(f"Agent successfully ran! Number of events: {len(results)}")
            for i, result in enumerate(results):
                print(f"Event {i}: {result}")
            
            # Display analytics summary
            analytics = event_handler.get_analytics_summary()
            print(f"\nEvent Analytics Summary:")
            print(f"  Total events: {analytics['total_events']}")
            print(f"  Unique users: {analytics['unique_users']}")
            print(f"  Unique sessions: {analytics['unique_sessions']}")
            print(f"  Event types: {analytics['event_types']}")
            
        except Exception as e:
            print(f"Error running the agent: {e}")
            # Log error event
            event_handler.log_event(
                "error", 
                str(e), 
                "test_user", 
                "test_session",
                {"error_type": type(e).__name__, "severity": "high"}
            )
    
    try:
        asyncio.run(test_agent())
    except Exception as e:
        print(f"Error running the agent: {e}")

__all__ = ['root_agent']`;

    case 'combined':
      return `"""Combined Features ADK Agent"""
import os
import asyncio
import json
from datetime import datetime
from typing import Dict, Any, List
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.genai import types
from langfuse import Langfuse
from mem0 import Memory

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for Google AI API key
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    print("Example: export GOOGLE_API_KEY=your_api_key_here")
    exit(1)

# Feature availability flags
features_enabled = {
    'mcp': os.environ.get('SMITHERY_API_KEY') is not None,
    'langfuse': os.environ.get('LANGFUSE_PUBLIC_KEY') and os.environ.get('LANGFUSE_SECRET_KEY'),
    'memory': os.environ.get('MEM0_API_KEY') is not None,
    'event_handling': True  # Always available
}

print("🔧 Combined Agent Features:")
for feature, enabled in features_enabled.items():
    status = "✓ enabled" if enabled else "✗ disabled (missing API key)"
    print(f"  {feature.upper()}: {status}")

# 1. MCP Setup
mcp_toolsets = []
if features_enabled['mcp']:
    smithery_api_key = os.environ.get('SMITHERY_API_KEY')
    upstash_context7_mcp_toolset = MCPToolset(
        connection_params=StdioServerParameters(
            command="npx",
            args=["-y", "@smithery/cli@latest", "run", "@upstash/context7-mcp", "--key", smithery_api_key],
            env={"NODE_OPTIONS": "--no-warnings --experimental-fetch", "SMITHERY_API_KEY": smithery_api_key}
        )
    )
    mcp_toolsets.append(upstash_context7_mcp_toolset)
    print("✓ MCP tools initialized")

# 2. Langfuse Analytics Setup
langfuse = None
if features_enabled['langfuse']:
    langfuse = Langfuse(
        public_key=os.environ.get('LANGFUSE_PUBLIC_KEY'),
        secret_key=os.environ.get('LANGFUSE_SECRET_KEY'),
        host=os.environ.get('LANGFUSE_HOST', 'https://cloud.langfuse.com')
    )
    print("✓ Langfuse analytics initialized")

# 3. Memory Setup
memory = None
if features_enabled['memory']:
    memory = Memory()
    print("✓ Mem0 memory initialized")

# 4. Event Handling Setup
class CombinedEventHandler:
    def __init__(self):
        self.enabled_events = ["user_message", "agent_response", "tool_call", "error"]
        self.event_history = []
        
    def log_event(self, event_type: str, data: Any, user_id: str, session_id: str, metadata: dict = None):
        if event_type in self.enabled_events:
            event_record = {
                "timestamp": datetime.now().isoformat(),
                "type": event_type,
                "data": str(data)[:200],
                "user_id": user_id,
                "session_id": session_id,
                "metadata": metadata or {}
            }
            self.event_history.append(event_record)
            print(f"[EVENT] {event_type}: {str(data)[:100]}...")

event_handler = CombinedEventHandler()
print("✓ Event handling initialized")

# 5. Combined Functions
def create_comprehensive_trace(session_id: str, user_id: str, input_message: str):
    """Create analytics trace if Langfuse is available."""
    if not langfuse:
        return None
    try:
        return langfuse.trace(
            name="combined_agent_conversation",
            user_id=user_id,
            session_id=session_id,
            input=input_message
        )
    except Exception as e:
        print(f"Failed to create trace: {e}")
        return None

def add_to_comprehensive_memory(user_message: str, assistant_response: str, user_id: str):
    """Add to memory if available."""
    if not memory:
        return []
    try:
        conversation = [
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": assistant_response}
        ]
        return memory.add(conversation, user_id=user_id, metadata={"agent": "combined_agent"})
    except Exception as e:
        print(f"Failed to add to memory: {e}")
        return []

def search_comprehensive_memory(query: str, user_id: str):
    """Search memory if available."""
    if not memory:
        return []
    try:
        return memory.search(query, user_id=user_id)
    except Exception as e:
        print(f"Failed to search memory: {e}")
        return []

# Create the comprehensive LlmAgent
available_features = [f for f, enabled in features_enabled.items() if enabled]
feature_list = ", ".join(available_features)

root_agent = LlmAgent(
    name="combined_agent",
    model="gemini-2.0-flash",
    description="Comprehensive agent with multiple AI features",
    instruction=f\"\"\"You are a comprehensive AI assistant with advanced capabilities.

ENABLED FEATURES: {feature_list}

CAPABILITIES:
{"- MCP Protocol tools for external operations" if features_enabled['mcp'] else ""}
{"- Langfuse analytics for conversation tracking" if features_enabled['langfuse'] else ""}
{"- Mem0 persistent memory for context retention" if features_enabled['memory'] else ""}
- Event handling for monitoring and debugging

AVAILABLE TOOLS:
{"- @upstash/context7-mcp for operations" if features_enabled['mcp'] else ""}

You can perform complex tasks using these integrated features while maintaining high performance and reliability.\"\"\",
    tools=mcp_toolsets
)

# Create session service and runner
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="combined_agent")

# Entry point for execution
if __name__ == "__main__":
    async def test_comprehensive_agent():
        # Create a session
        session = await session_service.create_session(
            app_name="combined_agent",
            user_id="test_user",
            session_id="test_session"
        )
        
        # Test message
        user_message = "Hello! I want to test all the combined features of this agent."
        message = types.Content(role='user', parts=[types.Part(text=user_message)])
        
        # Initialize analytics trace
        trace = create_comprehensive_trace("test_session", "test_user", user_message)
        
        # Search memory for context
        memory_results = search_comprehensive_memory(user_message, "test_user")
        if memory_results:
            print(f"Found {len(memory_results)} relevant memories")
        
        # Log user message event
        event_handler.log_event("user_message", user_message, "test_user", "test_session")
        
        # Run the agent
        results = []
        try:
            async for event in runner.run_async(
                user_id="test_user",
                session_id="test_session", 
                new_message=message
            ):
                results.append(event)
                event_handler.log_event("agent_response", event, "test_user", "test_session")
                
            print(f"Agent successfully ran! Number of events: {len(results)}")
            
            # Add to memory
            if results:
                assistant_response = str(results[-1]) if results else "No response"
                add_to_comprehensive_memory(user_message, assistant_response, "test_user")
            
            # Finalize analytics
            if trace:
                trace.update(output=f"Processed {len(results)} events", status="completed")
            
            print(f"\\n🎉 Combined agent test completed successfully!")
            print(f"Features used: {', '.join(available_features)}")
            
        except Exception as e:
            print(f"Error running comprehensive agent: {e}")
            event_handler.log_event("error", str(e), "test_user", "test_session")
            if trace:
                trace.update(output=f"Error: {e}", status="error")
    
    try:
        asyncio.run(test_comprehensive_agent())
    except Exception as e:
        print(f"Error running the agent: {e}")

__all__ = ['root_agent']`;

    default:
      return '';
  }
} 