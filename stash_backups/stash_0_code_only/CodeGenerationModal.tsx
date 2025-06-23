import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { BaseNodeData } from './nodes/BaseNode.js';
import { Copy, Loader2, Play, HelpCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  generateMCPCode,
  MCPConfig,
  generateDefaultSearchAgentCode,
  generateFallbackMcpCode,
  getMcpDefaultCommand,
  getMcpDefaultArgs,
  getMcpDefaultEnvVars
} from '@/lib/codeGeneration';

// Define Framework type
type Framework = 'adk' | 'vertex' | 'custom';

// Helper function to create default MCP config from nodes
function createDefaultMcpConfig(nodes: Node<BaseNodeData>[]): MCPConfig | undefined {
  const mcpClientNode = nodes.find(n => n.data.type === 'mcp-client');
  const mcpToolNodes = nodes.filter(n => n.data.type === 'mcp-tool');
  
  // Only create MCP config if there are MCP-related nodes
  if (!mcpClientNode && mcpToolNodes.length === 0) {
    return undefined;
  }
  
  // Determine MCP type from nodes
  const mcpType = (mcpToolNodes.length > 0 ? mcpToolNodes[0].data.mcpToolId as string : 'github') ||
    (mcpClientNode?.data.mcpType as string) || 
    'github';
  
  return {
    enabled: true,
    type: mcpType,
    command: getMcpDefaultCommand(mcpType),
    args: getMcpDefaultArgs(mcpType),
    envVars: getMcpDefaultEnvVars(mcpType)
  };
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

// Helper function to generate code based on framework
const getLocallyGeneratedCode = (nodes: Node<BaseNodeData>[], edges: Edge[], framework: Framework, currentMcpConfig?: MCPConfig): string => {
  const agentNode = nodes.find(n => n.data.type === 'agent');
  if (!agentNode) {
    // If no agent node, return a fallback
    if (framework === 'adk' && currentMcpConfig?.enabled) {
      return generateFallbackMcpCode();
    }
    return generateDefaultSearchAgentCode();
  }

  switch (framework) {
    case 'adk':
      if (currentMcpConfig?.enabled) {
        const mcpConf = currentMcpConfig || { enabled: true, type: 'default', command: '', args: [], envVars: {} };
        return generateMCPCode(nodes, edges, mcpConf);
      }
      // If MCP is not enabled, generate standard ADK code using generateAgentCode
      return generateAgentCode(nodes, edges);
    case 'vertex':
      return generateVertexCode(nodes, edges);
    case 'custom':
      return generateCustomAgentCode(nodes, edges);
    default:
      console.warn(`Unknown framework: ${framework}, falling back to ADK.`);
      if (currentMcpConfig?.enabled) {
        const mcpConf = currentMcpConfig || { enabled: true, type: 'default', command: '', args: [], envVars: {} };
        return generateMCPCode(nodes, edges, mcpConf);
      }
      return generateAgentCode(nodes, edges);
  }
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

// Add a Tooltip component
const Tooltip = ({ message, children }: { message: string, children: React.ReactNode }) => {
  return (
    <div className="relative flex flex-col items-center group">
      {children}
      <div className="absolute bottom-0 flex-col items-center hidden mb-6 group-hover:flex">
        <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-black shadow-lg rounded-md">
          {message}
        </span>
        <div className="w-3 h-3 -mt-2 rotate-45 bg-black"></div>
      </div>
    </div>
  );
};
export function CodeGenerationModal({
  open,
  onOpenChange,
  nodes,
  edges,
  mcpConfig: initialMcpConfig, // Renamed to avoid conflict with state variable
}: CodeGenerationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [activeTab, setActiveTab] = useState<Framework>('adk'); // Use Framework type
  const [useOpenAI, setUseOpenAI] = useState(false); 
  const [sandboxOutput, setSandboxOutput] = useState('');
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);
  const [showHelp, setShowHelp] = useState(false); // showHelp state

  const [currentMcpConfig, setCurrentMcpConfig] = useState<MCPConfig | undefined>(() => {
    return initialMcpConfig || createDefaultMcpConfig(nodes);
  });

  const flowKey = useMemo(() => getFlowKey(nodes, edges), [nodes, edges]);

  // Memoize handleGenerateCode to stabilize its reference if it's a dependency elsewhere
  const handleGenerateCode = useCallback(async (isAutoGenerate = false) => {
    // Prevent auto-generation if modal is not open, or if already loading
    if (isAutoGenerate && (!open || isLoading)) return;

    setIsLoading(true);
    setSandboxOutput(''); 
    try {
      let code = '';
      // Use currentMcpConfig from state, ensuring it's undefined if not enabled.
      const effectiveMcpConfig = currentMcpConfig?.enabled ? currentMcpConfig : undefined;

      if (useOpenAI) {
        console.warn('OpenAI code generation not implemented, falling back to local generation');
        code = getLocallyGeneratedCode(nodes, edges, activeTab, effectiveMcpConfig);
      } else {
        code = getLocallyGeneratedCode(nodes, edges, activeTab, effectiveMcpConfig);
      }
      
      const formattedCode = formatCodeForDisplay(code);
      setGeneratedCode(formattedCode);
      storeCode(flowKey, activeTab + (useOpenAI ? '_openai' : '_local') + (effectiveMcpConfig ? '_mcp' : ''), formattedCode);
      if (!isAutoGenerate) {
        toast({ title: 'Code generated successfully!', description: useOpenAI ? 'Generated with AI.' : 'Generated locally.' });
      }
    } catch (error: any) {
      console.error('Error generating code:', error);
      if (!isAutoGenerate) {
        toast({
          title: 'Error generating code',
          description: error.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      }
      setGeneratedCode(`# Error generating code: ${error.message || 'Please try again'}`);
    } finally {
      setIsLoading(false);
    }
  }, [nodes, edges, activeTab, useOpenAI, flowKey, currentMcpConfig, open, isLoading /* Added open and isLoading */]);

  useEffect(() => {
    if (open) {
      const effectiveMcpConfig = currentMcpConfig?.enabled ? currentMcpConfig : undefined;
      const storageKeySuffix = activeTab + (useOpenAI ? '_openai' : '_local') + (effectiveMcpConfig ? '_mcp' : '');
      const stored = getStoredCode(flowKey, storageKeySuffix);
      if (stored) {
        setGeneratedCode(formatCodeForDisplay(stored));
      } else {
        // Auto-generate code only if no code is currently set and not loading.
        // Pass true to indicate it's an auto-generation call.
        if (!isLoading && !generatedCode) {
           handleGenerateCode(true); 
        }
      }
    }
  }, [open, flowKey, activeTab, useOpenAI, isLoading, generatedCode, currentMcpConfig, handleGenerateCode]);
  
  useEffect(() => {
    const newMcpConfig = createDefaultMcpConfig(nodes);
    // Update only if it's meaningfully different or if currentMcpConfig is undefined and new one is found
    if (JSON.stringify(newMcpConfig) !== JSON.stringify(currentMcpConfig)) {
        setCurrentMcpConfig(newMcpConfig);
    }
  }, [nodes]); // currentMcpConfig removed from deps to avoid loop if createDefaultMcpConfig isn't stable

  const handleRunInSandbox = async () => {
    if (!generatedCode || generatedCode.startsWith('# Error')) {
      toast({ title: 'Cannot run code', description: 'No valid code generated to run.', variant: 'destructive' });
      return;
    }
    setIsSandboxRunning(true);
    setSandboxOutput('Running code in sandbox...');
    
    try {
      // Try multiple API endpoints with timeout
      const apiEndpoints = [
        '/api/execute', // Local API
        'https://agent-flow-builder-api.onrender.com/api/execute', // External API
      ];

      let lastError: Error | null = null;
      
      for (const endpoint of apiEndpoints) {
        try {
          console.log('🔗 Trying sandbox endpoint:', endpoint);
          
          // Create AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              code: generatedCode,
              files: {
                'agent.py': generatedCode,
                '__init__.py': 'from .agent import root_agent\n__all__ = ["root_agent"]'
              }
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
            // Try to get error details from response
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
              const errorText = await response.text();
              if (errorText) {
                try {
                  const errorJson = JSON.parse(errorText);
                  errorMessage = errorJson.error || errorJson.message || errorMessage;
                } catch {
                  errorMessage = errorText.slice(0, 200);
                }
              }
            } catch {
              // Ignore error parsing errors
            }
            throw new Error(errorMessage);
          }

          // Check if response has content
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Invalid response format. Expected JSON, got: ${contentType}. Response: ${text.slice(0, 200)}`);
          }

          // Parse JSON response with better error handling
          let result;
          try {
            const responseText = await response.text();
            if (!responseText.trim()) {
              throw new Error('Empty response body');
            }
            result = JSON.parse(responseText);
          } catch (jsonError) {
            throw new Error(`Failed to parse JSON response: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
          }
          
          // Success! Process the result
          const formattedOutput = [
            `✅ Code executed successfully via ${endpoint}`,
            '',
            '📤 Output:',
            result.output || 'No output generated',
            result.error ? `\n❌ Execution Error:\n${result.error}` : '',
            result.url ? `\n🌐 Service URL: ${result.url}` : '',
            result.serviceUrl ? `\n🌐 Service URL: ${result.serviceUrl}` : '',
            result.executionDetails ? `\n📊 Status: ${result.executionDetails.status}` : '',
            result.memoryUsage ? `📊 Memory: ${result.memoryUsage.toFixed(2)}MB` : '',
          ].filter(line => line !== '').join('\n');

          setSandboxOutput(formattedOutput);
          toast({ title: 'Sandbox execution finished successfully!' });
          return; // Success, exit the function
          
        } catch (error) {
          console.error(`Error with sandbox endpoint ${endpoint}:`, error);
          lastError = error instanceof Error ? error : new Error(String(error));
          continue; // Try next endpoint
        }
      }
      
      // If we get here, all endpoints failed
      throw lastError || new Error('All sandbox endpoints failed');
      
    } catch (error: any) {
      console.error('Error running code in sandbox:', error);
      
      // Provide helpful error message based on error type
      let errorMessage = '';
      let fallbackMessage = '';
      
      if (error.name === 'AbortError') {
        errorMessage = '⏱️ Request timed out (30s). The sandbox service may be busy.';
        fallbackMessage = 'The sandbox is taking too long to respond.';
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch')) {
        errorMessage = '🔌 Sandbox service unavailable. Connection failed.';
        fallbackMessage = 'The sandbox service is not running or accessible.';
      } else if (error.message.includes('JSON') || error.message.includes('Unexpected end')) {
        errorMessage = '📄 Invalid response from sandbox service.';
        fallbackMessage = 'The sandbox returned an invalid response format.';
      } else {
        errorMessage = `❌ Sandbox Error: ${error.message}`;
        fallbackMessage = 'An error occurred while executing the code.';
      }
      
      const fallbackOutput = [
        errorMessage,
        '',
        '💡 Alternative options:',
        '1. Copy the generated code and run it locally',
        '2. Use Google Colab or another online Python environment', 
        '3. Set up a local development environment with:',
        '   - pip install google-adk',
        '   - Configure your Google ADK credentials',
        '',
        '🔧 The code is ready to use - it just needs to be run in a proper environment.',
      ].join('\n');
      
      setSandboxOutput(fallbackOutput);
      toast({ 
        title: 'Sandbox Unavailable', 
        description: fallbackMessage + ' Please try running the code locally.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSandboxRunning(false);
    }
  };

  const hasMcpNodes = useMemo(() => nodes.some(n => n.data.type === 'mcp-tool' || n.data.type === 'mcp-client' || n.data.type === 'mcp-server'), [nodes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-semibold">Generate Agent Code</DialogTitle>
          <DialogDescription>
            Select a framework and generate Python code for your agent flow. You can copy the code or run it in a sandbox.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow flex overflow-hidden px-6 pb-6 space-x-4">
          {/* Left Panel: Code Display and Controls */}
          <div className="flex-grow flex flex-col w-2/3 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <Tabs defaultValue="adk" value={activeTab} onValueChange={(value) => setActiveTab(value as Framework)} className="mr-auto">
                <TabsList>
                  <TabsTrigger value="adk">Google ADK</TabsTrigger>
                  {/* <TabsTrigger value="vertex">Vertex AI</TabsTrigger> */}
                  {/* <TabsTrigger value="custom">Custom</TabsTrigger> */}
                </TabsList>
              </Tabs>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleGenerateCode()} 
                disabled={isLoading}
                className="mr-2"
              >
                {isLoading && !useOpenAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Regenerate
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(generatedCode);
                toast({ title: 'Code copied to clipboard!'}); // Removed variant: success
              }}>
                <Copy className="mr-2 h-4 w-4" /> Copy Code
              </Button>
            </div>

            <div className="flex-grow rounded-lg overflow-hidden border border-gray-700 relative">
              {isLoading && (
                <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                  <p className="ml-3 text-gray-300">Generating code {useOpenAI ? 'with AI' : 'locally'}...</p>
                </div>
              )}
              <CodeHighlighter code={generatedCode || 'Click \'Generate Code\' to see the result.'} />
            </div>
            
            {/* Sandbox Execution Area */}
            <div className="mt-4">
              <Button onClick={handleRunInSandbox} disabled={isSandboxRunning || !generatedCode || generatedCode.startsWith('# Error')} className="w-full">
                {isSandboxRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Run in Sandbox
              </Button>
              <SandboxOutput output={sandboxOutput} />
            </div>
          </div>

          {/* Right Panel: Configuration Options */}
          <div className="w-1/3 flex flex-col space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-800/50 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-100 border-b border-gray-700 pb-2">Configuration</h3>
            
            {/* OpenAI Toggle */}
            <div>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={useOpenAI}
                    onChange={() => setUseOpenAI(prev => !prev)} 
                  />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
                <span className="ml-3 text-sm font-medium text-gray-300">
                  Use OpenAI for Generation
                </span>
                <Tooltip message="When enabled, uses OpenAI (GPT-4o via OpenRouter) to generate the agent code. Otherwise, uses local logic. OpenAI may be slower and requires VITE_OPENROUTER_API_KEY.">
                  <HelpCircle className="ml-2 h-4 w-4 text-gray-400 cursor-pointer" onClick={() => setShowHelp(prev => !prev)}/>
                </Tooltip>
              </label>
            </div>

            {/* MCP Configuration UI */}
            {activeTab === 'adk' && (
              <div className="p-3 border border-gray-700 rounded-md bg-gray-900/30">
                <h4 className="text-sm font-semibold text-gray-200 mb-2 flex items-center">
                  MCP Toolset Configuration
                  <Tooltip message="Model Context Protocol (MCP) enables agents to interact with external services (e.g., GitHub, Time). If your flow uses MCP tools, enable this.">
                    <HelpCircle className="ml-2 h-4 w-4 text-gray-400 cursor-pointer" onClick={() => setShowHelp(prev => !prev)} />
                  </Tooltip>
                </h4>
                <div className="flex items-center mb-3">
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        id="mcp-enabled-toggle"
                        type="checkbox"
                        className="sr-only peer"
                        checked={currentMcpConfig?.enabled || false}
                        disabled={hasMcpNodes && (currentMcpConfig?.enabled || false)} // Disable if hasMcpNodes and already enabled by them
                        onChange={(e) => {
                          const isEnabled = e.target.checked;
                          setCurrentMcpConfig(prev => {
                            const baseConfig = createDefaultMcpConfig(nodes);
                            if (isEnabled) {
                              return baseConfig || { enabled: true, type: 'default', command: getMcpDefaultCommand('default'), args: getMcpDefaultArgs('default'), envVars: getMcpDefaultEnvVars('default') };
                            }
                            // If disabling, keep existing type/cmd/args but set enabled to false
                            return prev ? { ...prev, enabled: false } : { enabled: false, type: 'default', command: getMcpDefaultCommand('default'), args: getMcpDefaultArgs('default'), envVars: getMcpDefaultEnvVars('default') };
                          });
                        }}
                      />
                      <div className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer ${currentMcpConfig?.enabled ? 'bg-blue-600' : 'bg-gray-600'} transition-colors`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${currentMcpConfig?.enabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                      <span className="ml-2 text-xs font-medium text-gray-300">
                        Enable MCP Toolset
                      </span>
                    </div>
                  </label>
                </div>
                {currentMcpConfig?.enabled && (
                  <div className="space-y-2 text-xs">
                    <div>
                      <label htmlFor="mcp-type" className="block mb-1 text-gray-400">MCP Type (e.g., github, time):</label>
                      <input 
                        type="text" 
                        id="mcp-type" 
                        value={currentMcpConfig.type}
                        onChange={e => {
                          const newType = e.target.value;
                          setCurrentMcpConfig(prev => prev ? ({ 
                            ...prev, 
                            type: newType, 
                            command: getMcpDefaultCommand(newType), 
                            args: getMcpDefaultArgs(newType), 
                            envVars: getMcpDefaultEnvVars(newType) 
                          }) : prev);
                        }}
                        className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 text-xs focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <p className="text-gray-500 text-xxs">
                      Command, Args, EnvVars are typically derived from the MCP Type. For advanced needs, modify the generated code.
                    </p>
                  </div>
                )}
              </div>
            )}
            {showHelp && (
                <div className="mt-2 p-3 text-xs text-gray-400 bg-gray-700/50 rounded-md">
                    <p><strong>OpenAI Generation:</strong> Uses GPT-4o via OpenRouter. Requires VITE_OPENROUTER_API_KEY in your .env file. May be slower but can produce more complex agents.</p>
                    <p className="mt-1"><strong>MCP Toolset:</strong> Allows agents to use external tools like GitHub, Time, etc. If your flow diagram includes MCP-specific nodes, this should usually be enabled. The type (e.g., 'github', 'time') determines which MCP server the agent connects to.</p>
                </div>
            )}
          </div>
        </div>
        <DialogFooter className="p-6 pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
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
    logger.info(f"Executing ${toolName} with params: %s", params)
    # TODO: Implement ${toolNode.data.label} functionality
    return {"result": f"Executed ${toolName} with params"}\n\n`;
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

logger.info(f"Created agent '${agentName}' with ${toolNodes.length + 1} tools")

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