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
${hasMcpTools ? `from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
import mcp
from mcp.client.streamable_http import streamablehttp_client` : 'from google.adk.tools import google_search'}
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

    # Create ${hasMcpTools ? 'MCP-enabled' : 'standard'} agent
    return LlmAgent(
        model='gemini-2.0-flash',
        name='${agentName}',
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
    runner = Runner(
        app_name='${langfuseConfig.projectName || 'agent_flow_project'}',
        agent=root_agent,
        session_service=InMemorySessionService(),
        inputs={
            'client': genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))  # Create a new client instance
        }
    )
    
    try:
        session = runner.session_service.create_session(
            state={}, app_name='${langfuseConfig.projectName || 'agent_flow_project'}', user_id='${langfuseConfig.projectName || 'agent'}_user'
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
import mcp
from mcp.client.streamable_http import streamablehttp_client

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

    # Create MCP-enabled agent
    return LlmAgent(
        model='gemini-2.0-flash',
        name='${agentName}',
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
    """Run the agent."""
    runner = Runner(
        app_name='${agentName}_app',
        agent=root_agent,
        session_service=InMemorySessionService(),
        inputs={
            'client': genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))  # Create a new client instance
        }
    )
    
    try:
        session = runner.session_service.create_session(
            state={}, app_name='${agentName}_app', user_id='${agentName}_user'
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
  // Check for Langfuse nodes first
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
    langfuseConfig: langfuseConfig ? 'detected' : 'none',
    mcpNodes: mcpNodes.length,
    mcpConfigs: mcpConfigs ? mcpConfigs.length : 0,
    nodeTypes: nodes.map(n => ({ id: n.id, type: n.data.type, label: n.data.label }))
  });

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

  // No Langfuse, use standard generation
  console.log('No Langfuse detected, using standard generation');
  
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

  // Enhanced prompts for Langfuse integration
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

  // Create comprehensive system prompt based on detected node types
  let systemPrompt = mcpEnabled ?
    `You are an expert Python developer specializing in Google ADK (Agent Development Kit) with MCP (Model Context Protocol) integration using Smithery.

    CRITICAL: Generate MCP-enabled agent code, NOT Google Search code.

    MANDATORY CORRECT STRUCTURE:
    - MUST use "from google.adk.agents import LlmAgent"
    - MUST create root_agent = LlmAgent(...) directly (no custom classes)
    - MUST use MCPToolset with StdioServerParameters for Smithery MCP integration
    - MUST include Runner and InMemorySessionService
    - MUST use proper async pattern with run_async
    - MUST include SMITHERY_API_KEY environment variable handling

    CRITICAL ERROR PREVENTION (LlmAgent Validation Errors):
    1. LlmAgent constructor MUST use these exact parameter names in this order:
       - name (string) - SIMPLE, non-empty string like "agent_name"
       - model (string) - ALWAYS "gemini-2.0-flash"
       - description (string) - CONCISE, 10-100 chars
       - instruction (string) - REASONABLE length, NOT "instructions"
       - tools (list) - MUST be list [toolset] (NOT "toolset=" or None)
    2. Runner constructor MUST include app_name parameter
    3. ALWAYS include SMITHERY_API_KEY validation check
    4. MCP args MUST include --key parameter
    5. Use run_async() NOT run_forever() with proper async pattern` :
    `You are an expert Python developer specializing in Google ADK (Agent Development Kit).
    Generate clean, production-ready Python code for an agent based on the provided node configuration.

    CRITICAL ERROR PREVENTION:
    1. Agent constructor MUST use these exact parameter names in this order:
       - name (string)
       - model (string) - ALWAYS "gemini-2.0-flash" 
       - description (string)
       - instruction (string)
       - tools (list)
    2. Use Agent class (not LlmAgent) for non-MCP agents
    3. ALWAYS include __all__ = ["root_agent"] export`;

  // Add Langfuse-specific instructions if detected
  if (langfuseConfig) {
    systemPrompt += `

    LANGFUSE ANALYTICS INTEGRATION REQUIRED:
    - Import langfuse: from langfuse import Langfuse
    - Initialize with environment variables (LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST)
    - Create track_conversation function that logs interactions
    - Wrap agent with AnalyticsAgent class for automatic tracking
    - Include error tracking and session monitoring
    - Project name: ${langfuseConfig.projectName}
    - Host: ${langfuseConfig.host}
    - MUST export analytics_agent and track_conversation`;
  }

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

  const userPrompt = `Generate a Google ADK agent based on this flow configuration:

**NODES CONFIGURATION:**
${JSON.stringify(nodeData, null, 2)}

**AGENT CONFIGURATION:**
${agentNodes.length > 0 ? `
- Agent Name: ${agentNodes[0].data.label || 'search_agent'}
- Description: ${agentNodes[0].data.description || 'AI agent for task automation'}
- Instructions: ${agentNodes[0].data.instruction || agentNodes[0].data.prompt || 'Use available tools to help users'}
` : 'No agent nodes found - create a default search agent'}

**MCP CONFIGURATION:**
${mcpEnabled ? `Enabled with ${mcpNodes.length} MCP nodes
MCP Tools to include:
${mcpDetails.map(detail => `
- Package: ${detail.package}
- Command: ${detail.command}
- Args: ${JSON.stringify(detail.args)}
- Environment: ${JSON.stringify(detail.envVars)}`).join('')}

CRITICAL: 
- Generate EXACTLY ONE MCPToolset per unique MCP package
- Use deduplication logic to prevent duplicate toolsets
- Ensure each toolset has unique variable name
- Include SMITHERY_API_KEY environment variable` : 'Disabled - use google_search tool instead'}

${langfuseConfig ? `
**LANGFUSE ANALYTICS CONFIGURATION:**
- Enabled: YES
- Project: ${langfuseConfig.projectName}
- Host: ${langfuseConfig.host}
- Public Key: Environment variable LANGFUSE_PUBLIC_KEY
- Secret Key: Environment variable LANGFUSE_SECRET_KEY
- Requirements:
  * Import langfuse and initialize with environment variables
  * Create track_conversation function for interaction logging
  * Wrap agent with AnalyticsAgent class
  * Include error tracking and session monitoring
  * Export analytics_agent and track_conversation functions` : ''}

**OUTPUT REQUIREMENTS:**
1. Generate complete, runnable Python code
2. Include all necessary imports
3. Follow exact parameter order for LlmAgent/Agent constructors
4. Include proper error handling and logging
5. Add __all__ export with required components
6. NO duplicate MCP toolsets (critical!)
7. Include comprehensive comments

Return ONLY the complete Python code, no explanations or markdown.`;

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

    return cleanedCode;
 } catch (error) {
  console.error('Error calling OpenRouter API:', error);
  // Fall back to local generation
  return generateADKCode(nodes, _edges, dedupedConfig);
}

}