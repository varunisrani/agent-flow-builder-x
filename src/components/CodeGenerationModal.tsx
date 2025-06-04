import React, { useState, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js';
import { Button } from '@/components/ui/button.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { BaseNodeData } from './nodes/BaseNode.js';
import { Copy, AlertCircle, Loader2, Play } from 'lucide-react';
import { toast } from '@/hooks/use-toast.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { generateMCPCode, MCPConfig, generateFallbackMcpCode, isMcpCode, generateVerifiedCode, dedupeConfigs } from '@/lib/codeGeneration';
import { type VerificationProgress, type VerificationResult } from '@/lib/codeVerification';

// OpenRouter configuration - Use environment variable for API key
// Hardcoded OpenRouter API Key (FOR DEMONSTRATION - NOT RECOMMENDED FOR PRODUCTION)
// const OPENROUTER_API_KEY = "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";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_BASE = import.meta.env.VITE_OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';

// Define proper type for code parameter
const CodeHighlighter: React.FC<{ code: string }> = ({ code }) => {
  return (
    <SyntaxHighlighter
      language="python"
      style={vscDarkPlus}
      showLineNumbers
      customStyle={{
        fontSize: '14px',
        borderRadius: '6px',
        maxHeight: '60vh',
        overflowY: 'auto',
        margin: 0,
        padding: '16px',
        backgroundColor: '#1E1E1E',
        border: '1px solid #333'
      }}
      lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap' } }}
      wrapLines={true}
    >
      {code}
    </SyntaxHighlighter>
  );
};

// Helper function to extract URLs from text
const extractUrls = (text: string): string[] => {
  // Match both localhost URLs and regular http/https URLs
  const urlRegex = /(https?:\/\/[^\s]+)|(localhost:[0-9]+[^\s]*)/g;
  return (text.match(urlRegex) || []).map(url => {
    // Ensure localhost URLs have http:// prefix
    if (url.startsWith('localhost')) {
      return `http://${url}`;
    }
    return url;
  });
};

// Component for verification progress display
const VerificationProgress: React.FC<{ progress: VerificationProgress | null }> = ({ progress }) => {
  if (!progress) return null;

  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-blue-800">{progress.message}</span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress.progress}%` }}
        ></div>
      </div>
      {progress.errors && progress.errors.length > 0 && (
        <div className="mt-2 text-xs text-blue-700">
          Found and fixed {progress.errors.length} error(s)
        </div>
      )}
    </div>
  );
};

// Component for sandbox output display
const SandboxOutput: React.FC<{ output: string }> = ({ output }) => {
  if (!output) return null;
  
  // Extract URLs from output
  const urls = extractUrls(output);
  
  return (
    <div className="mt-4 font-mono text-sm">
      <div className="bg-gray-900 rounded-md p-4 overflow-auto max-h-[200px]">
        <pre className="text-gray-200 whitespace-pre-wrap">{output}</pre>
        
        {urls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-700 pt-3">
            <span className="text-gray-400">Detected URLs:</span>
            {urls.map((url, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                onClick={() => window.open(url, '_blank')}
              >
                <span className="mr-1">Open UI</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                  className="h-3 w-3">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface CodeGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
  mcpConfig?: MCPConfig[];
}

// Helper function to get a unique key for the flow
function getFlowKey(nodes: Node<BaseNodeData>[], edges: Edge[]): string {
  const flowData = {
    nodes: nodes.map(n => ({ id: n.id, type: n.data.type, label: n.data.label })),
    edges: edges.map(e => ({ source: e.source, target: e.target }))
  };
  return btoa(JSON.stringify(flowData));
}

// Helper functions for localStorage
function getStoredCode(flowKey: string, framework: string): string | null {
  const key = `flow_code_${flowKey}_${framework}`;
  return localStorage.getItem(key);
}

function storeCode(flowKey: string, framework: string, code: string): void {
  const key = `flow_code_${flowKey}_${framework}`;
  localStorage.setItem(key, code);
}

// Helper function to clean generated code
function cleanGeneratedCode(code: string, forceMcp: boolean = false): string {
  code = code.replace(/```python\n/g, '').replace(/```\n?/g, '').trim();

  // If MCP is forced and code doesn't contain MCP indicators, generate MCP code
  if (forceMcp && !isMcpCode(code)) {
    console.log('Force MCP enabled but code is not MCP, generating fallback MCP code');
    return generateFallbackMcpCode();
  }

  // Only fallback to search agent if MCP is not forced and no ADK imports found
  if (!forceMcp && !code.includes('from google.adk.agents')) {
    console.log('No ADK imports found and MCP not forced, generating search agent');
    return generateDefaultSearchAgentCode();
  }

  return code;
}

// Helper function to generate default search agent code
const generateDefaultSearchAgentCode = (): string => {
  return `from google.adk.agents import Agent
from google.adk.tools import google_search

# FIXED: Use correct parameter order for Agent constructor
root_agent = Agent(
    name="search_agent",
    model="gemini-2.0-flash",
    description="An agent that uses Google Search to find and provide information.",
    instruction="Use Google Search to find accurate and up-to-date information. Always cite your sources and provide context from search results.",
    tools=[google_search]
)

__all__ = ["root_agent"]`;
};

// Helper function to format the code for display
function formatCodeForDisplay(code: string): string {
  return code.replace(/```python\n/g, '').replace(/```\n?/g, '').trim();
}

// Helper function to make OpenRouter API calls
async function callOpenRouter(messages: Array<{ role: string; content: string }>) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
      method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Agent Flow Builder'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages,
      temperature: 0.2,
      max_tokens: 3000
    })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

  const result = await response.json();
  return result.choices[0]?.message?.content || '';
}

// Function to extract MCP configuration from nodes
function extractMcpConfigFromNodes(nodes: Node<BaseNodeData>[]): MCPConfig[] {
  // Find MCP-related nodes
  const mcpNodes = nodes.filter(n =>
    n.data.type === 'mcp-client' ||
    n.data.type === 'mcp-server' ||
    n.data.type === 'mcp-tool'
  );

  if (mcpNodes.length === 0) {
    return [createDefaultMcpConfig()];
  }

  return mcpNodes.map(node => {
    const nodeData = node.data;

  // Extract MCP command and args
  const mcpCommand = (nodeData.mcpCommand as string) || 'npx';

  // Parse MCP args - could be string or array
  let mcpArgs: string[];
  if (nodeData.mcpArgs) {
    if (typeof nodeData.mcpArgs === 'string') {
      mcpArgs = nodeData.mcpArgs.split(' ').filter(Boolean);
    } else if (Array.isArray(nodeData.mcpArgs)) {
      mcpArgs = nodeData.mcpArgs;
    } else {
      mcpArgs = ['-y', '@smithery/cli@latest', 'run', '@smithery/mcp-example', '--key', 'smithery_api_key'];
    }
  } else {
    mcpArgs = ['-y', '@smithery/cli@latest', 'run', '@smithery/mcp-example', '--key', 'smithery_api_key'];
  }

  // Parse environment variables
  let envVars: { [key: string]: string };
  if (nodeData.mcpEnvVars) {
    if (typeof nodeData.mcpEnvVars === 'string') {
      try {
        envVars = JSON.parse(nodeData.mcpEnvVars);
      } catch {
        envVars = { 'NODE_OPTIONS': '--no-warnings --experimental-fetch' };
      }
    } else if (typeof nodeData.mcpEnvVars === 'object') {
      envVars = nodeData.mcpEnvVars as { [key: string]: string };
    } else {
      envVars = { 'NODE_OPTIONS': '--no-warnings --experimental-fetch' };
    }
  } else {
    envVars = { 'NODE_OPTIONS': '--no-warnings --experimental-fetch' };
  }

  // Extract MCP tool ID or package name - prioritize smitheryMcp over mcpToolId
  const smitheryMcp = (nodeData.smitheryMcp as string) || '';
  const mcpToolId = (nodeData.mcpToolId as string) || '';
  const mcpPackage = smitheryMcp || mcpToolId || '@smithery/mcp-example';

  // Extract Smithery API key
  const smitheryApiKey = (nodeData.smitheryApiKey as string) || '';

  // Update args to use the correct package name and API key
  if (mcpArgs.includes('@smithery/mcp-example') && mcpPackage !== '@smithery/mcp-example') {
    mcpArgs = mcpArgs.map(arg => arg === '@smithery/mcp-example' ? mcpPackage : arg);
  }

  // Ensure --key parameter is included in MCP args
  if (!mcpArgs.includes('--key')) {
    mcpArgs.push('--key', 'smithery_api_key');
  }

  // Fix CLI arguments to avoid "too many arguments" error
  // Remove duplicate --key parameters and ensure clean args
  const cleanedArgs: string[] = [];
  let skipNext = false;
  for (let i = 0; i < mcpArgs.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (mcpArgs[i] === '--key') {
      // Skip duplicate --key entries
      if (cleanedArgs.includes('--key')) {
        skipNext = true; // Skip the next argument (the key value)
        continue;
      }
    }
    cleanedArgs.push(mcpArgs[i]);
  }
  mcpArgs = cleanedArgs;

  // Ensure API key is in args if provided
  if (smitheryApiKey && !mcpArgs.includes(smitheryApiKey)) {
    // Replace 'smithery_api_key' placeholder with actual key
    mcpArgs = mcpArgs.map(arg => arg === 'smithery_api_key' ? smitheryApiKey : arg);
  }

    console.log('Extracted MCP config from nodes:', {
    command: mcpCommand,
    args: mcpArgs,
    envVars,
    mcpPackage,
    mcpToolId,
    smitheryMcp,
    smitheryApiKey: smitheryApiKey ? '***' : 'not provided'
  });

    return {
      enabled: true,
      type: 'smithery',
      command: mcpCommand,
      args: mcpArgs,
      envVars
    };
  });
}

// Function to generate code with OpenAI/OpenRouter based on node data
async function generateCodeWithOpenAI(
  nodes: Node<BaseNodeData>[],
  mcpEnabled: boolean,
  mcpConfig?: MCPConfig[]
): Promise<string> {
  // Extract actual MCP configuration from nodes if MCP is enabled
  const actualMcpConfigs = mcpEnabled ?
    (mcpConfig && mcpConfig.length > 0 ? mcpConfig : extractMcpConfigFromNodes(nodes)) :
    [createDefaultMcpConfig()];

  const firstConfig = actualMcpConfigs[0];
  console.log('Using MCP config for generation:', actualMcpConfigs);

  // Prepare node data for the AI prompt including MCP-specific data
  const nodeData = nodes.map(node => ({
    id: node.id,
    type: node.data.type,
    label: node.data.label,
    description: node.data.description || '',
    instruction: node.data.instruction || '',
    prompt: node.data.prompt || '',
    modelType: node.data.modelType || '',
    mcpCommand: node.data.mcpCommand || '',
    mcpArgs: node.data.mcpArgs || '',
    mcpEnvVars: node.data.mcpEnvVars || '',
    mcpToolId: node.data.mcpToolId || '',
    smitheryMcp: node.data.smitheryMcp || '',
    smitheryApiKey: node.data.smitheryApiKey ? '***HIDDEN***' : '',
    mcpType: node.data.mcpType || '',
    position: node.position
  }));

  // Find agent nodes to get main configuration
  const agentNodes = nodes.filter(n => n.data.type === 'agent');
  const mcpNodes = nodes.filter(n =>
    n.data.type === 'mcp-client' ||
    n.data.type === 'mcp-server' ||
    n.data.type === 'mcp-tool'
  );
  console.log('MCP nodes found:', mcpNodes.length);

  // Create system prompt based on whether MCP is enabled
  const systemPrompt = mcpEnabled ?
    `You are an expert Python developer specializing in Google ADK (Agent Development Kit) with MCP (Model Context Protocol) integration using Smithery.

    CRITICAL: Generate MCP-enabled agent code, NOT Google Search code.

    ABSOLUTELY FORBIDDEN:
    - NEVER use "from google_adk import" (this doesn't exist)
    - NEVER use "from mcp_toolset import" (this doesn't exist)
    - NEVER use "from llm_agent import" (this doesn't exist)
    - NEVER create custom classes like "class DocQueryAgent(Agent)" or "class TimeManagerAgent(LlmAgent)"
    - NEVER use non-existent classes like MCPClient, MCPTool, Model
    - NEVER use StdioServerParameters(agent=...) (wrong usage)
    - NEVER import sys for MCP agents

    MANDATORY CORRECT STRUCTURE:
    - MUST use "from google.adk.agents import LlmAgent"
    - MUST create root_agent = LlmAgent(...) directly (no custom classes)
    - MUST use MCPToolset with StdioServerParameters for Smithery MCP integration
    - MUST include Runner and InMemorySessionService
    - MUST use proper async pattern with run_async (NOT run_forever)
    - MUST include SMITHERY_API_KEY environment variable handling

    CRITICAL ERROR PREVENTION (LlmAgent Validation Errors):
    1. LlmAgent constructor MUST use these exact parameter names in this order:
       - name (string) - SIMPLE, non-empty string like "search_agent" (NOT complex/long names)
       - model (string) - ALWAYS "gemini-2.0-flash" (NEVER None or empty)
       - description (string) - CONCISE, 10-100 chars like "Agent that uses Gemini 2.0 model and Smithery MCP tool"
       - instruction (string) - REASONABLE length, NOT "instructions" (misspelling)
       - tools (list) - MUST be list [toolset] (NOT "toolset=" or None)
    2. Runner constructor MUST include app_name parameter: Runner(agent=root_agent, session_service=session_service, app_name="search_agent")
    3. SYNCHRONIZE app_name: Use SAME app_name in Runner and session_service.create_session() calls
    4. NEVER pass session_service to LlmAgent constructor
    5. ALWAYS include SMITHERY_API_KEY validation check after os.getenv()
    6. MCP args MUST include --key parameter: ["--key", smithery_api_key]
    7. Environment variables MUST include SMITHERY_API_KEY
    8. NEVER write "tools=tools=[toolset]" - use only "tools=[toolset]" (no duplicate tools=)
    9. Use run_async() NOT run_forever() with proper async pattern
    10. Include required imports: from google.genai import types, import asyncio

    EXACT REQUIRED IMPORTS:
    - from google.adk.agents import LlmAgent
    - from google.adk.runners import Runner
    - from google.adk.sessions import InMemorySessionService
    - from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
    - from google.genai import types
    - import asyncio
    - import os

    EXACT REQUIRED PATTERN:
    1. Import statements (as above)
    2. Environment variable setup (smithery_api_key = os.getenv("SMITHERY_API_KEY"))
    3. MCPToolset configuration with StdioServerParameters
    4. root_agent = LlmAgent(...) with correct parameters
    5. session_service = InMemorySessionService()
    6. runner = Runner(...) with app_name
    7. async def main() function with proper run_async pattern
    8. __all__ = ["root_agent"]` :

    `You are an expert Python developer specializing in Google ADK (Agent Development Kit).
    Generate clean, production-ready Python code for an agent based on the provided node configuration.

    CRITICAL ERROR PREVENTION:
    1. Agent constructor MUST use these exact parameter names in this order:
       - name (string)
       - model (string)
       - description (string)
       - instruction (string)
       - tools (list)
    2. ALWAYS include model parameter in Agent (use "gemini-2.0-flash")
    3. Use Agent class (not LlmAgent) for non-MCP agents
    4. ALWAYS include __all__ = ["root_agent"] export

    Generate code that:
    1. Imports all necessary modules
    2. Sets up proper logging
    3. Loads environment variables
    4. Uses google_search tool for search capabilities
    5. Defines the agent with proper configuration
    6. Includes example usage
    7. Exports the agent properly`;

  // Create user prompt with node data
  const userPrompt = mcpEnabled ?
    `Generate a Google ADK agent with MCP Smithery integration based on this flow:

**Nodes:**
${JSON.stringify(nodeData, null, 2)}

**Agent Configuration:**
${agentNodes.length > 0 ? `
- Agent Name: ${agentNodes[0].data.label || 'mcp_agent'}
- Description: ${agentNodes[0].data.description || 'MCP-enabled agent'}
- Instructions: ${agentNodes[0].data.instruction || agentNodes[0].data.prompt || 'Use MCP tools to assist users'}
` : 'Create default MCP agent'}

**ACTUAL MCP CONFIGURATION FROM NODES (first MCP):**
- Command: ${firstConfig.command}
- Args: ${JSON.stringify(firstConfig.args)}
- Environment Variables: ${JSON.stringify(firstConfig.envVars)}
- MCP Package: ${firstConfig.args.find(arg => arg.startsWith('@')) || '@smithery/mcp-example'}

**CRITICAL MCP REQUIREMENTS:**
- Generate MCP Smithery agent code (NOT Google Search code)
- Use LlmAgent, Runner, InMemorySessionService
- Include MCPToolset with StdioServerParameters
- Use the EXACT MCP configuration provided above
- Include SMITHERY_API_KEY environment variable
- Use asyncio.run(runner.run_forever()) pattern

**MANDATORY ERROR PREVENTION (Prevents "1 validation error for LlmAgent"):**
1. LlmAgent constructor parameters in EXACT order: name, model, description, instruction, tools
   - name: SIMPLE string like "search_agent" (NOT complex/long names, NEVER None/empty)
   - model: ALWAYS "gemini-2.0-flash" (NEVER None or empty string)
   - description: CONCISE 10-100 chars like "Agent that uses Gemini 2.0 model and Smithery MCP tool"
   - instruction: REASONABLE length (NOT "instructions" misspelling, NEVER None/empty)
   - tools: MUST be list [toolset] (NOT "toolset=" or None)
2. Runner MUST include app_name: Runner(agent=root_agent, session_service=session_service, app_name="search_agent")
3. SYNCHRONIZE app_name: Use SAME app_name in Runner and session_service.create_session() calls
4. NEVER pass session_service to LlmAgent
5. ALWAYS include SMITHERY_API_KEY validation: if not smithery_api_key: raise ValueError(...)
6. Environment variables MUST include SMITHERY_API_KEY
7. MCP args should be clean without duplicate --key parameters
8. NEVER write "tools=tools=[toolset]" - use only "tools=[toolset]" (no duplicate tools=)
9. Use run_async() NOT run_forever() with proper async pattern
10. Include all required imports: from google.genai import types, import asyncio

**EXACT TEMPLATE TO FOLLOW (Use ACTUAL node data for dynamic values):**
\`\`\`python
from google.adk.agents import LlmAgent
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

# MCP toolset configuration - USE ACTUAL NODE DATA
toolset = MCPToolset(
    connection_params=StdioServerParameters(
        command="${firstConfig.command}",
        args=${JSON.stringify(firstConfig.args)},
        env=${JSON.stringify(firstConfig.envVars)}
    )
)

# LlmAgent with MCP tools - USE ACTUAL AGENT NODE DATA
root_agent = LlmAgent(
    name="${agentNodes.length > 0 ? agentNodes[0].data.label || 'mcp_agent' : 'mcp_agent'}",
    model="gemini-2.0-flash",
    description="${agentNodes.length > 0 ? agentNodes[0].data.description || 'MCP-enabled agent' : 'MCP-enabled agent'}",
    instruction="${agentNodes.length > 0 ? agentNodes[0].data.instruction || agentNodes[0].data.prompt || 'Use MCP tools to assist users' : 'Use MCP tools to assist users'}",
    tools=[toolset]
)

# Session service and runner setup - USE ACTUAL AGENT NAME
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="${agentNodes.length > 0 ? agentNodes[0].data.label || 'mcp_agent' : 'mcp_agent'}")

async def main():
    # Create a session
    user_id = "user"
    session = session_service.create_session(state={}, app_name="${agentNodes.length > 0 ? agentNodes[0].data.label || 'mcp_agent' : 'mcp_agent'}", user_id=user_id)
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

__all__ = ["root_agent"]
\`\`\`

CRITICAL: Follow this EXACT structure. Do NOT create custom classes. Do NOT use wrong imports.
Return ONLY the complete Python code following this template, no explanations.` :

    `Generate a Google ADK agent based on this flow configuration:

**Nodes:**
${JSON.stringify(nodeData, null, 2)}

**Agent Configuration:**
${agentNodes.length > 0 ? `
- Agent Name: ${agentNodes[0].data.label || 'search_agent'}
- Description: ${agentNodes[0].data.description || 'AI agent for task automation'}
- Instructions: ${agentNodes[0].data.instruction || agentNodes[0].data.prompt || 'Use available tools to help users'}
` : 'No agent nodes found - create a default search agent'}

**Requirements:**
- Use Agent class with google_search tool
- Include complete, runnable Python code
- Add proper error handling and logging
- Follow Google ADK patterns and best practices
- Include __all__ export

Return ONLY the Python code, no explanations.`;

  try {
    // Call OpenRouter API
    const generatedCode = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    // Clean and validate the generated code
    const cleanedCode = formatCodeForDisplay(generatedCode);

    // If the generated code doesn't look valid, fall back to local generation
    if (!cleanedCode || cleanedCode.length < 100) {
      console.warn('Generated code too short, falling back to local generation');
      return fallbackToLocalGeneration(nodes, mcpEnabled, mcpConfig);
    }

    return cleanedCode;
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    // Fall back to local generation on API error
    return fallbackToLocalGeneration(nodes, mcpEnabled, mcpConfig);
  }
}

// Fallback function for local code generation
function fallbackToLocalGeneration(
  nodes: Node<BaseNodeData>[],
  mcpEnabled: boolean,
  mcpConfig?: MCPConfig[]
): string {
  console.log('Falling back to local generation, MCP enabled:', mcpEnabled);

  if (mcpEnabled) {
    // Extract actual MCP config from nodes if not provided
    const validConfig = mcpConfig || extractMcpConfigFromNodes(nodes);
    const deduped = dedupeConfigs(validConfig);
    console.log('Generating MCP code with config:', validConfig);
    return generateMCPCode(nodes, deduped);
  }

  console.log('Generating default search agent code');
  return generateDefaultSearchAgentCode();
}

// Create a default MCP config
function createDefaultMcpConfig(): MCPConfig {
  return {
    enabled: true,
    type: 'smithery',
    command: 'npx',
    args: ['-y', '@smithery/cli@latest', 'run', '@smithery/mcp-example', '--key', 'smithery_api_key'],
    envVars: { 'NODE_OPTIONS': '--no-warnings --experimental-fetch', 'SMITHERY_API_KEY': 'smithery_api_key' }
  };
}

export function CodeGenerationModal({
  open,
  onOpenChange,
  nodes,
  edges,
  mcpConfig,
}: CodeGenerationModalProps) {
  const [activeTab, setActiveTab] = useState<string>('adk');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mcpEnabled, setMcpEnabled] = useState(true);
  const [isFirstGeneration, setIsFirstGeneration] = useState(true);
  const [sandboxOutput, setSandboxOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState<VerificationProgress | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Check if there are MCP nodes in the diagram or if MCP is explicitly enabled
  const hasMcpNodes = nodes.some(node => 
    node.data.type === 'mcp-client' || 
    node.data.type === 'mcp-server' || 
    node.data.type === 'mcp-tool' ||
    node.data.label?.toLowerCase().includes('mcp') ||
    node.data.description?.toLowerCase().includes('mcp') ||
    node.data.description?.toLowerCase().includes('smithery')
  );

  // Get unique key for current flow
  const flowKey = getFlowKey(nodes, edges);

  // When the modal opens or when nodes/edges change, auto-set MCP toggle based on nodes
  useEffect(() => {
    console.log('MCP detection:', { hasMcpNodes, nodes: nodes.map(n => ({ type: n.data.type, label: n.data.label, description: n.data.description })) });
    if (hasMcpNodes) {
      console.log('MCP nodes detected, enabling MCP');
      setMcpEnabled(true);
    }
  }, [hasMcpNodes, open, nodes]);

  // Check localStorage when modal opens or framework changes
  useEffect(() => {
    if (!open) return;

    const storedCode = getStoredCode(flowKey, activeTab);
    if (storedCode) {
      setGeneratedCode(storedCode);
      setIsFirstGeneration(false);
      return;
    }

    // If no stored code, generate new code
    if (isFirstGeneration) {
      generateInitialCode();
    }
  }, [open, activeTab, flowKey]);

  // Function to generate initial code with verification
  const generateInitialCode = async () => {
    setLoading(true);
    setError(null);
    setVerificationProgress(null);
    setVerificationResult(null);

    try {
      let generatedCode: string;
      if (activeTab === 'adk') {
        // Use the new verified code generation
        generatedCode = await generateVerifiedCode(
          nodes,
          edges,
          mcpEnabled,
          OPENROUTER_API_KEY,
          (progress) => setVerificationProgress(progress),
          mcpConfig ? dedupeConfigs(mcpConfig) : undefined
        );
          } else {
        generatedCode = generateDefaultSearchAgentCode();
      }

      const formattedCode = formatCodeForDisplay(generatedCode);
      setGeneratedCode(formattedCode);
      storeCode(flowKey, activeTab, formattedCode);
      setIsFirstGeneration(false);
      setVerificationProgress(null);
    } catch (error) {
      console.error('Error generating code:', error);
      setError(error instanceof Error ? error.message : 'An error occurred generating code');
      
      // Fallback to default generation
      const defaultCode = generateDefaultSearchAgentCode();
      const cleanedCode = cleanGeneratedCode(defaultCode, mcpEnabled);
      setGeneratedCode(cleanedCode);
      storeCode(flowKey, activeTab, cleanedCode);

      toast({
        title: "Using Default Generation",
        description: "Error occurred. Using default code generation instead.",
        variant: "default"
      });
    } finally {
      setLoading(false);
      setVerificationProgress(null);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Code copied!",
      description: "The generated code has been copied to your clipboard.",
    });
  };

  // Update the regenerate button click handler with verification
  const handleRegenerate = async () => {
    setLoading(true);
    setError(null);
    setSandboxOutput('');
    setVerificationProgress(null);
    setVerificationResult(null);
    
    try {
      let generatedCode: string;
      if (activeTab === 'adk') {
          // If we have MCP components, enable MCP mode
        if (hasMcpNodes && !mcpEnabled) {
            setMcpEnabled(true);
          }
          
        // Use the new verified code generation
        generatedCode = await generateVerifiedCode(
          nodes,
          edges,
          mcpEnabled,
          OPENROUTER_API_KEY,
          (progress) => setVerificationProgress(progress),
          mcpConfig ? dedupeConfigs(mcpConfig) : undefined
        );
          } else {
        generatedCode = generateDefaultSearchAgentCode();
      }
      
      const formattedCode = formatCodeForDisplay(generatedCode);
      setGeneratedCode(formattedCode);
      storeCode(flowKey, activeTab, formattedCode);
      setVerificationProgress(null);
      toast({
        title: "Code regenerated",
        description: "The code has been regenerated and verified successfully."
      });
    } catch (error) {
      console.error('Error regenerating code:', error);
      setError(error instanceof Error ? error.message : 'Failed to regenerate code');
      
      // Fallback to default generation
      const defaultCode = generateDefaultSearchAgentCode();
      const cleanedCode = cleanGeneratedCode(defaultCode, mcpEnabled);
      setGeneratedCode(cleanedCode);
      storeCode(flowKey, activeTab, cleanedCode);
      
      toast({
        title: "Using Default Generation",
        description: "Error occurred. Using default code generation instead.",
        variant: "default"
      });
    } finally {
      setLoading(false);
      setVerificationProgress(null);
    }
  };

  const executeInSandbox = async (code: string) => {
    const startTime = performance.now();
    setIsExecuting(true);
    setSandboxOutput('');

    try {
      if (!code.trim()) {
        throw new Error('No code provided to execute');
      }

      // Split the code into agent.py and __init__.py
      const agentCode = code;
      const initCode = `from .agent import root_agent

__all__ = ["root_agent"]`;

      // Call our API endpoint with both files
      const response = await fetch('https://agent-flow-builder-api.onrender.com/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'agent.py': agentCode,
            '__init__.py': initCode
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Check if result contains a URL in output or as a dedicated field
      let urlInfo = '';
      if (result.url) {
        urlInfo = `\n🌐 Service URL: ${result.url}`;
      } else if (result.serviceUrl) {
        urlInfo = `\n🌐 Service URL: ${result.serviceUrl}`;
      }
      
      // Format and display the output
      const executionTime = performance.now() - startTime;
      const formattedOutput = [
        `✨ Execution completed in ${executionTime.toFixed(2)}ms`,
        '📤 Output:',
        result.output || 'No output generated',
        result.error ? `\n❌ Error:\n${result.error}` : '',
        urlInfo,
        '\n📊 Execution Details:',
        `• Status: ${result.executionDetails?.status || 'unknown'}`,
        `• Exit Code: ${result.executionDetails?.exitCode}`,
        `• Memory Usage: ${result.memoryUsage?.toFixed(2)}MB`,
      ].join('\n');

      setSandboxOutput(formattedOutput);
    } catch (error) {
      console.error('Error executing code:', error);
      setSandboxOutput(`❌ Error executing code: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generated Agent Code</DialogTitle>
          <DialogDescription>
            This code represents the agent flow you've designed. The code is generated based on your workflow diagram.
            {!isFirstGeneration && (
              <span className="text-sm text-muted-foreground"> (Loaded from saved version)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="adk" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="adk">Google ADK</TabsTrigger>
            <TabsTrigger value="vertex">Vertex AI</TabsTrigger>
            <TabsTrigger value="custom">Custom Agent</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            {activeTab === 'adk' && (
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={mcpEnabled}
                      onChange={() => {
                        const newValue = !mcpEnabled;
                        setMcpEnabled(newValue);
                        if (newValue && !isFirstGeneration) {
                          toast({
                            title: "MCP Enabled",
                            description: "Regenerating code with MCP support...",
                            variant: "default"
                          });
                          setTimeout(() => handleRegenerate(), 500);
                        }
                      }}
                      disabled={hasMcpNodes}
                    />
                    <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${hasMcpNodes ? 'opacity-60' : ''}`}></div>
                    <span className="ms-3 text-sm font-medium">Enable MCP Integration</span>
                  </label>
                  {hasMcpNodes && (
                    <span className="text-xs text-yellow-500">
                      (MCP nodes detected in diagram)
                    </span>
                  )}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRegenerate}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Generate Code
                </Button>
              </div>
            )}
            
            <div className="relative">
              {error && (
                <div className="mb-2 p-2 bg-red-100 border border-red-200 rounded-md text-red-800 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Verification Progress Display */}
              <VerificationProgress progress={verificationProgress} />

              {loading ? (
                <div className="flex items-center justify-center h-40 gap-2 bg-gray-900 rounded-md text-gray-200">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>{verificationProgress ? verificationProgress.message : "Generating code..."}</span>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <CodeHighlighter code={generatedCode} />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-gray-800/70 hover:bg-gray-800/90 flex items-center gap-2"
                        onClick={() => executeInSandbox(generatedCode)}
                        disabled={loading || isExecuting}
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-gray-200" />
                            <span className="text-gray-200">Running...</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 text-gray-200" />
                            <span className="text-gray-200">Execute</span>
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-gray-800/70 hover:bg-gray-800/90 flex items-center gap-2"
                        onClick={handleCopyCode}
                        disabled={loading}
                      >
                        <Copy className="h-4 w-4 text-gray-200" />
                        <span className="text-gray-200">Copy</span>
                      </Button>
                    </div>
                  </div>
                  
                  <SandboxOutput output={sandboxOutput} />
                </>
              )}
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground">
              <strong>Note:</strong> The generated code uses {activeTab === 'adk' 
                ? `Google's Agent Development Kit${mcpEnabled ? ' with MCP integration' : ' with Google Search'}`
                : activeTab === 'vertex' 
                  ? "Google Vertex AI"
                  : "a custom framework"}.
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {isFirstGeneration ? 'Initial generation' : 'Saved version'}
          </div>
          <div className="flex gap-2">
            <Button 
              disabled={loading} 
              onClick={handleRegenerate}
              variant="default"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Generating..." : "Regenerate Code"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}