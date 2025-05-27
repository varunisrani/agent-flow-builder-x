import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '@/components/nodes/BaseNode';

export interface MCPConfig {
  enabled: boolean;
  type: string;  // Type of MCP (github, time, filesystem, etc.)
  command: string;
  args: string[];
  envVars: { [key: string]: string };
  mcpType?: string;  // Optional now as type serves the same purpose
  availableFunctions?: string;  // Documentation of available functions
}

export function generateMCPCode(nodes: Node<BaseNodeData>[], edges: Edge[], mcpConfig: MCPConfig): string {
  const agentNode = nodes.find(n => n.data.type === 'agent');
  if (!agentNode) {
    return generateDefaultSearchAgentCode();
  }

  // Extract agent details
  const agentName = agentNode.data.label?.toLowerCase().replace(/\s+/g, '_') || 'mcp_agent';
  const agentPrompt = agentNode.data.prompt || agentNode.data.instruction || agentNode.data.description;
  const agentDescription = agentNode.data.description || 
    (agentPrompt ? `Agent that ${agentPrompt.split('\n')[0].toLowerCase()}` : 'MCP-enabled agent');
  const agentInstruction = agentNode.data.instruction || agentPrompt;
  const agentClassName = agentName.charAt(0).toUpperCase() + agentName.slice(1) + 'Agent';

  // Get MCP tool nodes
  const mcpToolNodes = nodes.filter(n => n.data.type === 'mcp-tool');
  const mcpClientNodes = nodes.filter(n => n.data.type === 'mcp-client');
  
  // Extract MCP details from nodes if possible
  const mcpType = mcpConfig.type || 
    (mcpToolNodes.length > 0 && mcpToolNodes[0].data.mcpToolId as string) || 
    (mcpClientNodes.length > 0 && mcpClientNodes[0].data.mcpType as string) || 
    'github';
  
  // Extract MCP command and args from node data if available
  const mcpCommand = mcpConfig.command || 
    (mcpToolNodes.length > 0 && mcpToolNodes[0].data.mcpCommand as string) || 
    getMcpDefaultCommand(mcpType);
    
  const mcpArgs = mcpConfig.args || 
    (mcpToolNodes.length > 0 && mcpToolNodes[0].data.mcpArgs ? 
      (mcpToolNodes[0].data.mcpArgs as string).split(' ').filter(Boolean) : 
      getMcpDefaultArgs(mcpType));
  
  // Extract env vars from node data if available
  let mcpEnvVars = mcpConfig.envVars || {};
  if (mcpToolNodes.length > 0 && mcpToolNodes[0].data.mcpEnvVars) {
    try {
      mcpEnvVars = JSON.parse(mcpToolNodes[0].data.mcpEnvVars as string);
    } catch (e) {
      console.error('Error parsing mcpEnvVars:', e);
    }
  } 
  if (Object.keys(mcpEnvVars).length === 0) {
    mcpEnvVars = getMcpDefaultEnvVars(mcpType);
  }
  
  const toolDocs = mcpToolNodes.map(node => ({
    name: node.data.label,
    description: node.data.description || '',
    type: node.data.mcpToolId || mcpType
  }));

  // Generate code based on MCP type
  const imports = getImportsForMcpType(mcpType);
  const globalVars = getGlobalVarsForMcpType(mcpType);
  const getToolsFunction = getToolsAsyncForMcpType(mcpType, mcpCommand, mcpArgs, mcpEnvVars);
  const agentClass = getAgentClassForMcpType(mcpType, agentClassName);
  const rootAgent = getRootAgentForMcpType(mcpType, agentClassName, agentName, agentDescription, agentInstruction || '', toolDocs);
  const mainFunction = getMainFunctionForMcpType(mcpType, agentName);

  // Combine all code sections
  return `"""${mcpType.toUpperCase()} MCP Agent"""
${imports}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("${agentName}")

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

${globalVars}

${getToolsFunction}

${agentClass}

${rootAgent}

${mainFunction}

if __name__ == "__main__":
    asyncio.run(main())`
}

// Helper functions for MCP code generation

function getMcpDefaultCommand(mcpType: string): string {
  switch (mcpType.toLowerCase()) {
    case 'github':
      return 'npx';
    case 'time':
      return 'uvx';
    case 'filesystem':
      return 'npx';
    default:
      return 'npx';
  }
}

function getMcpDefaultArgs(mcpType: string): string[] {
  switch (mcpType.toLowerCase()) {
    case 'github':
      return ['-y', '@modelcontextprotocol/server-github'];
    case 'time':
      return ['mcp-server-time', '--local-timezone', Intl.DateTimeFormat().resolvedOptions().timeZone];
    case 'filesystem':
      return ['-y', '@modelcontextprotocol/server-filesystem'];
    default:
      return ['-y', `@modelcontextprotocol/server-${mcpType.toLowerCase()}`];
  }
}

function getMcpDefaultEnvVars(mcpType: string): { [key: string]: string } {
  const baseVars = {
    'NODE_OPTIONS': '--no-warnings --experimental-fetch'
  };
  
  switch (mcpType.toLowerCase()) {
    case 'github':
      return {
        ...baseVars,
        'GITHUB_PERSONAL_ACCESS_TOKEN': ''
      };
    case 'time':
      return {
        ...baseVars,
        'LOCAL_TIMEZONE': Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    case 'filesystem':
      return baseVars;
    default:
      return baseVars;
  }
}

function getImportsForMcpType(mcpType: string): string {
  const baseImports = `import os
import asyncio
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters`;

  // Add type-specific imports
  switch (mcpType.toLowerCase()) {
    case 'github':
      return baseImports;
    case 'time':
      return baseImports;
    case 'filesystem':
      return baseImports;
    default:
      return baseImports;
  }
}

function getGlobalVarsForMcpType(mcpType: string): string {
  const baseVars = `# Configure Google AI client
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

# Initialize Google AI client
genai_client = genai.Client(api_key=GOOGLE_API_KEY)

# Global state
_tools = None
_exit_stack = None`;

  // Add type-specific global variables
  switch (mcpType.toLowerCase()) {
    case 'github':
      return `${baseVars}
GITHUB_TOKEN = os.getenv('GITHUB_PERSONAL_ACCESS_TOKEN')`;
    case 'time':
      return `${baseVars}
LOCAL_TIMEZONE = os.getenv('LOCAL_TIMEZONE') or Intl.DateTimeFormat().resolvedOptions().timeZone`;
    case 'filesystem':
      return baseVars;
    default:
      return baseVars;
  }
}

function getToolsAsyncForMcpType(
  mcpType: string, 
  command: string, 
  args: string[], 
  envVars: { [key: string]: string }
): string {
  const baseFunction = `async def get_tools_async():
    """Gets tools from the ${mcpType.toUpperCase()} MCP Server."""
    tools, exit_stack = await MCPToolset.from_server(
        connection_params=StdioServerParameters(
            command='${command}',
            args=${JSON.stringify(args)},
            env=${JSON.stringify(envVars, null, 4)}
        )
    )`;

  // Add type-specific logic for filtering tools
  switch (mcpType.toLowerCase()) {
    case 'github':
      return `${baseFunction}
    # Filter out any problematic tools if needed
    return [t for t in tools if t.name != "create_pull_request_review"], exit_stack`;
    case 'time':
      return `${baseFunction}
    return tools, exit_stack`;
    case 'filesystem':
      return `${baseFunction}
    return tools, exit_stack`;
    default:
      return `${baseFunction}
    return tools, exit_stack`;
  }
}

function getAgentClassForMcpType(mcpType: string, agentClassName: string): string {
  return `class ${agentClassName}(LlmAgent):
    async def _run_async_impl(self, ctx):
        if not self.tools:
            global _tools, _exit_stack
            self.tools, _exit_stack = await get_tools_async()
            _tools = self.tools
        async for event in super()._run_async_impl(ctx):
            yield event`;
}

function getRootAgentForMcpType(
  mcpType: string, 
  agentClassName: string, 
  agentName: string, 
  agentDescription: string, 
  agentInstruction: string, 
  toolDocs: { name: string, description: string, type: string }[]
): string {
  // Get type-specific instructions
  let instructions = agentInstruction;
  if (!instructions) {
    switch (mcpType.toLowerCase()) {
      case 'github':
        instructions = `GitHub assistant for repository operations.
Available functions:
- search_repositories(query="search term")
- get_repository(owner="owner", repo="repo")
- list_issues(owner="owner", repo="repo")
- create_issue(owner="owner", repo="repo", title="", body="")
- get_user(username="username")
- list_pull_requests(owner="owner", repo="repo")
- get_pull_request(owner="owner", repo="repo", pull_number=123)
- merge_pull_request(owner="owner", repo="repo", pull_number=123)

Note: Pull request review functionality is not available.`;
        break;
      case 'time':
        instructions = `You are a helpful assistant that can perform time-related operations.

Available functions:
- get_current_time(timezone="IANA timezone name") - Get current time in a specific timezone
- convert_time(source_timezone="source IANA timezone", time="HH:MM", target_timezone="target IANA timezone") - Convert time between timezones

IMPORTANT RULES:
1. Always use valid IANA timezone names (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo')
2. Use 24-hour format for time (HH:MM)
3. Handle timezone conversions carefully
4. Provide clear explanations for time calculations`;
        break;
      case 'filesystem':
        instructions = `Filesystem operations assistant.

Available functions:
- read_file(path="file path") - Read contents of a file
- write_file(path="file path", content="content") - Write content to a file
- list_directory(path="directory path") - List contents of a directory
- file_exists(path="file path") - Check if a file exists
- make_directory(path="directory path") - Create a directory`;
        break;
      default:
        instructions = `${mcpType} operations assistant. Use the available MCP tools to help users with their requests.`;
    }
  }

  return `# Create the agent
root_agent = ${agentClassName}(
    model="gemini-2.0-flash",
    name="${agentName}",
    description="${agentDescription}",
    instruction="""${instructions}

${toolDocs.length > 0 ? `Available MCP Tools:
${toolDocs.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}` : ''}

IMPORTANT RULES:
1. Always use the appropriate MCP tool for the task
2. Handle errors gracefully
3. Provide clear feedback about tool operations
4. Follow best practices for ${mcpType} operations""",
    tools=[]  # Tools will be loaded dynamically from MCP server
)`;
}

function getMainFunctionForMcpType(mcpType: string, agentName: string): string {
  // Get type-specific default prompt
  let defaultPrompt: string;
  switch (mcpType.toLowerCase()) {
    case 'github':
      defaultPrompt = 'Search for popular Python libraries';
      break;
    case 'time':
      defaultPrompt = 'What is the current time in Tokyo?';
      break;
    case 'filesystem':
      defaultPrompt = 'List the files in the current directory';
      break;
    default:
      defaultPrompt = `What can you help me with using ${mcpType}?`;
  }

  return `async def main():
    """Run the agent."""
    runner = Runner(
        app_name='${mcpType}_mcp_app',
        agent=root_agent,
        session_service=InMemorySessionService(),
        inputs={
            'client': genai_client
        }
    )
    
    try:
        session = runner.session_service.create_session(
            state={}, app_name='${mcpType}_mcp_app', user_id='${mcpType}_user'
        )
        async for event in runner.run_async(
            session_id=session.id,
            user_id=session.user_id,
            new_message=types.Content(
                role='user',
                parts=[types.Part(text="${defaultPrompt}")]
            )
        ):
            print(event)
    except KeyboardInterrupt:
        logger.info("Shutting down gracefully...")
    finally:
        if hasattr(root_agent, '_exit_stack'):
            await root_agent._exit_stack.aclose()`
}

export function generateDefaultSearchAgentCode(): string {
  return `"""Default Search Agent"""
import logging
from google.adk.agents import Agent
from google.adk.tools import google_search

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("search_agent")

# Create the agent
root_agent = Agent(
    model="gemini-2.0-flash",
    name="search_agent",
    description="Agent that performs web searches and provides accurate information",
    instruction="Use Google Search to find accurate and up-to-date information. Always cite your sources.",
    tools=[google_search]
)

__all__ = ["root_agent"]`
}

// Helper function to detect MCP code
export function isMcpCode(code: string): boolean {
  const mcpIndicators = [
    'MCPToolset',
    'get_tools_async',
    'StdioServerParameters',
    'from_server',
    'exit_stack',
    '_run_async_impl'
  ];
  
  // Check if any of the MCP indicators are present in the code
  return mcpIndicators.some(indicator => code.includes(indicator));
}

// Helper function to generate default MCP code (for fallback)
export function generateFallbackMcpCode(mcpType: string = 'github'): string {
  return `"""${mcpType.toUpperCase()} MCP Agent"""
import os
import asyncio
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("${mcpType}_agent")

# Load environment variables
load_dotenv()

# Global state
_tools = None
_exit_stack = None

async def get_tools_async():
    """Gets tools from the ${mcpType.toUpperCase()} MCP Server."""
    tools, exit_stack = await MCPToolset.from_server(
        connection_params=StdioServerParameters(
            command='npx',
            args=['-y', '@modelcontextprotocol/server-${mcpType}'],
            env={
                'NODE_OPTIONS': '--no-warnings --experimental-fetch'
            }
        )
    )
    return tools, exit_stack

class ${mcpType.charAt(0).toUpperCase() + mcpType.slice(1)}Agent(LlmAgent):
    async def _run_async_impl(self, ctx):
        if not self.tools:
            global _tools, _exit_stack
            self.tools, _exit_stack = await get_tools_async()
            _tools = self.tools
        async for event in super()._run_async_impl(ctx):
            yield event

# Create the agent
root_agent = ${mcpType.charAt(0).toUpperCase() + mcpType.slice(1)}Agent(
    model="gemini-2.0-flash",
    name="${mcpType}_agent",
    description="${mcpType} operations assistant",
    instruction="""${mcpType} operations assistant. Use the available MCP tools to help users with their requests.""",
    tools=[]
)

async def main():
    """Run the agent."""
    runner = Runner(
        app_name='${mcpType}_mcp_app',
        agent=root_agent,
        session_service=InMemorySessionService()
    )
    
    try:
        session = runner.session_service.create_session(
            state={}, app_name='${mcpType}_mcp_app', user_id='${mcpType}_user'
        )
        async for event in runner.run_async(
            session_id=session.id,
            user_id=session.user_id,
            new_message=types.Content(
                role='user',
                parts=[types.Part(text="What can you help me with?")]
            )
        ):
            print(event)
    finally:
        if hasattr(root_agent, '_exit_stack'):
            await root_agent._exit_stack.aclose()

if __name__ == "__main__":
    asyncio.run(main())`
}

export function generateADKCode(nodes: Node<BaseNodeData>[], edges: Edge[]): string {
  const agentNode = nodes.find(n => n.data.type === 'agent');
  if (!agentNode) {
    return generateDefaultSearchAgentCode();
  }

  // Extract agent details
  const agentName = agentNode.data.label?.toLowerCase().replace(/\s+/g, '_') || 'search_agent';
  const agentPrompt = agentNode.data.prompt || agentNode.data.instruction || agentNode.data.description;
  const agentDescription = agentNode.data.description || 
    (agentPrompt ? `Agent that ${agentPrompt.split('\n')[0].toLowerCase()}` : 'Search agent');
  const agentInstruction = agentNode.data.instruction || agentPrompt || 'Use Google Search to find accurate information';

  // Find all connected tools
  const connectedNodes = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!connectedNodes.has(edge.source)) {
      connectedNodes.set(edge.source, []);
    }
    if (!connectedNodes.has(edge.target)) {
      connectedNodes.set(edge.target, []);
    }
    connectedNodes.get(edge.source)?.push(edge.target);
    connectedNodes.get(edge.target)?.push(edge.source);
  });

  // Get all tool nodes that are connected
  const toolNodes = nodes.filter(node => 
    (node.data.type === 'tool' || node.data.type === 'input') && 
    connectedNodes.has(node.id)
  );

  // Get all model nodes that are connected
  const modelNodes = nodes.filter(node => 
    node.data.type === 'model' && 
    connectedNodes.has(node.id)
  );

  let code = `"""${agentName.toUpperCase()} Agent"""
import os
import logging
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools import google_search
from typing import Dict, Any, List, Optional
from google.adk.tools.base_tool import BaseTool

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("${agentName}")

# Load environment variables
load_dotenv()

# Configure Google Search tool with agent's context
SEARCH_CONFIG = {
    "instruction": """${agentPrompt || 'Search and provide accurate information'}""",
    "examples": [
        {"input": "${agentPrompt ? agentPrompt.split('\n')[0] : 'Search query'}", "output": "Detailed search results with context and sources"},
        {"input": "Follow-up question about ${agentPrompt ? agentPrompt.split('\n')[0] : 'the topic'}", "output": "Additional information with citations"}
    ]
}

# Create a configured search tool
configured_search = google_search.with_config(SEARCH_CONFIG)
logger.info("Configured Google Search tool with agent-specific context")\n\n`;

  // Generate tool classes for each tool node
  toolNodes.forEach(toolNode => {
    const toolName = toolNode.data.label?.toLowerCase().replace(/\s+/g, '_');
    if (!toolName) return;

    const toolPrompt = toolNode.data.prompt || toolNode.data.description;
    if (!toolPrompt) return;
    
    code += `class ${toolName.charAt(0).toUpperCase() + toolName.slice(1)}Tool(BaseTool):
    """${toolPrompt}"""
    
    def __init__(self):
        super().__init__(
            name="${toolName}",
            description="${toolNode.data.description || toolPrompt}",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The input query or parameters"}
                },
                "required": ["query"]
            }
        )
    
    async def _call_async(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the tool functionality."""
        logger.info(f"Executing {self.name} with params: {params}")
        try:
            # TODO: Implement ${toolNode.data.label} functionality
            result = {"status": "success", "data": f"Executed {self.name} with {params}"}
            return result
        except Exception as e:
            logger.error(f"Error executing {self.name}: {e}")
            return {"status": "error", "message": str(e)}

# Initialize the tool
${toolName} = ${toolName.charAt(0).toUpperCase() + toolName.slice(1)}Tool()\n\n`;
  });

  // Create the agent with all tools
  code += `# Create the agent
root_agent = Agent(
    model="${modelNodes.length > 0 ? modelNodes[0].data.modelType || 'gemini-2.0-flash' : 'gemini-2.0-flash'}",
    name="${agentName}",
    description="${agentDescription}",
    instruction="""${agentInstruction}

Available Tools:
- Google Search: Search the web for accurate and up-to-date information
${toolNodes.map(node => `- ${node.data.label}: ${node.data.description || ''}`).join('\n')}

IMPORTANT RULES:
1. Use Google Search for finding accurate information
2. Use specialized tools for specific tasks
3. Always cite sources when using search
4. Handle errors gracefully
5. Provide clear explanations""",
    tools=[
        configured_search,  # Use the configured search tool
        ${toolNodes
          .filter(node => node.data.label)
          .map(node => node.data.label.toLowerCase().replace(/\s+/g, '_'))
          .join(',\n        ')}
    ]
)

logger.info(f"Created agent '{agentName}' with {toolNodes.length + 1} tools")

__all__ = ["root_agent"]

# Example usage:
if __name__ == "__main__":
    try:
        # Test the agent with the first line of the prompt as a query
        test_query = "${agentPrompt ? agentPrompt.split('\n')[0] : 'How can I help you?'}"
        logger.info(f"Testing agent with query: {test_query}")
        response = root_agent.chat(test_query)
        print("Agent Response:", response)
    except Exception as e:
        logger.error(f"Error testing agent: {e}")
        raise`

  return code;
} 

export async function generateCodeWithOpenAI(
  nodes: Node<BaseNodeData>[], 
  edges: Edge[], 
  mcpEnabled: boolean,
  mcpConfig?: MCPConfig
): Promise<string> {
  console.log('Generating code with OpenAI:', { mcpEnabled, mcpConfigPresent: !!mcpConfig, nodeCount: nodes.length });
  
  // If MCP is enabled and configuration is provided, generate MCP code
  if (mcpEnabled) {
    // Extract MCP configuration from nodes if not provided
    const effectiveMcpConfig = mcpConfig || extractMcpConfigFromNodes(nodes);
    console.log('Generating MCP code with config:', { type: effectiveMcpConfig.type, command: effectiveMcpConfig.command });
    return generateMCPCode(nodes, edges, effectiveMcpConfig);
  }
  
  // Otherwise generate standard ADK code with proper tool detection
  return generateADKCode(nodes, edges);
}

// Helper function to extract MCP config from nodes
function extractMcpConfigFromNodes(nodes: Node<BaseNodeData>[]): MCPConfig {
  const mcpClientNode = nodes.find(n => n.data.type === 'mcp-client');
  const mcpToolNodes = nodes.filter(n => n.data.type === 'mcp-tool');
  
  // Determine MCP type from nodes
  const mcpType = (mcpToolNodes.length > 0 ? mcpToolNodes[0].data.mcpToolId as string : undefined) ||
    (mcpClientNode?.data.mcpType as string) || 
    'github';
  
  // Extract MCP command and args from node data if available
  const mcpCommand = (mcpToolNodes.length > 0 && mcpToolNodes[0].data.mcpCommand as string) || 
    (mcpType === 'github' ? 'npx' : mcpType === 'time' ? 'uvx' : 'npx');
  
  const mcpArgs = mcpToolNodes.length > 0 && mcpToolNodes[0].data.mcpArgs ? 
    (mcpToolNodes[0].data.mcpArgs as string).split(' ').filter(Boolean) : 
    getMcpDefaultArgs(mcpType);
  
  // Extract env vars from node data if available
  let mcpEnvVars = {};
  if (mcpToolNodes.length > 0 && mcpToolNodes[0].data.mcpEnvVars) {
    try {
      mcpEnvVars = JSON.parse(mcpToolNodes[0].data.mcpEnvVars as string);
    } catch (e) {
      console.error('Error parsing mcpEnvVars:', e);
      mcpEnvVars = getMcpDefaultEnvVars(mcpType);
    }
  } else {
    mcpEnvVars = getMcpDefaultEnvVars(mcpType);
  }
  
  return {
    enabled: true,
    type: mcpType,
    command: mcpCommand,
    args: mcpArgs,
    envVars: mcpEnvVars
  };
} 