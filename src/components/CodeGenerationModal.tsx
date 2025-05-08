import React, { useState, useEffect, useCallback } from 'react';
import {
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
import { Copy, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast.js';
import { generateCode } from '@/lib/codeGenerator.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { generateAgentCode as apiGenerateCode } from '@/services/agentService.js';

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

interface CodeGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
}

export function CodeGenerationModal({
  open,
  onOpenChange,
  nodes,
  edges,
}: CodeGenerationModalProps) {
  const [activeTab, setActiveTab] = useState<string>('adk');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mcpEnabled, setMcpEnabled] = useState(true); // Default to enable MCP

  // Check if there are MCP nodes in the diagram
  const hasMcpNodes = nodes.some(node => 
    node.data.type === 'mcp-client' || 
    node.data.type === 'mcp-server' || 
    node.data.type === 'mcp-tool'
  );

  // When the modal opens or when nodes/edges change, auto-set MCP toggle based on nodes
  useEffect(() => {
    if (hasMcpNodes) {
      setMcpEnabled(true);
    }
  }, [hasMcpNodes, open]);

  // Generate code when the modal opens or when nodes/edges change
  useEffect(() => {
    async function fetchCode() {
      if (!open) return;
      
      console.log('CodeGenerationModal: Generating code with:', { 
        framework: activeTab, 
        nodeCount: nodes.length, 
        edgeCount: edges.length,
        mcpEnabled
      });
      
      setLoading(true);
      setError(null);
      
      try {
        // Use the OpenAI API to generate code for ADK
        if (activeTab === 'adk') {
          try {
            const response = await apiGenerateCode({
              nodes: nodes, 
              edges: edges,
              mcpEnabled: mcpEnabled
            });
            
            if (response?.success) {
              setGeneratedCode(response.code);
              console.log('CodeGenerationModal: Code generated successfully via API');
            } else {
              throw new Error(response?.error || 'API returned unsuccessful status');
            }
          } catch (apiError) {
            console.error('API error generating code:', apiError);
            console.log('CodeGenerationModal: Falling back to local code generation');
            // Fallback to local generation
            const localCode = getLocallyGeneratedCode(nodes, edges, activeTab);
            setGeneratedCode(localCode);
            toast({
              title: "Using Local Generation",
              description: "API server not available. Using local code generation instead.",
              variant: "default"
            });
          }
        } else {
          // For other frameworks, use the local generation
          const framework = activeTab as 'adk' | 'vertex' | 'custom';
          const code = await generateCode(nodes, edges, framework);
          console.log('CodeGenerationModal: Code generated successfully');
          setGeneratedCode(code);
        }
      } catch (error) {
        console.error('Error generating code:', error);
        setError(error instanceof Error ? error.message : 'An error occurred generating code');
        // Fallback to local generation
        const localCode = getLocallyGeneratedCode(nodes, edges, activeTab);
        setGeneratedCode(localCode);
        toast({
          title: "Using Local Generation",
          description: "Error occurred. Using local code generation instead.",
          variant: "default"
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchCode();
  }, [open, nodes, edges, activeTab, mcpEnabled]);

  const handleCopyCode = () => {
    console.log('CodeGenerationModal: Copying code to clipboard');
    navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Code copied!",
      description: "The generated code has been copied to your clipboard.",
    });
  };

  // Fallback code generation function that uses local logic if the API fails
  const getLocallyGeneratedCode = (nodes: Node<BaseNodeData>[], edges: Edge[], framework: string) => {
    switch (framework) {
      case 'adk':
        return generateAgentCode(nodes, edges);
      case 'vertex':
        return generateVertexCode(nodes, edges);
      case 'custom':
        return generateCustomAgentCode(nodes, edges);
      default:
        return generateAgentCode(nodes, edges);
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
                      onChange={() => setMcpEnabled(!mcpEnabled)}
                      disabled={hasMcpNodes} // Disable toggle if MCP nodes exist
                    />
                    <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${hasMcpNodes ? 'opacity-60' : ''}`}></div>
                    <span className="ms-3 text-sm font-medium">MCP Support</span>
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
                  onClick={() => {
                    console.log('CodeGenerationModal: Regenerating code with OpenAI');
                    setLoading(true);
                    setError(null);
                    
                    apiGenerateCode({
                      nodes: nodes, 
                      edges: edges,
                      mcpEnabled: mcpEnabled
                    })
                      .then(response => {
                        if (response.success) {
                          setGeneratedCode(response.code);
                          toast({
                            title: "Code regenerated",
                            description: "The code has been regenerated with OpenAI."
                          });
                        } else {
                          throw new Error(response.error || 'API returned unsuccessful status');
                        }
                      })
                      .catch(err => {
                        console.error('Error regenerating code with OpenAI:', err);
                        setError(err instanceof Error ? err.message : 'Failed to regenerate code with OpenAI');
                        // Don't fall back to local generation here to make the error visible
                      })
                      .finally(() => setLoading(false));
                  }}
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
                <div className="relative">
                  <CodeHighlighter code={generatedCode} />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 bg-gray-800/70 hover:bg-gray-800/90"
                    onClick={handleCopyCode}
                    disabled={loading}
                  >
                    <Copy className="h-4 w-4 text-gray-200" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground">
              <strong>Note:</strong> The generated code uses {activeTab === 'adk' 
                ? `Google's Agent Development Kit${mcpEnabled ? ' with MCP support' : ''}`
                : activeTab === 'vertex' 
                  ? "Google Vertex AI"
                  : "a custom OpenAI-based framework"}.
              You may need to install the appropriate packages and credentials.
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Powered by GPT-4.1 Mini
          </div>
          <div className="flex gap-2">
            <Button 
              disabled={loading} 
              onClick={() => {
                console.log('CodeGenerationModal: Regenerating code');
                setLoading(true);
                setError(null);
                
                if (activeTab === 'adk') {
                  // Use the OpenAI API for ADK
                  apiGenerateCode({
                    nodes: nodes, 
                    edges: edges,
                    mcpEnabled: mcpEnabled
                  })
                    .then(response => {
                      if (response?.success) {
                        setGeneratedCode(response.code);
                        toast({
                          title: "Code regenerated",
                          description: "The code has been regenerated with the latest AI model."
                        });
                      } else {
                        throw new Error(response?.error || 'API returned unsuccessful status');
                      }
                    })
                    .catch(err => {
                      console.error('Error regenerating code:', err);
                      // Fall back to local generation
                      const localCode = getLocallyGeneratedCode(nodes, edges, activeTab);
                      setGeneratedCode(localCode);
                      toast({
                        title: "Using Local Generation",
                        description: "API server not available. Using local code generation instead.",
                        variant: "default"
                      });
                    })
                    .finally(() => setLoading(false));
                } else {
                  // Use local generation for other frameworks
                  generateCode(nodes, edges, activeTab as 'adk' | 'vertex' | 'custom')
                    .then(code => {
                      console.log('CodeGenerationModal: Code regenerated successfully');
                      setGeneratedCode(code);
                      toast({
                        title: "Code regenerated",
                        description: "The code has been regenerated with the latest AI model."
                      });
                    })
                    .catch(err => {
                      console.error('Error regenerating code:', err);
                      setError(err instanceof Error ? err.message : 'Failed to regenerate code');
                      // Fall back to local generation
                      const localCode = getLocallyGeneratedCode(nodes, edges, activeTab);
                      setGeneratedCode(localCode);
                    })
                    .finally(() => setLoading(false));
                }
              }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Generating..." : "Regenerate"}
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
  console.log('generateAgentCode: Generating ADK code for', { 
    nodeCount: nodes.length, 
    edgeCount: edges.length 
  });
  
  // Find agent nodes
  const agentNodes = nodes.filter(node => node.data.type === 'agent');
  const modelNodes = nodes.filter(node => node.data.type === 'model');
  const toolNodes = nodes.filter(node => node.data.type === 'tool');
  const functionNodes = nodes.filter(node => node.data.type === 'input');
  const mcpClientNodes = nodes.filter(node => node.data.type === 'mcp-client');
  const mcpServerNodes = nodes.filter(node => node.data.type === 'mcp-server');
  const mcpToolNodes = nodes.filter(node => node.data.type === 'mcp-tool');
  
  // Initialize imports
  let code = `from google.adk.agents import Agent\n`;
  
  // Add tool imports
  if (toolNodes.length > 0) {
    code += `from google.adk.tools import google_search\n`;
  }
  
  // Add MCP imports if any MCP nodes exist
  if (mcpClientNodes.length > 0 || mcpServerNodes.length > 0 || mcpToolNodes.length > 0) {
    code += `from google.adk.mcp.mcp_client import McpClient\n`;
    code += `from google.adk.mcp.mcp_server import McpServer\n`;
    code += `from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters\n`;
  }
  
  if (functionNodes.length > 0) {
    code += `\n# Custom function definitions\n`;
    functionNodes.forEach(node => {
      code += `def ${node.data.label.toLowerCase().replace(/\s+/g, '_')}(input: str) -> dict:\n`;
      code += `    # Implementation for ${node.data.label}\n`;
      code += `    return {"status": "success", "result": f"Processed {input}"}\n\n`;
    });
  }
  
  // Generate MCP server code
  if (mcpServerNodes.length > 0) {
    code += `\n# MCP Servers\n`;
    mcpServerNodes.forEach(node => {
      const varName = node.data.label.toLowerCase().replace(/\s+/g, '_');
      code += `${varName} = McpServer(\n`;
      code += `    name="${varName}",\n`;
      code += `    host="0.0.0.0",\n`;
      code += `    port=${node.data.port || 8080}\n`;
      code += `)\n`;
      
      // Find connected tools to expose via MCP
      const connectedTools = edges
        .filter(edge => edge.source === node.id || edge.target === node.id)
        .map(edge => {
          const targetId = edge.source === node.id ? edge.target : edge.source;
          const targetNode = nodes.find(n => n.id === targetId);
          return targetNode?.data?.type === 'tool' || targetNode?.data?.type === 'input' 
            ? targetNode.data.label.toLowerCase().replace(/\s+/g, '_') 
            : null;
        })
        .filter(Boolean);
        
      if (connectedTools.length) {
        connectedTools.forEach(tool => {
          code += `${varName}.register_tool(${tool})\n`;
        });
      }
    });
  }
  
  // Generate MCP client code
  if (mcpClientNodes.length > 0) {
    code += `\n# MCP Clients\n`;
    mcpClientNodes.forEach(node => {
      const varName = node.data.label.toLowerCase().replace(/\s+/g, '_');
      code += `${varName} = McpClient(\n`;
      code += `    name="${varName}",\n`;
      code += `    server_url="${node.data.mcpUrl || 'http://localhost:8080'}"\n`;
      code += `)\n`;
    });
  }

  // Generate MCP tool code
  if (mcpToolNodes.length > 0) {
    code += `\n# MCP Tools\n`;
    mcpToolNodes.forEach(node => {
      let clientNode: Node<BaseNodeData> | undefined;
      edges.forEach(edge => {
        if (edge.source === node.id || edge.target === node.id) {
          const connectedId = edge.source === node.id ? edge.target : edge.source;
          const connected = nodes.find(n => n.id === connectedId && n.data.type === 'mcp-client');
          if (connected) clientNode = connected;
        }
      });
      
      const clientVarName = clientNode 
        ? clientNode.data.label.toLowerCase().replace(/\s+/g, '_')
        : 'mcp_client';
      
      code += `${node.data.label.toLowerCase().replace(/\s+/g, '_')} = ${clientVarName}.get_tool("${node.data.mcpToolId || node.data.label}")\n`;
    });
  }
  
  // Generate agent code
  code += `\n# Create agent\n`;
  if (agentNodes.length > 0) {
    const mainAgent = agentNodes[0];
    const connectedModelId = edges.find(edge => edge.source === mainAgent.id)?.target || '';
    const connectedModel = nodes.find(node => node.id === connectedModelId);
    const modelName = connectedModel?.data?.modelType || 'gemini-2.0-flash';
    
    // Find connected tools (including MCP tools)
    const connectedToolIds = edges
      .filter(edge => edge.target === mainAgent.id || edge.source === mainAgent.id)
      .map(edge => edge.source === mainAgent.id ? edge.target : edge.source);
    
    const connectedTools = connectedToolIds
      .map(id => nodes.find(node => node.id === id))
      .filter(node => node && (node.data.type === 'tool' || node.data.type === 'input' || node.data.type === 'mcp-tool'));
    
    const toolList = connectedTools.length > 0 
      ? `[${connectedTools.map(tool => tool?.data.label.toLowerCase().replace(/\s+/g, '_')).join(', ')}]` 
      : '[]';
    
    code += `${mainAgent.data.label.toLowerCase().replace(/\s+/g, '_')} = Agent(\n`;
    code += `    name="${mainAgent.data.label.toLowerCase().replace(/\s+/g, '_')}",\n`;
    code += `    model="${modelName}",\n`;
    code += `    description="${mainAgent.data.description || 'An AI agent'}",\n`;
    code += `    instruction="${mainAgent.data.instruction || 'I am a helpful assistant.'}",\n`;
    code += `    tools=${toolList}\n`;
    code += `)\n`;
    
    // Add usage example
    code += `\n# Example usage\ndef main():\n`;
    code += `    response = ${mainAgent.data.label.toLowerCase().replace(/\s+/g, '_')}.generate("Hello, how can you help me today?")\n`;
    code += `    print(response)\n\n`;
    
    // Add MCP server start if any exist
    if (mcpServerNodes.length) {
      const serverVar = mcpServerNodes[0].data.label.toLowerCase().replace(/\s+/g, '_');
      code += `    # Start MCP server\n`;
      code += `    ${serverVar}.start()\n\n`;
    }
    
    code += `if __name__ == "__main__":\n`;
    code += `    main()\n`;
  } else {
    code += `# No agent nodes found in your flow. Add an agent node to generate code.\n`;
    code += `\n# Example agent code\n`;
    code += `example_agent = Agent(\n`;
    code += `    name="example_agent",\n`;
    code += `    model="gemini-2.0-flash",\n`;
    code += `    description="A helpful assistant agent that can answer questions.",\n`;
    code += `    instruction="I am a helpful assistant that provides accurate and detailed information.",\n`;
    code += `    tools=[]\n`;
    code += `)\n\n`;
    code += `# Example usage\n`;
    code += `response = example_agent.generate("Hello, how can you help me today?")\n`;
    code += `print(response)\n`;
  }
  
  return code;
}

function generateVertexCode(nodes: Node<BaseNodeData>[], edges: Edge[]): string {
  console.log('generateVertexCode: Generating Vertex AI code for', { 
    nodeCount: nodes.length, 
    edgeCount: edges.length 
  });
  
  // Generate Vertex AI code
  let code = `from google.cloud import aiplatform\n\n`;
  code += `# Initialize the Vertex AI SDK\n`;
  code += `aiplatform.init(project="your-project-id", location="your-location")\n\n`;
  
  // Find agent nodes
  const agentNodes = nodes.filter(node => node.data.type === 'agent');
  
  if (agentNodes.length > 0) {
    const mainAgent = agentNodes[0];
    
    code += `# Create an agent\n`;
    code += `agent = aiplatform.Agent.create(\n`;
    code += `    display_name="${mainAgent.data.label}",\n`;
    code += `    model="gemini-pro"\n`;
    code += `)\n\n`;
    
    code += `# Interact with the agent\n`;
    code += `response = agent.chat("Hello, how can I assist you today?")\n`;
    code += `print(response)\n`;
  } else {
    code += `# No agent nodes found in your flow. Add an agent node to generate code.\n`;
    code += `\n# Example agent code\n`;
    code += `agent = aiplatform.Agent.create(\n`;
    code += `    display_name="My Vertex AI Agent",\n`;
    code += `    model="gemini-pro"\n`;
    code += `)\n\n`;
    code += `# Interact with the agent\n`;
    code += `response = agent.chat("Hello, how can I assist you today?")\n`;
    code += `print(response)\n`;
  }
  
  return code;
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
  
  let code = `import openai
import json
from typing import Dict, List, Any, Optional
import os
import asyncio

# Get API key from environment variable
openai.api_key = os.environ.get("OPENAI_API_KEY", "")

`;

  // Add MCP imports if needed
  if (mcpNodes.length > 0) {
    code += `# MCP imports
from model_context_protocol import ServerParameters
from model_context_protocol.client import MCP_Client
from model_context_protocol.server import MCP_Server

`;
  }
  
  // Add custom tool definitions
  if (functionNodes.length > 0) {
    code += `# Define custom tools\n`;
    functionNodes.forEach(node => {
      const toolName = node.data.label.toLowerCase().replace(/\s+/g, '_');
      code += `def ${toolName}(params: Dict[str, Any]) -> Dict[str, Any]:\n`;
      code += `    """${node.data.description || `Implementation for ${node.data.label}`}\n`;
      code += `    \n`;
      code += `    Args:\n`;
      code += `        params: Parameters for the tool\n`;
      code += `    \n`;
      code += `    Returns:\n`;
      code += `        Result of the tool execution\n`;
      code += `    """\n`;
      code += `    # TODO: Implement ${node.data.label} functionality\n`;
      code += `    return {"result": f"Executed ${toolName} with {params}"}\n\n`;
    });
    
    // Add tools registry
    code += `# Register all available tools\n`;
    code += `TOOLS = {\n`;
    functionNodes.forEach(node => {
      const toolName = node.data.label.toLowerCase().replace(/\s+/g, '_');
      code += `    "${toolName}": ${toolName},\n`;
    });
    code += `}\n\n`;
  }
  
  // Add MCP Client and Server code if needed
  if (mcpNodes.length > 0) {
    const mcpClientNodes = nodes.filter(node => node.data.type === 'mcp-client');
    const mcpServerNodes = nodes.filter(node => node.data.type === 'mcp-server');
    
    if (mcpClientNodes.length > 0) {
      code += `async def setup_mcp_clients():\n`;
      code += `    """Set up MCP clients to connect to servers."""\n`;
      code += `    clients = {}\n`;
      
      mcpClientNodes.forEach(node => {
        const clientName = node.data.label.toLowerCase().replace(/\s+/g, '_');
        code += `    # Setup client for ${node.data.label}\n`;
        code += `    ${clientName} = await MCP_Client.create(url="${node.data.mcpUrl || 'http://localhost:8080'}")\n`;
        code += `    clients["${clientName}"] = ${clientName}\n`;
      });
      
      code += `    return clients\n\n`;
    }
    
    if (mcpServerNodes.length > 0) {
      code += `async def setup_mcp_servers():\n`;
      code += `    """Set up MCP servers to expose tools."""\n`;
      code += `    servers = {}\n`;
      
      mcpServerNodes.forEach(node => {
        const serverName = node.data.label.toLowerCase().replace(/\s+/g, '_');
        code += `    # Setup server for ${node.data.label}\n`;
        code += `    ${serverName} = MCP_Server()\n`;
        
        // Find connected tools to expose via MCP
        const connectedTools = edges
          .filter(edge => edge.source === node.id || edge.target === node.id)
          .map(edge => {
            const targetId = edge.source === node.id ? edge.target : edge.source;
            const targetNode = nodes.find(n => n.id === targetId);
            return targetNode?.data?.type === 'tool' || targetNode?.data?.type === 'input' 
              ? targetNode.data.label.toLowerCase().replace(/\s+/g, '_') 
              : null;
          })
          .filter(Boolean);
          
        if (connectedTools.length) {
          connectedTools.forEach(tool => {
            code += `    ${serverName}.register_tool("${tool}", TOOLS["${tool}"])\n`;
          });
        }
        
        code += `    servers["${serverName}"] = ${serverName}\n`;
      });
      
      code += `    # Start the servers\n`;
      mcpServerNodes.forEach(node => {
        const serverName = node.data.label.toLowerCase().replace(/\s+/g, '_');
        code += `    await servers["${serverName}"].start(port=${node.data.port || 8080})\n`;
      });
      
      code += `    return servers\n\n`;
    }
  }
  
  // Create agent class with MCP support
  code += `class Agent:\n`;
  code += `    def __init__(self, name: str, model: str = "gpt-4.1-mini", tools: Optional[List[str]] = None, mcp_clients=None):\n`;
  code += `        self.name = name\n`;
  code += `        self.model = model\n`;
  code += `        self.tools = tools or []\n`;
  code += `        self.conversation_history = []\n`;
  code += `        self.mcp_clients = mcp_clients or {}\n`;
  code += `    \n`;
  code += `    def add_message(self, role: str, content: str, name: Optional[str] = None) -> None:\n`;
  code += `        """Add a message to the conversation history."""\n`;
  code += `        message = {"role": role, "content": content}\n`;
  code += `        if name:\n`;
  code += `            message["name"] = name\n`;
  code += `        self.conversation_history.append(message)\n`;
  code += `    \n`;
  code += `    async def get_mcp_tool_response(self, client_name: str, tool_name: str, params: Dict):\n`;
  code += `        """Call an MCP tool through a client."""\n`;
  code += `        if client_name not in self.mcp_clients:\n`;
  code += `            return {"error": f"MCP client {client_name} not found"}\n`;
  code += `        \n`;
  code += `        client = self.mcp_clients[client_name]\n`;
  code += `        try:\n`;
  code += `            result = await client.call_tool(tool_name, params)\n`;
  code += `            return result\n`;
  code += `        except Exception as e:\n`;
  code += `            return {"error": f"MCP tool call failed: {str(e)}"}\n`;
  code += `    \n`;
  code += `    def generate(self, user_input: str) -> str:\n`;
  if (mcpNodes.length > 0) {
    code += `        """Generate a response using async event loop for MCP support."""\n`;
    code += `        return asyncio.run(self._generate_async(user_input))\n`;
    code += `    \n`;
    code += `    async def _generate_async(self, user_input: str) -> str:\n`;
  } else {
    code += `        """Generate a response to the user input using the configured model."""\n`;
  }
  
  code += `        # Add user message to history\n`;
  code += `        self.add_message("user", user_input)\n`;
  code += `        \n`;
  code += `        try:\n`;
  code += `            # Prepare available tools for the model\n`;
  code += `            available_tools = []\n`;
  code += `            for tool_name in self.tools:\n`;
  code += `                if tool_name.startswith("mcp_"):\n`;
  code += `                    # This is an MCP tool\n`;
  code += `                    parts = tool_name.split("_", 2)  # Format: mcp_clientname_toolname\n`;
  code += `                    if len(parts) < 3:\n`;
  code += `                        continue\n`;
  code += `                    client_name = parts[1]\n`;
  code += `                    tool_id = parts[2]\n`;
  code += `                    \n`;
  code += `                    available_tools.append({\n`;
  code += `                        "type": "function",\n`;
  code += `                        "function": {\n`;
  code += `                            "name": tool_name,\n`;
  code += `                            "description": f"MCP tool {tool_id} from client {client_name}",\n`;
  code += `                            "parameters": {\n`;
  code += `                                "type": "object",\n`;
  code += `                                "properties": {\n`;
  code += `                                    "params": {\n`;
  code += `                                        "type": "object",\n`;
  code += `                                        "description": "The parameters for the MCP tool"\n`;
  code += `                                    }\n`;
  code += `                                },\n`;
  code += `                                "required": ["params"]\n`;
  code += `                            }\n`;
  code += `                        }\n`;
  code += `                    })\n`;
  code += `                elif tool_name in TOOLS:\n`;
  code += `                    # Regular tool\n`;
  code += `                    tool_fn = TOOLS[tool_name]\n`;
  code += `                    available_tools.append({\n`;
  code += `                        "type": "function",\n`;
  code += `                        "function": {\n`;
  code += `                            "name": tool_name,\n`;
  code += `                            "description": tool_fn.__doc__,\n`;
  code += `                            "parameters": {\n`;
  code += `                                "type": "object",\n`;
  code += `                                "properties": {\n`;
  code += `                                    "params": {\n`;
  code += `                                        "type": "object",\n`;
  code += `                                        "description": "The parameters for the function"\n`;
  code += `                                    }\n`;
  code += `                                },\n`;
  code += `                                "required": ["params"]\n`;
  code += `                            }\n`;
  code += `                        }\n`;
  code += `                    })\n`;
  code += `            \n`;
  code += `            # Call the model\n`;
  code += `            response = openai.chat.completions.create(\n`;
  code += `                model=self.model,\n`;
  code += `                messages=self.conversation_history,\n`;
  code += `                tools=available_tools if available_tools else None,\n`;
  code += `                tool_choice="auto"\n`;
  code += `            )\n`;
  code += `            \n`;
  code += `            assistant_message = response.choices[0].message\n`;
  code += `            \n`;
  code += `            # Check if the model wants to call a tool\n`;
  code += `            if hasattr(assistant_message, "tool_calls") and assistant_message.tool_calls:\n`;
  code += `                # Add the assistant's message to the history\n`;
  code += `                self.add_message("assistant", assistant_message.content or "")\n`;
  code += `                \n`;
  code += `                # Handle each tool call\n`;
  code += `                for tool_call in assistant_message.tool_calls:\n`;
  code += `                    function_name = tool_call.function.name\n`;
  code += `                    function_args = json.loads(tool_call.function.arguments)\n`;
  code += `                    \n`;
  code += `                    if function_name.startswith("mcp_"):\n`;
  code += `                        # This is an MCP tool call\n`;
  code += `                        parts = function_name.split("_", 2)  # Format: mcp_clientname_toolname\n`;
  code += `                        if len(parts) >= 3:\n`;
  code += `                            client_name = parts[1]\n`;
  code += `                            tool_id = parts[2]\n`;
  code += `                            \n`;
  code += `                            # Execute the MCP tool\n`;
  code += `                            tool_result = await self.get_mcp_tool_response(\n`;
  code += `                                client_name, tool_id, function_args.get("params", {})\n`;
  code += `                            )\n`;
  code += `                            \n`;
  code += `                            # Add the tool result to history\n`;
  code += `                            self.add_message(\n`;
  code += `                                "tool",\n`;
  code += `                                json.dumps(tool_result),\n`;
  code += `                                name=function_name\n`;
  code += `                            )\n`;
  code += `                    elif function_name in TOOLS:\n`;
  code += `                        # Regular tool call\n`;
  code += `                        tool_result = TOOLS[function_name](function_args.get("params", {}))\n`;
  code += `                        \n`;
  code += `                        # Add the tool result to history\n`;
  code += `                        self.add_message(\n`;
  code += `                            "tool",\n`;
  code += `                            json.dumps(tool_result),\n`;
  code += `                            name=function_name\n`;
  code += `                        )\n`;
  code += `                \n`;
  code += `                # Get a new response from the model that takes into account the tool results\n`;
  code += `                try:\n`;
  code += `                    second_response = openai.chat.completions.create(\n`;
  code += `                        model=self.model,\n`;
  code += `                        messages=self.conversation_history\n`;
  code += `                    )\n`;
  code += `                    \n`;
  code += `                    final_content = second_response.choices[0].message.content\n`;
  code += `                    self.add_message("assistant", final_content or "")\n`;
  code += `                    return final_content or ""\n`;
  code += `                except Exception as e:\n`;
  code += `                    print(f"Error getting second response: {e}")\n`;
  code += `                    return "Error processing tool results. Please try again."\n`;
  code += `            else:\n`;
  code += `                # No tool calls, just return the response\n`;
  code += `                content = assistant_message.content or ""\n`;
  code += `                self.add_message("assistant", content)\n`;
  code += `                return content\n`;
  code += `        except Exception as e:\n`;
  code += `            print(f"Error in generate method: {e}")\n`;
  code += `            return f"An error occurred: {str(e)}"\n\n`;
  
  // Main function with async setup if needed
  if (mcpNodes.length > 0) {
    code += `async def setup_agent():\n`;
    code += `    """Set up the agent with MCP connections."""\n`;
    
    if (mcpNodes.filter(node => node.data.type === 'mcp-client').length > 0) {
      code += `    # Setup MCP clients\n`;
      code += `    mcp_clients = await setup_mcp_clients()\n`;
    } else {
      code += `    mcp_clients = {}\n`;
    }
    
    if (mcpNodes.filter(node => node.data.type === 'mcp-server').length > 0) {
      code += `    # Setup MCP servers\n`;
      code += `    mcp_servers = await setup_mcp_servers()\n`;
    }
  }
  
  // Create the agent instance
  if (agentNodes.length > 0) {
    const mainAgent = agentNodes[0];
    
    // Find the model used by the agent
    let modelName = "gpt-4.1-mini";  // Default
    const connectedModelEdge = edges.find(edge => 
      (edge.source === mainAgent.id || edge.target === mainAgent.id) && 
      nodes.find(n => (n.id === edge.target || n.id === edge.source) && n.data.type === 'model')
    );
    
    if (connectedModelEdge) {
      const modelId = connectedModelEdge.source === mainAgent.id ? connectedModelEdge.target : connectedModelEdge.source;
      const connectedModel = nodes.find(node => node.id === modelId);
      if (connectedModel && connectedModel.data.modelType) {
        modelName = connectedModel.data.modelType;
      }
    }
    
    // Find tools used by the agent - check connections in both directions
    const toolNames: string[] = [];
    
    // Tools connected to the agent (agent -> tool or tool -> agent)
    edges.forEach(edge => {
      const isFromAgent = edge.source === mainAgent.id;
      const isToAgent = edge.target === mainAgent.id;
      
      if (isFromAgent || isToAgent) {
        const toolId = isFromAgent ? edge.target : edge.source;
        const tool = nodes.find(n => n.id === toolId);
        
        if (tool) {
          if (tool.data.type === 'tool' || tool.data.type === 'input') {
            toolNames.push(tool.data.label.toLowerCase().replace(/\s+/g, '_'));
          } else if (tool.data.type === 'mcp-tool') {
            // For MCP tools, we need to find the connected client
            const mcpClientEdge = edges.find(e => 
              (e.source === tool.id || e.target === tool.id) &&
              nodes.find(n => (n.id === e.source || n.id === e.target) && n.data.type === 'mcp-client')
            );
            
            if (mcpClientEdge) {
              const clientId = mcpClientEdge.source === tool.id ? mcpClientEdge.target : mcpClientEdge.source;
              const client = nodes.find(n => n.id === clientId && n.data.type === 'mcp-client');
              
              if (client) {
                const clientName = client.data.label.toLowerCase().replace(/\s+/g, '_');
                const toolName = tool.data.label.toLowerCase().replace(/\s+/g, '_');
                toolNames.push(`mcp_${clientName}_${tool.data.mcpToolId || toolName}`);
              }
            }
          }
        }
      }
    });
    
    if (mcpNodes.length > 0) {
      code += `    # Create an instance of the agent with MCP support\n`;
      code += `    agent = Agent(\n`;
      code += `        name="${mainAgent.data.label.toLowerCase().replace(/\s+/g, '_')}",\n`;
      code += `        model="${modelName}",\n`;
      code += `        tools=[${toolNames.map(name => `"${name}"`).join(', ')}],\n`;
      code += `        mcp_clients=mcp_clients\n`;
      code += `    )\n`;
      code += `    return agent\n\n`;
      
      code += `# Example usage\n`;
      code += `async def main():\n`;
      code += `    agent = await setup_agent()\n`;
      code += `    try:\n`;
      code += `        response = agent.generate("Hello, can you help me with something?")\n`;
      code += `        print(response)\n`;
      code += `    except Exception as e:\n`;
      code += `        print(f"Error running agent: {e}")\n\n`;
      
      code += `if __name__ == "__main__":\n`;
      code += `    asyncio.run(main())\n`;
    } else {
      code += `# Create an instance of the agent\n`;
      code += `agent = Agent(\n`;
      code += `    name="${mainAgent.data.label.toLowerCase().replace(/\s+/g, '_')}",\n`;
      code += `    model="${modelName}",\n`;
      code += `    tools=[${toolNames.map(name => `"${name}"`).join(', ')}]\n`;
      code += `)\n\n`;
      
      code += `# Example usage\n`;
      code += `if __name__ == "__main__":\n`;
      code += `    try:\n`;
      code += `        response = agent.generate("Hello, can you help me with something?")\n`;
      code += `        print(response)\n`;
      code += `    except Exception as e:\n`;
      code += `        print(f"Error running agent: {e}")\n`;
    }
  } else {
    code += `# Create a default agent instance\n`;
    code += `agent = Agent(\n`;
    code += `    name="default_agent",\n`;
    code += `    model="gpt-4.1-mini",\n`;
    code += `    tools=[]\n`;
    code += `)\n\n`;
    
    code += `# Example usage\n`;
    code += `if __name__ == "__main__":\n`;
    code += `    try:\n`;
    code += `        response = agent.generate("Hello, can you help me with something?")\n`;
    code += `        print(response)\n`;
    code += `    except Exception as e:\n`;
    code += `        print(f"Error running agent: {e}")\n`;
  }
  
  return code;
}