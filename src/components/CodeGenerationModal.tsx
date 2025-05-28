import React, { useState, useEffect, useCallback } from 'react';
import type {
  Node,
  Edge
} from '@xyflow/react';
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
import { Copy, AlertCircle, Loader2, Play, HelpCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast.js';
import { generateCode } from '@/lib/codeGenerator.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { generateMCPCode, generateADKCode, MCPConfig, isMcpCode, generateFallbackMcpCode } from '@/lib/codeGeneration';

// OpenRouter configuration from environment variables
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_BASE = import.meta.env.VITE_OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';

// Validate API key is present
if (!OPENROUTER_API_KEY) {
  console.error('OpenRouter API key not found in environment variables. Please add VITE_OPENROUTER_API_KEY to your .env file.');
}

// Define proper type for newOpen parameter
function useModalState(initialState = false): [boolean, (newOpen: boolean) => void] {
  const [state, setState] = useState(initialState);
  const toggle = useCallback((newOpen: boolean) => {
    setState(newOpen);
  }, []);
  return [state, toggle];
}

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

// Add new component for sandbox output display
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
  mcpConfig?: MCPConfig;  // Add MCP configuration
}

// Add a helper function to get a unique key for the flow
function getFlowKey(nodes: Node<BaseNodeData>[], edges: Edge[]): string {
  // Create a hash of the flow structure
  const flowData = {
    nodes: nodes.map(n => ({ id: n.id, type: n.data.type, label: n.data.label })),
    edges: edges.map(e => ({ source: e.source, target: e.target }))
  };
  return btoa(JSON.stringify(flowData));
}

// Add a helper function to get/set code from localStorage
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
  // Remove any markdown code block indicators
  code = code.replace(/```python\n/g, '');
  code = code.replace(/```\n?/g, '');
  code = code.trim();

  // If MCP is forced but code doesn't look like MCP code, use the fallback
  if (forceMcp && !isMcpCode(code)) {
    console.log('Code does not contain MCP indicators but MCP is required, using fallback');
    return generateFallbackMcpCode();
  }

  // If code doesn't have the basic structure, use the template
  if (!code.includes('from google.adk.agents')) {
    code = generateDefaultSearchAgentCode();
  }

  return code;
}

// Helper function to generate code based on framework
const getLocallyGeneratedCode = (nodes: Node<BaseNodeData>[], edges: Edge[], framework: string): string => {
  const agentNode = nodes.find(n => n.data.type === 'agent');
  if (!agentNode) {
    return generateDefaultSearchAgentCode();
  }

  // Extract all node data - prioritize node-specific data
  const agentName = agentNode.data.label?.toLowerCase().replace(/\s+/g, '_') || 'search_agent';
  const agentPrompt = agentNode.data.prompt || agentNode.data.instruction || agentNode.data.description;
  const agentDescription = agentNode.data.description || 
    (agentPrompt ? `Agent that ${agentPrompt.split('\n')[0].toLowerCase()}` : 'Search agent');
  const agentInstruction = agentNode.data.instruction || agentPrompt || 'Use Google Search to find accurate and up-to-date information. Always cite your sources and provide context from search results.';

  switch (framework) {
    case 'adk':
      return `from google.adk.agents import Agent
from google.adk.tools import google_search

root_agent = Agent(
    model="gemini-2.0-flash",
    name="${agentName}",
    description="${agentDescription}",
    instruction="${agentInstruction}",
    tools=[google_search]
)

__all__ = ["root_agent"]`;
    case 'vertex':
      return `from google.cloud import aiplatform

# Initialize Vertex AI
aiplatform.init(project="your-project-id")

agent = aiplatform.Agent.create(
    display_name="${agentName}",
    description="${agentDescription}",
    tools=["google_search"]
)`;
    case 'custom':
      return `import openai
from typing import Dict, Any

class Agent:
    def __init__(self):
        self.name = "${agentName}"
        self.description = "${agentDescription}"
        self.instruction = "${agentInstruction}"
        
    def search(self, query: str) -> Dict[str, Any]:
        # Implement search functionality
        pass
        
agent = Agent()`;
    default:
      return generateDefaultSearchAgentCode();
  }
};

// Helper function to generate default search agent code
const generateDefaultSearchAgentCode = (): string => {
  return `from google.adk.agents import Agent
from google.adk.tools import google_search

root_agent = Agent(
    model="gemini-2.0-flash",
    name="search_agent",
    description="An agent that uses Google Search to find and provide information.",
    instruction="Use Google Search to find accurate and up-to-date information. Always cite your sources and provide context from search results.",
    tools=[google_search]
)

__all__ = ["root_agent"]`;
};

// Add a helper function to format the code for display
function formatCodeForDisplay(code: string): string {
  // Remove any markdown code block indicators if they exist
  code = code.replace(/```python\n/g, '');
  code = code.replace(/```\n?/g, '');
  
  // Remove any leading/trailing whitespace
  code = code.trim();
  
  return code;
}

// Helper function to make OpenRouter API calls
async function callOpenRouter(endpoint: string, body: {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': window.location.origin, // Required by OpenRouter
    'X-Title': 'Agent Flow Builder' // Optional but recommended
  };

  try {
    const response = await fetch(`${OPENROUTER_API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Helper function to customize prompts based on user requirements
function customizePrompts(userPrompt: string, nodeType: string): string {
  // Extract key information from user prompt
  const isSearchRelated = /search|find|look up|query/i.test(userPrompt);
  const isAnalysisRelated = /analyze|evaluate|assess|review/i.test(userPrompt);
  const isFactChecking = /fact|verify|validate|check/i.test(userPrompt);
  
  switch (nodeType) {
    case 'agent':
      if (isSearchRelated) {
        return `Act as an expert researcher using Google Search to find accurate and comprehensive information. ${userPrompt}
Focus on:
- Finding authoritative sources
- Cross-referencing information
- Providing context and citations
- Summarizing findings clearly`;
      } else if (isAnalysisRelated) {
        return `Act as an analytical expert using Google Search to evaluate and analyze information. ${userPrompt}
Focus on:
- Deep analysis of search results
- Comparing different perspectives
- Identifying trends and patterns
- Drawing well-supported conclusions`;
      } else if (isFactChecking) {
        return `Act as a fact-checking expert using Google Search to verify information. ${userPrompt}
Focus on:
- Verifying claims against reliable sources
- Identifying primary sources
- Checking multiple sources
- Providing evidence-based conclusions`;
      }
      return `Act as an expert assistant using Google Search to help with: ${userPrompt}
Focus on:
- Finding relevant information
- Providing accurate answers
- Citing sources
- Explaining context`;
      
    case 'google_search':
      if (isSearchRelated) {
        return `Perform targeted searches to find specific information about: ${userPrompt}
Search strategy:
- Use precise search terms
- Focus on authoritative sources
- Look for recent information
- Cross-reference findings`;
      } else if (isAnalysisRelated) {
        return `Conduct comprehensive searches to gather data for analysis about: ${userPrompt}
Search strategy:
- Look for data-rich sources
- Find comparative information
- Seek expert opinions
- Gather diverse perspectives`;
      } else if (isFactChecking) {
        return `Execute focused searches to verify facts related to: ${userPrompt}
Search strategy:
- Prioritize primary sources
- Check official documentation
- Find independent verification
- Look for fact-checking resources`;
      }
      return `Perform intelligent searches to address: ${userPrompt}
Search strategy:
- Find relevant information
- Use reliable sources
- Get recent data
- Verify findings`;
      
    default:
      return userPrompt;
  }
}

// Function to generate code with OpenAI
async function generateCodeWithOpenAI(
  nodes: Node<BaseNodeData>[], 
  edges: Edge[], 
  mcpEnabled: boolean,
  mcpConfig?: MCPConfig
): Promise<string> {
  // If MCP is enabled and configuration is provided, generate MCP code
  if (mcpEnabled) {
    // Ensure we have a valid mcpConfig, create one if not provided
    const validConfig = mcpConfig || createDefaultMcpConfig(nodes);
    return generateMCPCode(nodes, edges, validConfig);
  }
  
  // Otherwise generate standard ADK code with proper tool detection
  return generateADKCode(nodes, edges);
}

// Helper function to create a default MCP config from nodes if possible
function createDefaultMcpConfig(nodes: Node<BaseNodeData>[]): MCPConfig {
  // Check for MCP nodes to determine type
  const mcpToolNodes = nodes.filter(n => n.data.type === 'mcp-tool');
  const mcpClientNodes = nodes.filter(n => n.data.type === 'mcp-client');
  
  // Determine MCP type from nodes
  let mcpType = 'github'; // Default type
  if (mcpToolNodes.length > 0 && mcpToolNodes[0].data.mcpToolId) {
    mcpType = mcpToolNodes[0].data.mcpToolId as string;
  } else if (mcpClientNodes.length > 0 && mcpClientNodes[0].data.mcpType) {
    mcpType = mcpClientNodes[0].data.mcpType as string;
  }
  
  // Determine command and args
  const command = mcpType === 'time' ? 'uvx' : 'npx';
  const args = getMcpDefaultArgs(mcpType);
  
  // Create default env vars based on type
  const envVars = getMcpDefaultEnvVars(mcpType);
  
  // Return the config
  return {
    enabled: true,
    type: mcpType,
    command,
    args,
    envVars
  };
}

// Add a Tooltip component
const Tooltip = ({ message, children }: { message: string, children: React.ReactNode }) => {
  return (
    <div className="relative flex group">
      {children}
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-50 pointer-events-none">
        {message}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
      </div>
    </div>
  );
};

export function CodeGenerationModal({
  open,
  onOpenChange,
  nodes,
  edges,
  mcpConfig,  // Add MCP configuration
}: CodeGenerationModalProps) {
  const [activeTab, setActiveTab] = useState<string>('adk');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mcpEnabled, setMcpEnabled] = useState(true);
  const [isFirstGeneration, setIsFirstGeneration] = useState(true);
  const [sandboxOutput, setSandboxOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Check if there are MCP nodes in the diagram
  const hasMcpNodes = nodes.some(node => 
    node.data.type === 'mcp-client' || 
    node.data.type === 'mcp-server' || 
    node.data.type === 'mcp-tool'
  );

  // Get unique key for current flow
  const flowKey = getFlowKey(nodes, edges);

  // When the modal opens or when nodes/edges change, auto-set MCP toggle based on nodes
  useEffect(() => {
    if (hasMcpNodes) {
      setMcpEnabled(true);
    }
  }, [hasMcpNodes, open]);

  // Check localStorage when modal opens or framework changes
  useEffect(() => {
    if (!open) return;

    const storedCode = getStoredCode(flowKey, activeTab);
    if (storedCode) {
      console.log('CodeGenerationModal: Loading code from localStorage');
      setGeneratedCode(storedCode);
      setIsFirstGeneration(false);
      return;
    }

    // If no stored code, generate new code
    if (isFirstGeneration) {
      console.log('CodeGenerationModal: No stored code found, generating new code');
      generateInitialCode();
    }
  }, [open, activeTab, flowKey]);

  // Function to generate initial code
  const generateInitialCode = async () => {
    console.log('CodeGenerationModal: Generating initial code');
    setLoading(true);
    setError(null);

    try {
      let generatedCode: string;
      if (activeTab === 'adk') {
        try {
          generatedCode = await generateCodeWithOpenAI(nodes, edges, mcpEnabled, mcpConfig);
          generatedCode = cleanGeneratedCode(generatedCode, mcpEnabled);
        } catch (openaiError) {
          console.error('OpenAI error generating code:', openaiError);
          if (mcpEnabled) {
            // Ensure we have a valid mcpConfig, create one if not provided
            const validConfig = mcpConfig || createDefaultMcpConfig(nodes);
            generatedCode = generateMCPCode(nodes, edges, validConfig);
          } else {
            generatedCode = getLocallyGeneratedCode(nodes, edges, activeTab);
          }
          toast({
            title: "Using Local Generation",
            description: "OpenAI API error. Using local code generation instead.",
            variant: "default"
          });
        }
      } else {
        const framework = activeTab as 'adk' | 'vertex' | 'custom';
        const rawCode = await generateCode(nodes, edges, framework);
        generatedCode = cleanGeneratedCode(rawCode);
      }

      const formattedCode = formatCodeForDisplay(generatedCode);
      setGeneratedCode(formattedCode);
      storeCode(flowKey, activeTab, formattedCode);
      setIsFirstGeneration(false);
      console.log('CodeGenerationModal: Code generated and stored successfully');
    } catch (error) {
      console.error('Error generating code:', error);
      setError(error instanceof Error ? error.message : 'An error occurred generating code');
      
      // Fallback to appropriate local generation
      let localCode: string;
      if (mcpEnabled) {
        // Ensure we have a valid mcpConfig
        const validConfig = mcpConfig || createDefaultMcpConfig(nodes);
        localCode = generateMCPCode(nodes, edges, validConfig);
      } else {
        localCode = getLocallyGeneratedCode(nodes, edges, activeTab);
      }
      
      const cleanedCode = cleanGeneratedCode(localCode, mcpEnabled);
      setGeneratedCode(cleanedCode);
      storeCode(flowKey, activeTab, cleanedCode);
      toast({
        title: "Using Local Generation",
        description: "Error occurred. Using local code generation instead.",
        variant: "default"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    console.log('CodeGenerationModal: Copying code to clipboard');
    navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Code copied!",
      description: "The generated code has been copied to your clipboard.",
    });
  };

  const handleExecuteClick = () => {
    toast({
      title: "Code Preview",
      description: "This is a preview of the generated code. To execute, please copy and run in your development environment.",
    });
  };

  // Update the regenerate button click handler
  const handleRegenerate = async () => {
    console.log('CodeGenerationModal: Regenerating code with OpenAI');
    setLoading(true);
    setError(null);
    setSandboxOutput('');
    
    try {
      let generatedCode: string;
      if (activeTab === 'adk') {
        try {
          // Detect MCP nodes and tools
          const mcpClientNode = nodes.find(n => n.data.type === 'mcp-client');
          const mcpToolNodes = nodes.filter(n => n.data.type === 'mcp-tool');
          const agentNode = nodes.find(n => n.data.type === 'agent');
          const hasMcpComponents = mcpClientNode || mcpToolNodes.length > 0;
          
          // If we have MCP components, enable MCP mode
          if (hasMcpComponents && !mcpEnabled) {
            setMcpEnabled(true);
          }
          
          // Determine MCP type from config or from nodes
          const mcpType = mcpConfig?.type || 
            (mcpConfig?.mcpType) || 
            (mcpToolNodes.length > 0 ? mcpToolNodes[0].data.mcpToolId as string : 'github') ||
            (mcpClientNode?.data.mcpType as string);
            
          // Extract MCP command and args from node data if available
          const mcpCommand = mcpConfig?.command || 
            (mcpToolNodes.length > 0 && mcpToolNodes[0].data.mcpCommand as string) || 
            (mcpType === 'github' ? 'npx' : mcpType === 'time' ? 'uvx' : 'npx');
            
          const mcpArgs = mcpConfig?.args || 
            (mcpToolNodes.length > 0 && mcpToolNodes[0].data.mcpArgs ? 
              (mcpToolNodes[0].data.mcpArgs as string).split(' ').filter(Boolean) : 
              getMcpDefaultArgs(mcpType));
              
          // Extract env vars from node data if available
          let mcpEnvVars = mcpConfig?.envVars || {};
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

          // Collect all the tool nodes that are not MCP-related
          const toolNodes = nodes.filter(n => {
            if (n.data.type === 'tool' || n.data.type === 'input') {
              return true;
            }
            return false;
          }).filter(n => n.data.type !== 'mcp-tool' && n.data.type !== 'mcp-client');
          
          // Find all connected nodes to detect relationships
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
          
          // Get agent information
          const agentName = agentNode?.data.label?.toLowerCase().replace(/\s+/g, '_') || `${mcpType}_agent`;
          const agentClassName = agentName.charAt(0).toUpperCase() + agentName.slice(1) + 'Agent';
          const agentDescription = agentNode?.data.description || `${mcpType} operations assistant`;
          const agentInstruction = agentNode?.data.instruction || getMcpAgentInstructions(mcpType);
          
          // Create a temporary MCP config for this specific generation
          const tempMcpConfig = mcpEnabled ? {
            enabled: true,
            type: mcpType,
            command: mcpCommand,
            args: mcpArgs,
            envVars: mcpEnvVars
          } : undefined;
          
          // Generate code based on MCP type
          const response = await callOpenRouter('/chat/completions', {
            model: 'openai/gpt-4.1-mini',
            messages: [
              {
                role: 'system',
                content: mcpEnabled 
                  ? `You are an expert in building Google ADK agents with MCP integration. Generate Python code for an agent that uses MCP tools.
                     The code should follow this structure:
                     1. Import necessary modules (google.adk.agents, google.adk.tools.mcp_tool.mcp_toolset)
                     2. Set up global state for tools and exit_stack
                     3. Create get_tools_async() function to load MCP tools
                     4. Create custom Agent class that inherits from LlmAgent
                     5. Set up main() function with proper async event loop
                     6. Include proper error handling and cleanup

                     IMPORTANT: For GitHub MCP:
                     1. Pass token via --token CLI argument, not environment variable
                     2. Validate token starts with 'ghp_'
                     3. Use AsyncExitStack for proper cleanup
                     4. Filter out problematic tools like create_pull_request_review`
                  : `You are an expert in building Google ADK agents. Generate Python code for an agent that uses Google Search and other tools.
                     The code should follow this structure:
                     1. Import necessary modules (google.adk.agents, google.adk.tools)
                     2. Define any custom tool functions needed
                     3. Create the agent with appropriate tools
                     4. Include proper error handling and logging`
              },
              {
                role: 'user',
                content: mcpEnabled
                  ? `Generate an MCP agent with the following configuration:
                     - MCP Type: ${mcpType}
                     - Agent Name: ${agentName}
                     - Agent Class Name: ${agentClassName}
                     - Description: ${agentDescription}
                     - Command: ${mcpCommand}
                     - Args: ${JSON.stringify(mcpArgs)}
                     - Environment Variables: ${JSON.stringify(mcpEnvVars, null, 2)}
                     - Agent Instructions: ${agentInstruction}
                     
                     The code should be similar to this structure:
                     \`\`\`python
                     """${mcpType.toUpperCase()} MCP Agent"""
                     import asyncio, os
                     from google.genai import types
                     from google.adk.agents import LlmAgent
                     from google.adk.runners import Runner
                     from google.adk.sessions import InMemorySessionService
                     from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
                     from contextlib import AsyncExitStack
                     
                     # Global state
                     _tools = None
                     _exit_stack = None
                     
                     # Configure logging
                     logging.basicConfig(
                         level=logging.INFO,
                         format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
                         datefmt='%Y-%m-%d %H:%M:%S'
                     )
                     logger = logging.getLogger("${agentName}")
                     
                     async def get_tools_async():
                         """Gets tools from the ${mcpType.toUpperCase()} MCP Server."""
                         global _tools, _exit_stack
                         _exit_stack = AsyncExitStack()
                         await _exit_stack.__aenter__()
                         
                         try:
                             ${mcpType === 'github' ? `
                             # Validate GitHub token
                             github_token = os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN")
                             if not github_token or not github_token.startswith("ghp_"):
                                 raise ValueError("Invalid GitHub token. Must start with 'ghp_'")
                             ` : ''}
                             tools, _ = await MCPToolset.create_tools_from_server(
                                 connection_params=StdioServerParameters(
                                     command='${mcpCommand}',
                                     args=[
                                         ${mcpArgs.map(arg => `"${arg}"`).join(',\n                                         ')}${mcpType === 'github' ? ',\n                                         "--token",\n                                         github_token' : ''}
                                     ],
                                     env=${JSON.stringify(mcpEnvVars, null, 2)}
                                 ),
                                 async_exit_stack=_exit_stack
                             )
                             _tools = tools  # Store tools in global state
                             return tools
                         except Exception as e:
                             logger.error(f"Failed to load MCP tools: {e}", exc_info=True)
                             await _exit_stack.aclose()
                             _exit_stack = None
                             raise
                     
                     # Try to initialize tools at import time (eager loading)
                     try:
                         asyncio.run(get_tools_async())
                         logger.info(f"Initialized {mcpType.toUpperCase()} MCP tools for the agent.")
                     except Exception as e:
                         logger.warning(f"Warning: Failed to initialize {mcpType.toUpperCase()} tools: {e}")
                         logger.info("Agent will attempt to initialize tools when first used.")
                     
                     # Create the root agent instance
                     root_agent = LlmAgent(
                         model="gemini-2.0-flash",
                         name="${agentName}",
                         description="${agentDescription}",
                         instruction="""${agentInstruction}""",
                         tools=_tools or []  # Use empty list if tools not loaded yet
                     )
                     
                     async def main():
                         """Run the agent."""
                         global _tools, _exit_stack
                         try:
                             if _tools is None:
                                 logger.info("Loading MCP tools...")
                                 _tools = await get_tools_async()
                                 root_agent.tools = _tools
                                 logger.info(f"Loaded MCP tools: {[tool.name for tool in _tools]}")
                     
                             # Setup session service and runner
                             session_service = InMemorySessionService()
                             runner = Runner(agent=root_agent, session_service=session_service)
                     
                             logger.info("Starting agent runner. Press Ctrl+C to exit.")
                             await runner.run_forever()
                     
                         except asyncio.CancelledError:
                             logger.info("Agent runner cancelled, shutting down.")
                         except Exception as e:
                             logger.error(f"Unexpected error in main: {e}", exc_info=True)
                         finally:
                             if _exit_stack is not None:
                                 await _exit_stack.aclose()
                                 _exit_stack = None
                             logger.info("Cleanup complete.")
                     
                     if __name__ == "__main__":
                         try:
                             asyncio.run(main())
                         except KeyboardInterrupt:
                             logger.info("Keyboard interrupt received, exiting.")
                             sys.exit(0)
                     \`\`\`
                     
                     Make sure to include appropriate error handling, logging, and follow the best practices for Google ADK agents.
                     `
                  : `Generate a Google ADK agent with the following components:
                     - Agent Name: ${agentName}
                     - Description: ${agentDescription}
                     - Tools: ${JSON.stringify([
                        ...toolNodes.map(n => ({
                          name: n.data.label,
                          type: n.data.type,
                          description: n.data.description
                        }))
                      ])}
                     
                     The Google ADK agent should use the google_search tool${toolNodes.length > 0 ? ' and the custom tools above' : ''}.
                     
                     Include proper initialization, error handling, and ensure the agent's instruction parameter provides clear guidance for the agent.`
              }
            ],
            temperature: 0.2,
            max_tokens: 2000
          });

          const responseCode = response.choices[0].message.content || '';
          generatedCode = cleanGeneratedCode(responseCode, mcpEnabled);
          
          // If MCP is enabled but we got standard search code, regenerate as MCP code
          if (mcpEnabled && !isMcpCode(generatedCode)) {
            console.log('Generated code does not include MCP, regenerating with local MCP code generator');
            const validConfig = tempMcpConfig || createDefaultMcpConfig(nodes);
            generatedCode = generateMCPCode(nodes, edges, validConfig);
          }
          
        } catch (error) {
          console.error('Error generating code with OpenRouter:', error);
          // Fallback to appropriate local generation
          if (mcpEnabled) {
            // Create a temporary MCP config if needed
            const tempMcpConfig = {
              enabled: true,
              type: mcpConfig?.type || 'github',
              command: mcpConfig?.command || 'npx',
              args: mcpConfig?.args || ['-y', '@modelcontextprotocol/server-github'],
              envVars: mcpConfig?.envVars || { 'NODE_OPTIONS': '--no-warnings --experimental-fetch' }
            };
            generatedCode = generateMCPCode(nodes, edges, tempMcpConfig);
          } else {
            generatedCode = getLocallyGeneratedCode(nodes, edges, activeTab);
          }
          toast({
            title: "Using Local Generation",
            description: "OpenRouter API error. Using local code generation instead.",
            variant: "default"
          });
        }
      } else {
        // For non-ADK frameworks
        const framework = activeTab as 'adk' | 'vertex' | 'custom';
        const rawCode = await generateCode(nodes, edges, framework);
        generatedCode = cleanGeneratedCode(rawCode);
      }
      
      const formattedCode = formatCodeForDisplay(generatedCode);
      setGeneratedCode(formattedCode);
      storeCode(flowKey, activeTab, formattedCode);
      toast({
        title: "Code regenerated",
        description: "The code has been regenerated successfully."
      });
    } catch (error) {
      console.error('Error regenerating code:', error);
      setError(error instanceof Error ? error.message : 'Failed to regenerate code');
      
      // Fallback to local generation
      let localCode: string;
      if (mcpEnabled) {
        // Ensure we have a valid mcpConfig
        const validConfig = mcpConfig || createDefaultMcpConfig(nodes);
        localCode = generateMCPCode(nodes, edges, validConfig);
      } else {
        localCode = getLocallyGeneratedCode(nodes, edges, activeTab);
      }
      
      const cleanedCode = cleanGeneratedCode(localCode, mcpEnabled);
      setGeneratedCode(cleanedCode);
      storeCode(flowKey, activeTab, cleanedCode);
      
      toast({
        title: "Using Local Generation",
        description: "Error occurred. Using local code generation instead.",
        variant: "default"
      });
    } finally {
      setLoading(false);
    }
  };

  const executeInSandbox = async (code: string) => {
    const startTime = performance.now();
    console.log('\n🚀 Starting code execution...');
    console.group('Code Execution Details');
    
    setIsExecuting(true);
    setSandboxOutput('');

    try {
      // Input validation
      if (!code.trim()) {
        throw new Error('No code provided to execute');
      }

      // Split the code into agent.py and __init__.py
      const agentCode = code;
      const initCode = 'from .agent import root_agent\n__all__ = ["root_agent"]';

      console.log('📝 Preparing files for sandbox execution...');
      console.log('🔗 Sending request to:', 'https://agent-flow-builder-api.onrender.com/api/execute');

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
      console.groupEnd();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log('CodeGenerationModal: Dialog state changing to', newOpen);
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generated Agent Code</DialogTitle>
          <DialogDescription>
            This code represents the agent flow you've designed. The code is generated by AI based on your workflow diagram.
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
                          // If switching to MCP, regenerate the code right away
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
                  <Tooltip message="MCP (Model Context Protocol) enables agents to interact with external services like GitHub, Filesystem, or Time tools. When enabled, this will generate code that uses specialized MCP tooling instead of Google Search.">
                    <HelpCircle className="h-4 w-4 text-gray-500" />
                  </Tooltip>
                  {hasMcpNodes && (
                    <span className="text-xs text-yellow-500">
                      (MCP nodes detected in diagram)
                    </span>
                  )}
                  {mcpEnabled && !hasMcpNodes && (
                    <span className="text-xs text-blue-500">
                      (Will generate MCP-specific code)
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
                  Generate with OpenAI
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
              {loading ? (
                <div className="flex items-center justify-center h-40 gap-2 bg-gray-900 rounded-md text-gray-200">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Generating code...</span>
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
                  : "a custom OpenAI-based framework"}.
              {mcpEnabled && activeTab === 'adk' ? 
                " MCP (Model Context Protocol) provides specialized tools for interacting with external services." : 
                " You may need to install the appropriate packages and credentials."
              }
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

// Code generation functions
function generateAgentCode(nodes: Node<BaseNodeData>[], edges: Edge[]): string {
  console.log('generateAgentCode: Analyzing all nodes and edges for code generation', { 
    nodeCount: nodes.length, 
    edgeCount: edges.length 
  });
  
  // Get agent node and its details
  const agentNode = nodes.find(n => n.data.type === 'agent');
  if (!agentNode) {
    console.warn('No agent node found, using default agent configuration');
    return generateDefaultSearchAgentCode();
  }

  // Validate node data and only fall back if absolutely necessary
  if (!agentNode.data.prompt && !agentNode.data.instruction && !agentNode.data.description) {
    console.warn('Agent node missing all prompt data, using default configuration');
    return generateDefaultSearchAgentCode();
  }

  // Extract all node data - prioritize node-specific data
  const agentName = agentNode.data.label?.toLowerCase().replace(/\s+/g, '_') || 'search_agent';
  
  // Prioritize prompt over instruction over description
  const agentPrompt = agentNode.data.prompt || agentNode.data.instruction || agentNode.data.description;
  
  // Use description if available, otherwise generate from prompt
  const agentDescription = agentNode.data.description || 
    (agentPrompt ? `Agent that ${agentPrompt.split('\n')[0].toLowerCase()}` : 'Search agent');
  
  // Use explicit instruction if available, otherwise use prompt
  const agentInstruction = agentNode.data.instruction || agentPrompt;

  // Find all connected tools and inputs
  const connectedNodes = new Set<string>();
  edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  // Get all tool nodes that are connected
  const toolNodes = nodes.filter(node => 
    (node.data.type === 'tool' || node.data.type === 'input') && 
    connectedNodes.has(node.id)
  );

  let code = `from google.adk.agents import Agent
from google.adk.tools import google_search
from typing import Dict, Any, List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

`;

  // Generate tool functions for each tool node
  toolNodes.forEach(toolNode => {
    // Ensure we have a valid tool name
    const toolName = toolNode.data.label?.toLowerCase().replace(/\s+/g, '_');
    if (!toolName) {
      console.warn(`Tool node ${toolNode.id} missing label, skipping`);
      return;
    }

    // Get tool prompt, prioritizing explicit prompt
    const toolPrompt = toolNode.data.prompt || toolNode.data.description;
    if (!toolPrompt) {
      console.warn(`Tool node ${toolNode.id} (${toolName}) missing prompt and description`);
      return;
    }
    
    code += `def ${toolName}(params: Dict[str, Any]) -> Dict[str, Any]:
    """${toolPrompt}"""
    logger.info(f"Executing ${toolName} with params: {params}")
    # TODO: Implement ${toolNode.data.label} functionality
    return {"result": f"Executed ${toolName} with {params}"}\n\n`;
  });

  // Configure the Google Search tool with the agent's exact prompt
  code += `# Configure Google Search tool with agent's prompt
SEARCH_TOOL_CONFIG = {
    "instruction": """${agentPrompt || 'Search and provide accurate information'}""",
    "examples": [
        {"input": "${agentPrompt ? agentPrompt.split('\n')[0] : 'Search query'}", "output": "Detailed search results with context and sources"},
        {"input": "Follow-up question about ${agentPrompt ? agentPrompt.split('\n')[0] : 'the topic'}", "output": "Additional information with citations"}
    ]
}

# Create a configured search tool
configured_search = google_search.with_config(SEARCH_TOOL_CONFIG)
logger.info("Configured Google Search tool with agent-specific prompt")\n\n`;

  // Create the agent with all tools
  code += `# Create and configure the agent
root_agent = Agent(
    model="gemini-2.0-flash",
    name="${agentName}",
    description="${agentDescription}",
    instruction="${agentInstruction}",
    tools=[
        configured_search,  # Use the configured search tool
        ${toolNodes
          .filter(node => node.data.label)
          .map(node => node.data.label.toLowerCase().replace(/\s+/g, '_'))
          .join(',\n        ')}
    ],
    prompt="""${agentPrompt}"""
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
        logger.error(f"Error testing agent: {e}")`;

  return code;
}

function generateVertexCode(nodes: Node<BaseNodeData>[], edges: Edge[]): string {
  console.log('generateVertexCode: Generating Vertex AI code for', { 
    nodeCount: nodes.length, 
    edgeCount: edges.length 
  });
  
  // Generate Vertex AI code
  const codeBuilder: string[] = [];
  codeBuilder.push(`from google.cloud import aiplatform\n\n`);
  codeBuilder.push(`# Initialize the Vertex AI SDK\n`);
  codeBuilder.push(`aiplatform.init(project="your-project-id", location="your-location")\n\n`);
  
  // Find agent nodes
  const agentNodes = nodes.filter(node => node.data.type === 'agent');
  
  if (agentNodes.length > 0) {
    const mainAgent = agentNodes[0];
    
    codeBuilder.push(`# Create an agent\n`);
    codeBuilder.push(`agent = aiplatform.Agent.create(\n`);
    codeBuilder.push(`    display_name="${mainAgent.data.label}",\n`);
    codeBuilder.push(`    model="gemini-pro"\n`);
    codeBuilder.push(`)\n\n`);
    
    codeBuilder.push(`# Interact with the agent\n`);
    codeBuilder.push(`response = agent.chat("Hello, how can I assist you today?")\n`);
    codeBuilder.push(`print(response)\n`);
  } else {
    codeBuilder.push(`# No agent nodes found in your flow. Add an agent node to generate code.\n`);
    codeBuilder.push(`\n# Example agent code\n`);
    codeBuilder.push(`agent = aiplatform.Agent.create(\n`);
    codeBuilder.push(`    display_name="My Vertex AI Agent",\n`);
    codeBuilder.push(`    model="gemini-pro"\n`);
    codeBuilder.push(`)\n\n`);
    codeBuilder.push(`# Interact with the agent\n`);
    codeBuilder.push(`response = agent.chat("Hello, how can I assist you today?")\n`);
    codeBuilder.push(`print(response)\n`);
  }
  
  return codeBuilder.join('');
}

function generateCustomAgentCode(nodes: Node<BaseNodeData>[], edges: Edge[]): string {
  console.log('generateCustomAgentCode: Generating custom agent code for', { 
    nodeCount: nodes.length, 
    edgeCount: edges.length 
  });
  
  // Generate code for a custom agent using tools
  const functionNodes = nodes.filter(node => node.data.type === 'input' || node.data.type === 'tool');
  const agentNodes = nodes.filter(node => node.data.type === 'agent');
  const modelNodes = nodes.filter(node => node.data.type === 'model');
  const mcpNodes = nodes.filter(node => 
    node.data.type === 'mcp-client' || 
    node.data.type === 'mcp-server' || 
    node.data.type === 'mcp-tool'
  );
  
  // Custom agent code basic structure
  const code = `import openai
import json
from typing import Dict, List, Any, Optional
import os
import asyncio

# Get API key from environment variable
openai.api_key = os.environ.get("OPENAI_API_KEY", "")

`;

  // Return the basic code template - this is a simplified version to fix the parsing issue
  return code;
}

// Helper functions for MCP code generation
function getMcpDefaultArgs(mcpType: string): string[] {
  switch (mcpType.toLowerCase()) {
    case 'github':
      return [
        "-y",
        "--node-options=--experimental-fetch",
        "@modelcontextprotocol/server-github",
        "--token",
        "${process.env.GITHUB_PERSONAL_ACCESS_TOKEN || ''}"
      ];
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
      return baseVars;  // No GITHUB_PERSONAL_ACCESS_TOKEN in env vars anymore
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

function getMcpEnvVarDeclarations(mcpType: string): string {
  switch (mcpType.toLowerCase()) {
    case 'github':
      return 'GITHUB_TOKEN = os.getenv(\'GITHUB_PERSONAL_ACCESS_TOKEN\')';
    case 'time':
      return 'LOCAL_TIMEZONE = os.getenv(\'LOCAL_TIMEZONE\') or Intl.DateTimeFormat().resolvedOptions().timeZone';
    default:
      return '';
  }
}

function getMcpToolFiltering(mcpType: string): string {
  switch (mcpType.toLowerCase()) {
    case 'github':
      return '# Filter out any problematic tools if needed\nreturn [t for t in tools if t.name != "create_pull_request_review"], exit_stack';
    default:
      return 'return tools, exit_stack';
  }
}

function getMcpAgentInstructions(mcpType: string): string {
  switch (mcpType.toLowerCase()) {
    case 'github':
      return `GitHub assistant for repository operations.
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
    case 'time':
      return `You are a helpful assistant that can perform time-related operations.

Available functions:
- get_current_time(timezone="IANA timezone name") - Get current time in a specific timezone
- convert_time(source_timezone="source IANA timezone", time="HH:MM", target_timezone="target IANA timezone") - Convert time between timezones

IMPORTANT RULES:
1. Always use valid IANA timezone names (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo')
2. Use 24-hour format for time (HH:MM)
3. Handle timezone conversions carefully
4. Provide clear explanations for time calculations`;
    case 'filesystem':
      return `Filesystem operations assistant.

Available functions:
- read_file(path="file path") - Read contents of a file
- write_file(path="file path", content="content") - Write content to a file
- list_directory(path="directory path") - List contents of a directory
- file_exists(path="file path") - Check if a file exists
- make_directory(path="directory path") - Create a directory`;
    default:
      return `${mcpType} operations assistant. Use the available MCP tools to help users with their requests.`;
  }
}

function getDefaultPromptForMcpType(mcpType: string): string {
  switch (mcpType.toLowerCase()) {
    case 'github':
      return 'Search for popular Python libraries';
    case 'time':
      return 'What is the current time in Tokyo?';
    case 'filesystem':
      return 'List the files in the current directory';
    default:
      return `What can you help me with using ${mcpType}?`;
  }
}

// Helper function to extract MCP config from nodes
function extractMcpConfigFromNodes(nodes: Node<BaseNodeData>[]): MCPConfig {
  const mcpClientNode = nodes.find(n => n.data.type === 'mcp-client');
  const mcpToolNodes = nodes.filter(n => n.data.type === 'mcp-tool');
  
  // Determine MCP type from nodes
  const mcpType = (mcpToolNodes.length > 0 ? mcpToolNodes[0].data.mcpToolId as string : 'github') ||
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