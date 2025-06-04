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
  availableFunctions?: string;
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
  mcpConfigs.forEach((cfg, idx) => {
    const mcpPackage = cfg.smitheryMcp || cfg.args.find(arg => arg.startsWith('@')) || '@smithery/mcp-example';
    const packageName = mcpPackage.split('/').pop() || `mcp_${idx}`;

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

    let fixedArgs = [...cfg.args];
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

    const toolset = `toolset${idx} = MCPToolset(
    connection_params=StdioServerParameters(
        command="${cfg.command}",
        args=${JSON.stringify(fixedArgs).replace('"smithery_api_key"', 'smithery_api_key').replace(/"\*\*\*.*?\*\*\*"/g, 'smithery_api_key')},
        env=${JSON.stringify({ ...cfg.envVars, "SMITHERY_API_KEY": "smithery_api_key" }).replace('"smithery_api_key"', 'smithery_api_key')}
    )
)`;

    toolsets.push(toolset);
  });

  const toolsetList = mcpConfigs.map((_, idx) => `toolset${idx}`).join(', ');

  return `from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.genai import types  # For Content/Part
import asyncio
import os

# Set the Smithery API key from environment variable
smithery_api_key = os.getenv("SMITHERY_API_KEY")
if not smithery_api_key:
    raise ValueError("SMITHERY_API_KEY environment variable is not set")

${toolsets.join('\n\n')}

# LlmAgent with MCP tools
root_agent = LlmAgent(
    name="${agentName}",
    model="gemini-2.0-flash",
    description="${agentDescription}",
    instruction="${agentInstruction}",
    tools=[${toolsetList}]
)

# Session service and runner setup - MUST INCLUDE app_name
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="${agentName}")

async def main():
    # Create a session
    user_id = "user"
    session = session_service.create_session(state={}, app_name="${agentName}", user_id=user_id)
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
export function generateADKCode(nodes: Node<BaseNodeData>[], _edges: Edge[]): string {
  // Check if there are MCP nodes to determine if we should use MCP
  const mcpNodes = nodes.filter(node =>
    node.data.type === 'mcp-client' ||
    node.data.type === 'mcp-server' ||
    node.data.type === 'mcp-tool'
  );

  if (mcpNodes.length > 0) {
    // Extract MCP package from node data
    const mcpNode = mcpNodes[0];
    const mcpPackage = (mcpNode.data.smitheryMcp as string) ||
                      (mcpNode.data.mcpToolId as string) ||
                      '@smithery/mcp-example';

    const defaultConfig: MCPConfig = {
      enabled: true,
      type: 'smithery',
      command: 'npx',
      args: ['-y', '@smithery/cli@latest', 'run', mcpPackage, '--key', 'smithery_api_key'],
      envVars: { 'NODE_OPTIONS': '--no-warnings --experimental-fetch', 'SMITHERY_API_KEY': 'smithery_api_key' },
      smitheryMcp: mcpPackage
    };
    return generateMCPCode(nodes, [defaultConfig]);
  }

  return generateDefaultSearchAgentCode();
}

// Generate code with verification layer
export async function generateVerifiedCode(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  mcpEnabled: boolean = true,
  apiKey?: string,
  onProgress?: (progress: VerificationProgress) => void
): Promise<string> {
  // Step 1: Generate initial code
  onProgress?.({
    step: "generation",
    progress: 20,
    message: "Generating initial code..."
  });

  let generatedCode: string;
  if (apiKey) {
    generatedCode = await generateCodeWithAI(nodes, edges, mcpEnabled, apiKey);
  } else {
    generatedCode = generateADKCode(nodes, edges);
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
    mcpPackage: mcpPackages.join(', '),
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
  apiKey?: string
): Promise<string> {
  const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

  if (!apiKey) {
    console.warn('No API key provided, falling back to local generation');
    return generateADKCode(nodes, _edges);
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

  const systemPrompt = mcpEnabled ?
    `You are an expert Python developer specializing in Google ADK with MCP integration. Generate clean, production-ready Python code for an agent based on the provided node configuration. Use MCPToolset with StdioServerParameters for MCP integration.` :
    `You are an expert Python developer specializing in Google ADK. Generate clean, production-ready Python code for an agent based on the provided node configuration. Use google_search tool for search capabilities.`;

  const userPrompt = `Generate a Google ADK agent based on this flow:

Nodes: ${JSON.stringify(nodeData, null, 2)}

Agent: ${agentNodes.length > 0 ? `${agentNodes[0].data.label || 'search_agent'} - ${agentNodes[0].data.description || 'AI agent'}` : 'Default search agent'}

MCP: ${mcpEnabled ? `Enabled (${mcpNodes.length} MCP nodes)` : 'Disabled'}

Return ONLY Python code, no explanations.`;

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
    return generateADKCode(nodes, _edges);
  }
}