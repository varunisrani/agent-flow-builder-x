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
import { Copy, AlertCircle, Loader2, Play } from 'lucide-react';
import { toast } from '@/hooks/use-toast.js';
import { generateCode } from '@/lib/codeGenerator.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
function cleanGeneratedCode(code: string): string {
  // Remove any markdown code block indicators
  code = code.replace(/```python\n/g, '');
  code = code.replace(/```\n?/g, '');
  code = code.trim();

  // If code doesn't have the basic structure, use the template
  if (!code.includes('from google.adk.agents') || !code.includes('google_search')) {
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
      let code: string;
      if (activeTab === 'adk') {
        try {
          code = await generateCodeWithOpenAI(nodes, edges, mcpEnabled);
          code = cleanGeneratedCode(code);
        } catch (openaiError) {
          console.error('OpenAI error generating code:', openaiError);
          code = getLocallyGeneratedCode(nodes, edges, activeTab);
          toast({
            title: "Using Local Generation",
            description: "OpenAI API error. Using local code generation instead.",
            variant: "default"
          });
        }
      } else {
        const framework = activeTab as 'adk' | 'vertex' | 'custom';
        code = await generateCode(nodes, edges, framework);
        code = cleanGeneratedCode(code);
      }

      code = formatCodeForDisplay(code);
      setGeneratedCode(code);
      storeCode(flowKey, activeTab, code);
      setIsFirstGeneration(false);
      console.log('CodeGenerationModal: Code generated and stored successfully');
    } catch (error) {
      console.error('Error generating code:', error);
      setError(error instanceof Error ? error.message : 'An error occurred generating code');
      const localCode = getLocallyGeneratedCode(nodes, edges, activeTab);
      const cleanedCode = cleanGeneratedCode(localCode);
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
    console.log('CodeGenerationModal: Regenerating code');
    setLoading(true);
    setError(null);
    
    try {
      let code: string;
      if (activeTab === 'adk') {
        code = await generateCodeWithOpenAI(nodes, edges, mcpEnabled);
      } else {
        const framework = activeTab as 'adk' | 'vertex' | 'custom';
        code = await generateCode(nodes, edges, framework);
      }
      
      code = cleanGeneratedCode(code);
      code = formatCodeForDisplay(code);
      setGeneratedCode(code);
      storeCode(flowKey, activeTab, code);
      toast({
        title: "Code regenerated",
        description: "The code has been regenerated and saved."
      });
    } catch (error) {
      console.error('Error regenerating code:', error);
      setError(error instanceof Error ? error.message : 'Failed to regenerate code');
      const localCode = getLocallyGeneratedCode(nodes, edges, activeTab);
      const cleanedCode = cleanGeneratedCode(localCode);
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
                  onClick={async () => {
                    console.log('CodeGenerationModal: Regenerating code with OpenAI');
                    setLoading(true);
                    setError(null);
                    
                    try {
                      const code = await generateCodeWithOpenAI(nodes, edges, mcpEnabled);
                      setGeneratedCode(code);
                      toast({
                        title: "Code regenerated",
                        description: "The code has been regenerated with OpenAI."
                      });
                    } catch (err) {
                      console.error('Error regenerating code:', err);
                      // Fall back to local generation
                      const localCode = getLocallyGeneratedCode(nodes, edges, activeTab);
                      setGeneratedCode(localCode);
                      toast({
                        title: "Using Local Generation",
                        description: "API server not available. Using local code generation instead.",
                        variant: "default"
                      });
                    } finally {
                      setLoading(false);
                    }
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
            {isFirstGeneration ? 'Initial generation' : 'Saved version'}
          </div>
          <div className="flex gap-2">
            <Button 
              disabled={loading} 
              onClick={handleRegenerate}
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

// Update the generateCodeWithOpenAI function to prioritize node data
async function generateCodeWithOpenAI(nodes: Node<BaseNodeData>[], edges: Edge[], mcpEnabled: boolean): Promise<string> {
  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured. Please add VITE_OPENROUTER_API_KEY to your .env file.');
    }

    // Get agent node and its details
    const agentNode = nodes.find(n => n.data.type === 'agent');
    if (!agentNode) {
      console.warn('No agent node found, using default agent configuration');
      return generateDefaultSearchAgentCode();
    }

    // Extract all node data - prioritize node-specific data
    const agentName = agentNode.data.label?.toLowerCase().replace(/\s+/g, '_') || 'search_agent';
    const agentPrompt = agentNode.data.prompt || agentNode.data.instruction || agentNode.data.description;
    const agentDescription = agentNode.data.description || 
      (agentPrompt ? `Agent that ${agentPrompt.split('\n')[0].toLowerCase()}` : 'Search agent');
    const agentInstruction = agentNode.data.instruction || agentPrompt || 'Use Google Search to find accurate and up-to-date information. Always cite your sources and provide context from search results.';

    // Create a detailed prompt with actual node data
    const messages = [
      {
        role: "system",
        content: `You are a Google ADK expert. Generate Python code for a search agent using the Google ADK framework.
The code must use the exact configuration provided - do not add default behaviors.
Generate clean, minimal code that follows the standard Google ADK pattern.`
      },
      {
        role: "user",
        content: `Generate a Google ADK agent with this exact configuration:

Name: ${agentName}
Description: ${agentDescription}
Instruction: ${agentInstruction}

Requirements:
1. Use the exact configuration provided above
2. Use the google_search tool from google.adk.tools
3. Use the gemini-2.0-flash model
4. Generate clean, minimal code following the standard pattern`
      }
    ];

    // Call OpenRouter API
    const result = await callOpenRouter('/chat/completions', {
      model: 'openai/gpt-4.1-mini',
      messages: messages,
      temperature: 0.2,
      max_tokens: 1000
    });

    let code = result.choices[0].message.content;
    code = cleanGeneratedCode(code);
    
    // If the generated code doesn't look right, use local generation
    if (!code.includes('google_search') || !code.includes('Agent(')) {
      console.log('Generated code missing required elements, using local generation');
      return getLocallyGeneratedCode(nodes, edges, 'adk');
    }

    // Validate that the code uses the correct configuration
    if (!code.includes(agentDescription) || !code.includes(agentInstruction)) {
      console.log('Generated code not using provided configuration, using local generation');
      return getLocallyGeneratedCode(nodes, edges, 'adk');
    }
    
    return code;
  } catch (error) {
    console.error('Error generating code with OpenRouter:', error);
    // Fallback to local generation
    return getLocallyGeneratedCode(nodes, edges, 'adk');
  }
}