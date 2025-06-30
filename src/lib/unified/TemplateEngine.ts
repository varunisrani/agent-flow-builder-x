import type { UnifiedConfiguration, MCPConfig, LangfuseConfig, MemoryConfig, EventHandlingConfig } from './ConfigurationExtractor';
import type { GenerationMode } from './CodeGenerationEngine';
import { AdvancedCodeVerifier } from '../verification/AdvancedCodeVerifier';
import type { VerificationResult } from '../verification/types';

// Bridge interface for template compatibility
export interface ExtractedNodeData {
  agentName: string;
  agentDescription: string;
  agentInstruction: string;
  agentModel: string;
  mcpConfigs: MCPConfig[];
  langfuseConfig: LangfuseConfig | null;
  memoryConfig: MemoryConfig | null;
  eventHandlingConfig: EventHandlingConfig | null;
}

/**
 * Unified Template Engine
 * Comprehensive template generation with robust error handling and graceful degradation
 */
export class TemplateEngine {
  private advancedVerifier: AdvancedCodeVerifier;

  constructor(openRouterApiKey?: string) {
    this.advancedVerifier = new AdvancedCodeVerifier(openRouterApiKey);
  }

  /**
   * Get verification options based on generation mode
   */
  private getVerificationOptionsForMode(mode: GenerationMode): {
    enableLangfuseChecks: boolean;
    enableMcpChecks: boolean;
    enableEventHandlingChecks: boolean;
    enableMemoryChecks: boolean;
  } {
    switch (mode) {
      case 'langfuse':
        return {
          enableLangfuseChecks: true,
          enableMcpChecks: false,
          enableEventHandlingChecks: false,
          enableMemoryChecks: false
        };
      
      case 'mcp':
        return {
          enableLangfuseChecks: false,
          enableMcpChecks: true,
          enableEventHandlingChecks: false,
          enableMemoryChecks: false
        };
      
      case 'event-handling':
        return {
          enableLangfuseChecks: false,
          enableMcpChecks: false,
          enableEventHandlingChecks: true,
          enableMemoryChecks: false
        };
      
      case 'memory':
        return {
          enableLangfuseChecks: false,
          enableMcpChecks: false,
          enableEventHandlingChecks: false,
          enableMemoryChecks: true
        };
      
      case 'standard':
        return {
          enableLangfuseChecks: false,
          enableMcpChecks: false,
          enableEventHandlingChecks: false,
          enableMemoryChecks: false
        };
      
      case 'combined':
        // For combined mode, enable checks based on detected features
        return {
          enableLangfuseChecks: true,
          enableMcpChecks: true,
          enableEventHandlingChecks: true,
          enableMemoryChecks: true
        };
      
      default:
        // Default to no specific checks
        return {
          enableLangfuseChecks: false,
          enableMcpChecks: false,
          enableEventHandlingChecks: false,
          enableMemoryChecks: false
        };
    }
  }

  /**
   * Generate code from template based on configuration and mode
   */
  async generateFromTemplate(
    configuration: UnifiedConfiguration,
    mode: GenerationMode
  ): Promise<string> {
    // Convert UnifiedConfiguration to ExtractedNodeData format
    const nodeData = this.convertToNodeData(configuration);
    
    switch (mode) {
      case 'standard':
        return this.generateBasicAgentTemplate(nodeData);
      
      case 'mcp':
        return this.generateMCPAgentTemplate(nodeData);
      
      case 'langfuse':
        return this.generateLangfuseAgentTemplate(nodeData);
      
      case 'memory':
        return this.generateMemoryAgentTemplate(nodeData);
      
      case 'event-handling':
        return this.generateEventHandlingAgentTemplate(nodeData);
      
      case 'combined':
        return this.generateCombinedTemplate(nodeData);
      
      default:
        return this.generateBasicAgentTemplate(nodeData);
    }
  }

  /**
   * Generate and verify template code with advanced error fixing
   */
  async generateAndVerifyTemplate(
    configuration: UnifiedConfiguration,
    mode: GenerationMode,
    options?: {
      enableVerification?: boolean;
      enableAIFixes?: boolean;
      openRouterApiKey?: string;
      onProgress?: (progress: { step: string; progress: number; message: string }) => void;
    }
  ): Promise<{
    code: string;
    verification?: VerificationResult;
    metadata: {
      generationTime: number;
      verificationTime?: number;
      errorsFixed: number;
      langfuseErrorsFixed: number;
      eventHandlingErrorsFixed: number;
    };
  }> {
    const startTime = performance.now();
    
    // Step 1: Generate template code
    options?.onProgress?.({
      step: 'template-generation',
      progress: 20,
      message: `Generating ${mode} template...`
    });
    
    let generatedCode = await this.generateFromTemplate(configuration, mode);
    const generationTime = performance.now() - startTime;
    
    let verification: VerificationResult | undefined;
    let verificationTime = 0;
    
    // Step 2: Verify and fix if enabled
    if (options?.enableVerification !== false) {
      options?.onProgress?.({
        step: 'verification',
        progress: 60,
        message: 'Verifying template code and fixing errors...'
      });
      
      const verificationStart = performance.now();
      
      // Update API key if provided
      if (options?.openRouterApiKey) {
        this.advancedVerifier.setOpenRouterApiKey(options.openRouterApiKey);
      }
      
      // Get mode-specific verification options
      const modeVerificationOptions = this.getVerificationOptionsForMode(mode);
      
      verification = await this.advancedVerifier.verifyAndFix(generatedCode, {
        ...modeVerificationOptions,
        enableAIFixes: options?.enableAIFixes !== false,
        enablePatternFixes: true,
        maxAIRetries: 1, // Templates are usually simpler, so fewer retries needed
        confidenceThreshold: 80,
        onProgress: (progress) => {
          options?.onProgress?.({
            step: 'verification',
            progress: 60 + (progress.progress * 0.3),
            message: progress.message
          });
        },
        openRouterApiKey: options?.openRouterApiKey
      });
      
      verificationTime = performance.now() - verificationStart;
      
      // Use fixed code if available
      if (verification.fixedCode && verification.metadata.fixesApplied > 0) {
        generatedCode = verification.fixedCode;
        options?.onProgress?.({
          step: 'verification',
          progress: 90,
          message: `Applied ${verification.metadata.fixesApplied} fixes to template code`
        });
      }
    }
    
    options?.onProgress?.({
      step: 'complete',
      progress: 100,
      message: 'Template generation and verification completed'
    });
    
    // Calculate metadata
    const errorsFixed = verification?.metadata.fixesApplied || 0;
    const langfuseErrorsFixed = verification?.errors.filter(e => 
      e.category === 'langfuse' && e.fixed
    ).length || 0;
    const eventHandlingErrorsFixed = verification?.errors.filter(e => 
      e.category === 'event-handling' && e.fixed
    ).length || 0;
    
    return {
      code: generatedCode,
      verification,
      metadata: {
        generationTime,
        verificationTime: verificationTime > 0 ? verificationTime : undefined,
        errorsFixed,
        langfuseErrorsFixed,
        eventHandlingErrorsFixed
      }
    };
  }

  /**
   * Convert UnifiedConfiguration to ExtractedNodeData format for template compatibility
   */
  private convertToNodeData(config: UnifiedConfiguration): ExtractedNodeData {
    return {
      agentName: config.agentName,
      agentDescription: config.agentDescription,
      agentInstruction: config.agentInstruction,
      agentModel: config.agentModel,
      mcpConfigs: config.mcpConfigs || [],
      langfuseConfig: config.langfuseConfig,
      memoryConfig: config.memoryConfig,
      eventHandlingConfig: config.eventHandlingConfig
    };
  }

  /**
   * Generate a basic agent template using node data
   */
  private generateBasicAgentTemplate(nodeData: ExtractedNodeData): string {
    const { agentName, agentDescription, agentInstruction, agentModel } = nodeData;
    
    return `"""${agentName} - Basic Agent"""
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
  private generateMCPAgentTemplate(nodeData: ExtractedNodeData): string {
    const { agentName, agentDescription, agentInstruction, agentModel, mcpConfigs } = nodeData;
    
    // Generate MCP toolset configurations with conditional initialization
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
        config: `# MCP toolset configuration for ${config.smitheryMcp} (only if API key is available)
${varName} = None
if use_mcp:
    print("   Initializing ${varName}...")
    ${varName} = MCPToolset(
        connection_params=StdioServerParameters(
            command="${config.command}",
            args=${JSON.stringify(fixedArgs).replace('"smithery_api_key"', 'smithery_api_key')},
            env=${JSON.stringify({ ...config.envVars, "SMITHERY_API_KEY": "smithery_api_key" }).replace('"smithery_api_key"', 'smithery_api_key')}
        )
    )
else:
    print("   Skipping ${varName} (no API key)")`
      };
    });
    
    const toolsetDefs = toolsetConfigs.map(t => t.config).join('\n\n');
    const toolsetNames = toolsetConfigs.map(t => t.varName);
    const conditionalToolsArray = `[${toolsetNames.map(name => `${name}`).join(', ')} if ${toolsetNames.map(name => `${name}`).join(' and ')} else []]`;
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

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    # Don't exit here - let the agent continue without full functionality

# Set the Smithery API key from environment variable (optional for basic testing)
smithery_api_key = os.getenv("SMITHERY_API_KEY")
use_mcp = smithery_api_key is not None

print(f"🔧 MCP Configuration:")
print(f"   SMITHERY_API_KEY set: {use_mcp}")
print(f"   Will use MCP tools: {use_mcp}")

${toolsetDefs}

# Create the LlmAgent with MCP tools
root_agent = LlmAgent(
    name="${agentName}",
    model="${agentModel}",
    description="${agentDescription}",
    instruction="""${agentInstruction}

Available functions through MCP (when SMITHERY_API_KEY is set):
${availableFunctions}

When MCP is not available, the agent operates in basic mode without external tools and gracefully degrades functionality.

IMPORTANT RULES:
1. Use available MCP tools to perform requested operations when available
2. Always provide clear explanations for actions taken
3. Handle errors gracefully and provide helpful feedback
4. Gracefully handle scenarios when MCP tools are unavailable""",
    tools=${conditionalToolsArray}
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
  private generateLangfuseAgentTemplate(nodeData: ExtractedNodeData): string {
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
          config: `# MCP toolset configuration for ${config.smitheryMcp} (only if API key is available)
${varName} = None
if use_mcp:
    print("   Initializing ${varName}...")
    ${varName} = MCPToolset(
        connection_params=StdioServerParameters(
            command="${config.command}",
            args=${JSON.stringify(fixedArgs).replace('"smithery_api_key"', 'smithery_api_key')},
            env=${JSON.stringify({ ...config.envVars, "SMITHERY_API_KEY": "smithery_api_key" }).replace('"smithery_api_key"', 'smithery_api_key')}
        )
    )
else:
    print("   Skipping ${varName} (no API key)")`
        };
      });
      
      mcpSetupSection = `
# Set the Smithery API key from environment variable (optional for basic testing)
smithery_api_key = os.getenv("SMITHERY_API_KEY")
use_mcp = smithery_api_key is not None

print(f"🔧 MCP Configuration:")
print(f"   SMITHERY_API_KEY set: {use_mcp}")
print(f"   Will use MCP tools: {use_mcp}")

${toolsetConfigs.map(t => t.config).join('\n\n')}`;
      
      const toolsetNames = toolsetConfigs.map(t => t.varName);
      const conditionalToolsArray = `[${toolsetNames.map(name => `${name}`).join(', ')} if ${toolsetNames.map(name => `${name}`).join(' and ')} else []]`;
      toolsSection = conditionalToolsArray;
      
      availableFunctionsSection = `

Available functions through MCP (when SMITHERY_API_KEY is set):
${mcpConfigs.map(config => `- ${config.smitheryMcp} tools for ${config.availableFunctions || 'operations'}`).join('\n')}

When MCP is not available, the agent operates in basic mode without external tools and gracefully degrades functionality.`;
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

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    # Don't exit here - let the agent continue without full functionality
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
1. All interactions are automatically tracked through analytics${hasMCP ? '\n2. Use available MCP tools to perform requested operations when available\n3. Always provide clear explanations for actions taken\n4. Handle errors gracefully with automatic error tracking\n5. Gracefully handle scenarios when MCP tools are unavailable' : '\n2. Provide clear and helpful responses\n3. Handle errors gracefully with automatic error tracking'}""",
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
  private generateMemoryAgentTemplate(nodeData: ExtractedNodeData): string {
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
          config: `# MCP toolset configuration for ${config.smitheryMcp} (only if API key is available)
${varName} = None
if use_mcp:
    print("   Initializing ${varName}...")
    ${varName} = MCPToolset(
        connection_params=StdioServerParameters(
            command="${config.command}",
            args=${JSON.stringify(fixedArgs).replace('"smithery_api_key"', 'smithery_api_key')},
            env=${JSON.stringify({ ...config.envVars, "SMITHERY_API_KEY": "smithery_api_key" }).replace('"smithery_api_key"', 'smithery_api_key')}
        )
    )
else:
    print("   Skipping ${varName} (no API key)")`
        };
      });
      
      mcpSetupSection = `
# Set the Smithery API key from environment variable (optional for basic testing)
smithery_api_key = os.getenv("SMITHERY_API_KEY")
use_mcp = smithery_api_key is not None

print(f"🔧 MCP Configuration:")
print(f"   SMITHERY_API_KEY set: {use_mcp}")
print(f"   Will use MCP tools: {use_mcp}")

${toolsetConfigs.map(t => t.config).join('\n\n')}`;
      
      const toolsetNames = toolsetConfigs.map(t => t.varName);
      const conditionalToolsArray = `[${toolsetNames.map(name => `${name}`).join(', ')} if ${toolsetNames.map(name => `${name}`).join(' and ')} else []]`;
      toolsSection = conditionalToolsArray;
      
      availableFunctionsSection = `

Available functions through MCP (when SMITHERY_API_KEY is set):
${mcpConfigs.map(config => `- ${config.smitheryMcp} tools for ${config.availableFunctions || 'operations'}`).join('\n')}

When MCP is not available, the agent operates in basic mode without external tools and gracefully degrades functionality.`;
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

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    # Don't exit here - let the agent continue without full functionality
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
2. Remember user preferences and conversation history${hasMCP ? '\n3. Use available MCP tools to perform requested operations when available\n4. Always provide clear explanations for actions taken\n5. Gracefully handle scenarios when MCP tools are unavailable' : '\n3. Provide clear and helpful responses'}
6. Handle memory operations gracefully if memory is unavailable""",
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
   * Generate an event handling agent template using node data
   */
  private generateEventHandlingAgentTemplate(nodeData: ExtractedNodeData): string {
    const { agentName, agentDescription, agentInstruction, agentModel, eventHandlingConfig, mcpConfigs } = nodeData;
    
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
          config: `# MCP toolset configuration for ${config.smitheryMcp} (only if API key is available)
${varName} = None
if use_mcp:
    print("   Initializing ${varName}...")
    ${varName} = MCPToolset(
        connection_params=StdioServerParameters(
            command="${config.command}",
            args=${JSON.stringify(fixedArgs).replace('"smithery_api_key"', 'smithery_api_key')},
            env=${JSON.stringify({ ...config.envVars, "SMITHERY_API_KEY": "smithery_api_key" }).replace('"smithery_api_key"', 'smithery_api_key')}
        )
    )
else:
    print("   Skipping ${varName} (no API key)")`
        };
      });
      
      mcpSetupSection = `
# Set the Smithery API key from environment variable (optional for basic testing)
smithery_api_key = os.getenv("SMITHERY_API_KEY")
use_mcp = smithery_api_key is not None

print(f"🔧 MCP Configuration:")
print(f"   SMITHERY_API_KEY set: {use_mcp}")
print(f"   Will use MCP tools: {use_mcp}")

${toolsetConfigs.map(t => t.config).join('\n\n')}`;
      
      const toolsetNames = toolsetConfigs.map(t => t.varName);
      const conditionalToolsArray = `[${toolsetNames.map(name => `${name}`).join(', ')} if ${toolsetNames.map(name => `${name}`).join(' and ')} else []]`;
      toolsSection = conditionalToolsArray;
      
      availableFunctionsSection = `

Available functions through MCP (when SMITHERY_API_KEY is set):
${mcpConfigs.map(config => `- ${config.smitheryMcp} tools for ${config.availableFunctions || 'operations'}`).join('\n')}

When MCP is not available, the agent operates in basic mode without external tools and gracefully degrades functionality.`;
    }
    
    return `"""${agentName} - Event Handling Agent"""
import os
import asyncio
import logging
import json
from datetime import datetime
from typing import Dict, List, Any
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService${hasMCP ? '\nfrom google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters' : ''}
from google.genai import types

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    # Don't exit here - let the agent continue without full functionality
${mcpSetupSection}

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
            'user_message': ${(eventHandlingConfig?.listeners?.user_message ?? true) ? 'True' : 'False'},
            'agent_response': ${(eventHandlingConfig?.listeners?.agent_response ?? true) ? 'True' : 'False'},
            'tool_call': ${(eventHandlingConfig?.listeners?.tool_call ?? true) ? 'True' : 'False'},
            'error': ${(eventHandlingConfig?.listeners?.error ?? true) ? 'True' : 'False'}
        }
        self.analytics_enabled = ${(eventHandlingConfig?.analyticsEnabled ?? false) ? 'True' : 'False'}
        self.history_enabled = ${(eventHandlingConfig?.historyEnabled ?? true) ? 'True' : 'False'}
    
    def log_event(self, event_type: str, data: Dict[str, Any], user_id: str = "default"):
        """Log an event with comprehensive tracking."""
        if not self.listeners.get(event_type, False):
            return
        
        event = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'user_id': user_id,
            'agent_name': '${agentName}',
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

# Create the LlmAgent with event handling capabilities
root_agent = LlmAgent(
    name="${agentName}",
    model="${agentModel}",
    description="${agentDescription}",
    instruction="""${agentInstruction}${availableFunctionsSection}

EVENT HANDLING FEATURES:
- Comprehensive event tracking for all agent interactions
- Real-time event monitoring and logging to files and console
- Event history with filtering and analytics
- Configurable event listeners for different event types

IMPORTANT RULES:
1. All interactions are automatically tracked through the event handling system${hasMCP ? '\n2. Use available MCP tools to perform requested operations when available\n3. Always provide clear explanations for actions taken\n4. Gracefully handle scenarios when MCP tools are unavailable' : '\n2. Provide clear and helpful responses'}
5. Events are logged with timestamps and user context
6. Error handling includes automatic error event logging""",
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

    # Test message
    test_message = "Hello, agent! How does your event handling work?"
    
    # Log user message event
    event_handler.log_user_message(test_message, user_id)
    
    new_message = types.Content(
        role="user",
        parts=[types.Part(text=test_message)]
    )

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
    except Exception as e:
        # Log error event
        event_handler.log_error(type(e).__name__, str(e), user_id)
        print(f"❌ Error during agent execution: {e}")
        raise
    
    # Print comprehensive event statistics
    stats = event_handler.get_event_stats()
    print(f"\\n📊 Event Statistics:")
    print(f"   Total Events: {stats.get('total_events', 0)}")
    print(f"   Event Counts: {stats.get('event_counts', {})}")
    
    # Print recent events
    recent_events = event_handler.get_event_history(limit=10)
    print(f"\\n📋 Recent Events ({len(recent_events)}):")
    for i, event in enumerate(recent_events, 1):
        print(f"   {i}. [{event['event_type'].upper()}] {event['timestamp']}")
        print(f"      Data: {json.dumps(event['data'], indent=6)}")
    
    # Demonstrate event filtering
    user_events = event_handler.get_event_history(event_type='user_message')
    agent_events = event_handler.get_event_history(event_type='agent_response')
    print(f"\\n📈 Event Breakdown:")
    print(f"   User Messages: {len(user_events)}")
    print(f"   Agent Responses: {len(agent_events)}")
    
    print(f"\\n✅ Event handling demonstration completed!")
    print(f"📝 Check 'agent_events.log' for detailed event logs")

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent", "event_handler", "EventHandler"]`;
  }

  /**
   * Generate a combined template with multiple features
   */
  private generateCombinedTemplate(nodeData: ExtractedNodeData): string {
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
    if (hasEventHandling) {
      imports += '\nimport logging\nfrom datetime import datetime\nfrom typing import Dict, List, Any';
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
          config: `# MCP toolset configuration for ${config.smitheryMcp} (only if API key is available)
${varName} = None
if use_mcp:
    print("   Initializing ${varName}...")
    ${varName} = MCPToolset(
        connection_params=StdioServerParameters(
            command="${config.command}",
            args=${JSON.stringify(fixedArgs).replace('"smithery_api_key"', 'smithery_api_key')},
            env=${JSON.stringify({ ...config.envVars, "SMITHERY_API_KEY": "smithery_api_key" }).replace('"smithery_api_key"', 'smithery_api_key')}
        )
    )
else:
    print("   Skipping ${varName} (no API key)")`
        };
      });
      
      setupSections.push(`# MCP Configuration
smithery_api_key = os.getenv("SMITHERY_API_KEY")
use_mcp = smithery_api_key is not None

print(f"🔧 MCP Configuration:")
print(f"   SMITHERY_API_KEY set: {use_mcp}")
print(f"   Will use MCP tools: {use_mcp}")

${toolsetConfigs.map(t => t.config).join('\n\n')}`);
      
      const toolsetNames = toolsetConfigs.map(t => t.varName);
      const conditionalToolsArray = `[${toolsetNames.map(name => `${name}`).join(', ')} if ${toolsetNames.map(name => `${name}`).join(' and ')} else []]`;
      toolsSection = conditionalToolsArray;
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
    
    // Event Handling Setup
    if (hasEventHandling) {
      setupSections.push(`# Event Handling Setup
# Configure logging for event tracking
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agent_events.log'),
        logging.StreamHandler()
    ]
)
event_logger = logging.getLogger('agent_events')`);
      
      additionalFunctions.push(`# Event Handling Functions
class EventHandler:
    """Comprehensive event handling system for agent interactions."""
    
    def __init__(self):
        self.event_history: List[Dict[str, Any]] = []
        self.listeners = {
            'user_message': ${(eventHandlingConfig?.listeners?.user_message ?? true) ? 'True' : 'False'},
            'agent_response': ${(eventHandlingConfig?.listeners?.agent_response ?? true) ? 'True' : 'False'},
            'tool_call': ${(eventHandlingConfig?.listeners?.tool_call ?? true) ? 'True' : 'False'},
            'error': ${(eventHandlingConfig?.listeners?.error ?? true) ? 'True' : 'False'}
        }
        self.analytics_enabled = ${(eventHandlingConfig?.analyticsEnabled ?? false) ? 'True' : 'False'}
        self.history_enabled = ${(eventHandlingConfig?.historyEnabled ?? true) ? 'True' : 'False'}
    
    def log_event(self, event_type: str, data: Dict[str, Any], user_id: str = "default"):
        """Log an event with comprehensive tracking."""
        if not self.listeners.get(event_type, False):
            return
        
        event = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'user_id': user_id,
            'agent_name': '${agentName}',
            'data': data
        }
        
        # Log to file/console
        event_logger.info(f"[{event_type.upper()}] {data}")
        
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
            'message_length': len(message)
        }, user_id)
    
    def log_agent_response(self, response: str, user_id: str = "default"):
        """Log agent response event."""
        return self.log_event('agent_response', {
            'response': response,
            'response_length': len(response)
        }, user_id)
    
    def log_tool_call(self, tool_name: str, parameters: Dict[str, Any], result: str, user_id: str = "default"):
        """Log tool call event."""
        return self.log_event('tool_call', {
            'tool_name': tool_name,
            'parameters': parameters,
            'result': result,
            'success': True
        }, user_id)
    
    def log_error(self, error_type: str, error_message: str, user_id: str = "default"):
        """Log error event."""
        return self.log_event('error', {
            'error_type': error_type,
            'error_message': error_message
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
event_handler = EventHandler()`);
      
      exports.push('event_handler', 'EventHandler');
    }
    
    // Build instruction with all features
    let fullInstruction = agentInstruction;
    
    if (hasMCP) {
      fullInstruction += `\n\nAvailable functions through MCP (when SMITHERY_API_KEY is set):\n${mcpConfigs.map(config => `- ${config.smitheryMcp} tools for ${config.availableFunctions || 'operations'}`).join('\n')}\n\nWhen MCP is not available, the agent operates in basic mode without external tools and gracefully degrades functionality.`;
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
    
    if (hasMCP) fullInstruction += '\n2. Use available MCP tools to perform requested operations when available\n3. Gracefully handle scenarios when MCP tools are unavailable';
    if (hasLangfuse) fullInstruction += '\n4. All interactions are automatically tracked through analytics';
    if (hasMemory) fullInstruction += '\n5. Use memory context to provide personalized responses';
    
    return `"""${agentName} - Multi-Feature Agent"""
${imports}

# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for required API keys
if 'GOOGLE_API_KEY' not in os.environ:
    print("Warning: GOOGLE_API_KEY not set. Please set it to use the Gemini model.")
    # Don't exit here - let the agent continue without full functionality

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
    
    ${hasEventHandling ? `# Log user message event
    event_handler.log_user_message(test_message, user_id)` : ''}

    # Run the agent
    response_content = ""
    try:
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message
        ):
            print(event)
            response_content += str(event)
            
            ${hasEventHandling ? `# Log each agent event
            event_handler.log_agent_response(str(event), user_id)` : ''}
    except Exception as e:
        ${hasEventHandling ? `# Log error event
        event_handler.log_error(type(e).__name__, str(e), user_id)` : ''}
        print(f"Error during agent execution: {e}")
        raise
    
    ${hasLangfuse ? `# Track agent response
    track_conversation(session_id, user_id, {
        "event_type": "agent_response",
        "response": response_content
    })` : ''}
    
    ${hasEventHandling ? `# Print event statistics
    stats = event_handler.get_event_stats()
    print(f"\\n📊 Event Statistics: {stats}")
    
    # Print recent events
    recent_events = event_handler.get_event_history(limit=5)
    print(f"\\n📋 Recent Events ({len(recent_events)}):")
    for event in recent_events:
        print(f"  - [{event['event_type']}] {event['timestamp']}")` : ''}
    
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
   * Generate __init__.py file for the agent package
   */
  generateInitPy(): string {
    return `from .agent import root_agent

__all__ = ["root_agent"]`;
  }

  /**
   * Generate requirements.txt based on configuration
   */
  generateRequirements(config: UnifiedConfiguration): string {
    const requirements = [
      'google-adk',
      'python-dotenv',
      'mem0',
      'langfuse'
    ];

    if (config.mcpConfigs && config.mcpConfigs.length > 0) {
      requirements.push('mcp');
    }

    return requirements.join('\n');
  }

  /**
   * Generate .env.example file based on configuration
   */
  generateEnvExample(config: UnifiedConfiguration): string {
    let envContent = `# Environment Variables Template
# Copy this file to .env and replace placeholder values with your actual API keys
# NEVER commit real API keys to version control

# Required: Google AI API Key for agent models
GOOGLE_API_KEY=your_google_api_key_here

# Required: OpenAI API Key for language models
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Required: E2B API Keys for code execution sandbox
E2B_API_KEY=your_e2b_api_key_here
VITE_E2B_API_KEY=your_e2b_api_key_here

# Required: OpenRouter API Key for code generation
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here`;

    if (config.mcpConfigs && config.mcpConfigs.length > 0) {
      envContent += `\n\n# MCP Configuration: Smithery API Key for MCP tools
SMITHERY_API_KEY=your_smithery_api_key_here`;
    }

    if (config.langfuseConfig) {
      envContent += `\n\n# Langfuse Analytics Configuration
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key_here
LANGFUSE_SECRET_KEY=your_langfuse_secret_key_here
LANGFUSE_HOST=https://cloud.langfuse.com`;
    }

    if (config.memoryConfig) {
      envContent += `\n\n# Mem0 Memory Service Configuration
MEM0_API_KEY=your_mem0_api_key_here
MEM0_HOST=https://api.mem0.ai`;
    }

    envContent += `\n\n# Security Notes:
# 1. Replace all 'your_*_key_here' with actual API keys
# 2. Add .env to .gitignore to prevent accidental commits
# 3. Never share API keys in code, documentation, or logs
# 4. Regularly rotate your API keys for better security
# 5. Monitor API usage for suspicious activity`;

    return envContent;
  }

  /**
   * Get available templates based on configuration
   */
  getAvailableTemplates(config: UnifiedConfiguration): GenerationMode[] {
    const templates: GenerationMode[] = ['standard'];
    
    if (config.mcpConfigs && config.mcpConfigs.length > 0) {
      templates.push('mcp');
    }
    
    if (config.langfuseConfig) {
      templates.push('langfuse');
    }
    
    if (config.memoryConfig) {
      templates.push('memory');
    }
    
    if (config.eventHandlingConfig) {
      templates.push('event-handling');
    }
    
    // Add combined if multiple features
    const featureCount = [config.mcpConfigs?.length, config.langfuseConfig, config.memoryConfig, config.eventHandlingConfig].filter(f => f && (Array.isArray(f) ? f.length > 0 : true)).length;
    if (featureCount > 1) {
      templates.push('combined');
    }
    
    return templates;
  }

  /**
   * Route to appropriate template based on features detected
   */
  getRecommendedTemplate(config: UnifiedConfiguration): GenerationMode {
    const hasLangfuse = !!config.langfuseConfig;
    const hasMemory = !!config.memoryConfig;
    const hasEventHandling = !!config.eventHandlingConfig;
    const hasMCP = config.mcpConfigs && config.mcpConfigs.length > 0;
    
    // Count active features (excluding MCP which is often combined)
    const activeFeatures = [hasLangfuse, hasMemory, hasEventHandling].filter(Boolean).length;
    
    // Route to appropriate template
    if (activeFeatures > 1) {
      return 'combined';  // Multiple features - use combined template
    } else if (hasEventHandling) {
      return 'event-handling';  // Event handling only
    } else if (hasLangfuse) {
      return 'langfuse';  // Langfuse only
    } else if (hasMemory) {
      return 'memory';  // Memory only
    } else if (hasMCP) {
      return 'mcp';  // MCP only
    } else {
      return 'standard';  // Basic agent
    }
  }

  /**
   * Validate template configuration
   */
  validateTemplate(config: UnifiedConfiguration, mode: GenerationMode): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate agent configuration
    if (!config.agentName || config.agentName.length < 2) {
      errors.push('Agent name must be at least 2 characters long');
    }

    if (!config.agentInstruction || config.agentInstruction.length < 10) {
      errors.push('Agent instruction must be at least 10 characters long');
    }

    // Mode-specific validations
    switch (mode) {
      case 'mcp':
        if (!config.mcpConfigs || config.mcpConfigs.length === 0) {
          errors.push('MCP mode requires at least one MCP configuration');
        }
        config.mcpConfigs?.forEach((mcpConfig, index) => {
          if (!mcpConfig.smitheryMcp) {
            errors.push(`MCP configuration ${index + 1} is missing smitheryMcp package`);
          }
        });
        break;

      case 'langfuse':
        if (!config.langfuseConfig) {
          errors.push('Langfuse mode requires Langfuse configuration');
        } else if (!config.langfuseConfig.publicKey || !config.langfuseConfig.secretKey) {
          warnings.push('Langfuse configuration is incomplete - missing API keys');
        }
        break;

      case 'memory':
        if (!config.memoryConfig) {
          errors.push('Memory mode requires Memory configuration');
        } else if (!config.memoryConfig.apiKey) {
          warnings.push('Memory configuration is incomplete - missing API key');
        }
        break;

      case 'event-handling':
        if (!config.eventHandlingConfig) {
          errors.push('Event handling mode requires Event Handling configuration');
        }
        break;

      case 'combined':
        // Check that at least two features are enabled
        const features = [
          config.mcpConfigs?.length,
          config.langfuseConfig ? 1 : 0,
          config.memoryConfig ? 1 : 0,
          config.eventHandlingConfig ? 1 : 0
        ].filter(f => f && f > 0);
        
        if (features.length < 2) {
          errors.push('Combined mode requires at least two features to be configured');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Set OpenRouter API key for AI-powered error fixing
   */
  setOpenRouterApiKey(apiKey: string): void {
    this.advancedVerifier.setOpenRouterApiKey(apiKey);
  }

  /**
   * Get verification capabilities for templates
   */
  getTemplateVerificationCapabilities(): {
    langfuseErrorDetection: boolean;
    mcpErrorDetection: boolean;
    patternBasedFixes: boolean;
    aiPoweredFixes: boolean;
  } {
    return {
      langfuseErrorDetection: true,
      mcpErrorDetection: true,
      patternBasedFixes: true,
      aiPoweredFixes: this.advancedVerifier !== null
    };
  }
}