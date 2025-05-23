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
import { Copy, AlertCircle, Loader2, Play } from 'lucide-react';
import { toast } from '@/hooks/use-toast.js';
import { generateCode as generateCodeFromLib } from '@/lib/codeGenerator.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import OpenAI from 'openai';
import API_CONFIG from '@/config';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Enable client-side usage
});

// Rate limiting utilities
const REQUEST_QUEUE = [];
let IS_CIRCUIT_OPEN = false;
let LAST_SUCCESS_TIME = Date.now();
let CONSECUTIVE_FAILURES = 0;

// Global rate limiter and circuit breaker
const rateLimiter = {
  // Circuit breaker parameters
  maxConsecutiveFailures: 5,
  circuitResetTimeMs: 10000, // 10 seconds
  maxConcurrentRequests: 2,
  activeRequests: 0,
  
  // Check if we should allow this request
  canMakeRequest: function() {
    // If circuit is open (in failure mode), check if enough time has passed to try again
    if (IS_CIRCUIT_OPEN) {
      const timeSinceLastFailure = Date.now() - LAST_SUCCESS_TIME;
      if (timeSinceLastFailure > this.circuitResetTimeMs) {
        console.log('🔄 Circuit breaker reset, allowing a test request');
        // Allow one test request
        IS_CIRCUIT_OPEN = false;
        CONSECUTIVE_FAILURES = 0;
        return true;
      }
      console.log('🛑 Circuit breaker open, blocking request');
      return false;
    }
    
    // Check if we're already at max concurrent requests
    if (this.activeRequests >= this.maxConcurrentRequests) {
      console.log(`⏳ Too many concurrent requests (${this.activeRequests}/${this.maxConcurrentRequests})`);
      return false;
    }
    
    return true;
  },
  
  // Record a successful request
  recordSuccess: function() {
    LAST_SUCCESS_TIME = Date.now();
    CONSECUTIVE_FAILURES = 0;
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  },
  
  // Record a failed request
  recordFailure: function() {
    CONSECUTIVE_FAILURES++;
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    
    // Open the circuit if we've had too many consecutive failures
    if (CONSECUTIVE_FAILURES >= this.maxConsecutiveFailures) {
      console.log(`🔌 Opening circuit breaker after ${CONSECUTIVE_FAILURES} consecutive failures`);
      IS_CIRCUIT_OPEN = true;
    }
  },
  
  // Start tracking a new request
  startRequest: function() {
    this.activeRequests++;
  }
};

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

// Add new component for sandbox output display
const SandboxOutput: React.FC<{ output: string }> = ({ output }) => {
  if (!output) return null;
  
  return (
    <div className="mt-4 font-mono text-sm">
      <div className="bg-gray-900 rounded-md p-4 overflow-auto max-h-[200px]">
        <pre className="text-gray-200 whitespace-pre-wrap">{output}</pre>
      </div>
    </div>
  );
};

// Add new component for "Open Link" button
const OpenLinkButton: React.FC<{ url: string; label?: string }> = ({ url, label = "Open Agent UI" }) => {
  if (!url) return null;
  
  return (
    <div className="mt-4 flex justify-center">
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
      >
        {label}
        <span className="text-sm">↗</span>
      </a>
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

// Add a helper function to clean generated code
function cleanGeneratedCode(code: string): string {
  // Remove any "Note:" or comment blocks at the end
  const noteIndex = code.indexOf('\nNote:');
  if (noteIndex !== -1) {
    code = code.substring(0, noteIndex);
  }
  
  // Remove any trailing comments that might be added by the model
  const lines = code.split('\n');
  while (lines.length > 0 && (
    lines[lines.length - 1].trim().startsWith('#') || 
    lines[lines.length - 1].trim() === ''
  )) {
    lines.pop();
  }
  
  // Remove any markdown code block indicators
  code = lines.join('\n').trim();
  code = code.replace(/```python\n/g, '');
  code = code.replace(/```\n?/g, '');
  
  return code;
}

// Add a helper function to format the code for display
function formatCodeForDisplay(code: string): string {
  // Remove any markdown code block indicators if they exist
  code = code.replace(/```python\n/g, '');
  code = code.replace(/```\n?/g, '');
  
  // Remove any leading/trailing whitespace
  code = code.trim();
  
  return code;
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
  const [agentUrl, setAgentUrl] = useState<string>('');
  const [showOpenLink, setShowOpenLink] = useState(false);
  // Added option to control automatic execution
  const [autoExecute, setAutoExecute] = useState(false);

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
      
      // If auto-execute is enabled, execute the stored code
      if (autoExecute && storedCode) {
        executeInSandbox(storedCode);
      }
      return;
    }

    // If no stored code, generate new code
    if (isFirstGeneration) {
      console.log('CodeGenerationModal: No stored code found, generating new code');
      generateInitialCode();
    }
  }, [open, activeTab, flowKey, autoExecute]);

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
        code = await generateCodeFromLib(nodes, edges, framework);
        code = cleanGeneratedCode(code);
      }

      code = formatCodeForDisplay(code);
      setGeneratedCode(code);
      storeCode(flowKey, activeTab, code);
      setIsFirstGeneration(false);
      console.log('CodeGenerationModal: Code generated and stored successfully');
      
      // Auto-execute the code if enabled
      if (autoExecute && code) {
        executeInSandbox(code);
      }
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
      
      // Auto-execute the fallback code if enabled
      if (autoExecute && cleanedCode) {
        executeInSandbox(cleanedCode);
      }
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

  const handleExecuteClick = () => {
    if (generatedCode) {
      executeInSandbox(generatedCode);
    } else {
    toast({
        title: "No Code Available",
        description: "Please generate code first before executing.",
    });
    }
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
        code = await generateCodeFromLib(nodes, edges, framework);
      }
      
      code = cleanGeneratedCode(code);
      code = formatCodeForDisplay(code);
      setGeneratedCode(code);
      storeCode(flowKey, activeTab, code);
      toast({
        title: "Code regenerated",
        description: "The code has been regenerated and saved."
      });
      
      // Auto-execute the code if enabled
      if (autoExecute && code) {
        executeInSandbox(code);
      }
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
      
      // Auto-execute the fallback code if enabled
      if (autoExecute && cleanedCode) {
        executeInSandbox(cleanedCode);
      }
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
    setAgentUrl('');
    setShowOpenLink(false);

    // Setup alternative endpoints to try if primary fails
    const endpoints = [
      'https://agent-flow-builder-api.onrender.com/api/execute',
     
    ];
    
    // Remove duplicates
    const uniqueEndpoints = [...new Set(endpoints)];
    
    let lastError = null;
    let responseData = null;

    try {
      // Input validation
      if (!code.trim()) {
        throw new Error('No code provided to execute');
      }

      // Check if we can make a request now
      if (!rateLimiter.canMakeRequest()) {
        throw new Error("Rate limit protection active. Please wait 10-15 seconds and try again.");
      }

      // Split the code into agent.py and __init__.py
      const agentCode = code;
      const initCode = 'from .agent import root_agent\n__all__ = ["root_agent"]';

      // Try each endpoint with exponential backoff for rate limits
      let apiResponse = null;
      const MAX_RETRIES = 3;
      
      // Record that we're starting a request
      rateLimiter.startRequest();
      
      for (const apiUrl of uniqueEndpoints) {
        let retries = 0;
        let shouldRetry = true;
        
        while (shouldRetry && retries < MAX_RETRIES) {
          try {
            // Calculate backoff delay with much longer intervals (500ms, 2s, 4.5s)
            const backoffDelay = retries > 0 ? (Math.pow(2, retries) - 1) * 500 : 0;
            
            if (backoffDelay > 0) {
              console.log(`⏱️ Rate limit encountered. Retrying in ${backoffDelay}ms (attempt ${retries + 1}/${MAX_RETRIES})...`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
            
            console.log(`📝 Trying API endpoint: ${apiUrl}${retries > 0 ? ` (retry ${retries}/${MAX_RETRIES})` : ''}`);
            
            apiResponse = await fetch(apiUrl, {
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
            
            if (apiResponse.ok) {
              console.log('✅ API endpoint succeeded:', apiUrl);
              rateLimiter.recordSuccess();
              shouldRetry = false;
              break; // Found a working endpoint
            } else {
              const errorStatus = apiResponse.status;
              const errorText = await apiResponse.text().catch(() => "No error details available");
              
              // Check if it's a rate limit error (429 or 500 with rate limit message)
              const isRateLimitError = 
                errorStatus === 429 || 
                (errorStatus === 500 && errorText.toLowerCase().includes('rate limit'));
              
              if (isRateLimitError && retries < MAX_RETRIES - 1) {
                console.warn(`⚠️ Rate limit detected (${errorStatus}): Will retry with longer delay`);
                retries++;
                shouldRetry = true;
                // Continue retry loop
              } else {
                console.warn(`⚠️ API endpoint failed (${errorStatus}):`, apiUrl, errorText);
                lastError = new Error(`API Error (${errorStatus}): ${errorText || "No details available"}`);
                shouldRetry = false;
                apiResponse = null; // Reset for next endpoint
                break;
              }
            }
          } catch (fetchError) {
            console.warn(`⚠️ Fetch error with endpoint:`, apiUrl, fetchError);
            lastError = fetchError;
            shouldRetry = false;
            break;
          }
        }
        
        if (apiResponse?.ok) {
          break; // Successfully got a response, exit the endpoint loop
        }
      }
      
      // Record failure if no successful response
      if (!apiResponse || !apiResponse.ok) {
        rateLimiter.recordFailure();
        
        // Provide more helpful error messages based on the specific situation
        if (IS_CIRCUIT_OPEN) {
          throw new Error("Service temporarily unavailable due to rate limiting. Please wait 10-15 seconds before trying again.");
        } else if (lastError && typeof lastError === 'object' && 'message' in lastError && 
            typeof lastError.message === 'string' && lastError.message.toLowerCase().includes('rate limit')) {
          throw new Error("Rate limit exceeded. Please wait a minute and try again.");
        } else {
          throw lastError || new Error("All API endpoints failed");
        }
      }

      responseData = await apiResponse.json();
      
      // Check if the response contains openUrl and showOpenLink fields
      if (responseData.openUrl) {
        // Append query parameter to select our agent package
        const url = new URL(responseData.openUrl);
        if (!url.searchParams.has('app')) {
          url.searchParams.set('app', 'agent_package');
        }
        setAgentUrl(url.toString());
        setShowOpenLink(responseData.showOpenLink || true);
      } else if (responseData.executionDetails?.serverUrl) {
        // Fallback to serverUrl if openUrl is not available
        const url = new URL(responseData.executionDetails.serverUrl);
        if (!url.searchParams.has('app')) {
          url.searchParams.set('app', 'agent_package');
        }
        setAgentUrl(url.toString());
        setShowOpenLink(true);
      }
      
      // Format and display the output
      const executionTime = performance.now() - startTime;
      const formattedOutput = [
        `✨ Execution completed in ${executionTime.toFixed(2)}ms`,
        '📤 Output:',
        responseData.output || 'No output generated',
        responseData.error ? `\n❌ Error:\n${responseData.error}` : '',
        '\n📊 Execution Details:',
        `• Status: ${responseData.executionDetails?.status || 'unknown'}`,
        `• Exit Code: ${responseData.executionDetails?.exitCode}`,
        `• Memory Usage: ${responseData.memoryUsage?.toFixed(2)}MB`,
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

  const generateCode = useCallback(() => {
    // Create a simplified representation of the flow
    const nodeDescriptions = nodes.map(node => ({
      id: node.id,
      type: node.data.type,
      label: node.data.label,
      description: node.data.description || '',
      instruction: node.data.instruction || '',
      modelType: node.data.modelType || ''
    }));

    // Generate the Google ADK code
    const hasTools = nodes.some(node => node.data.type === 'tool');
    const agentInstruction = nodes.find(n => n.data.type === 'agent')?.data.instruction || 'Respond helpfully and concisely to the user\'s question. Use Google Search if needed.';
    
    const code = `import os
from google.adk.agents import LlmAgent
from google.adk.tools import google_search

# Set Google API key
os.environ["GOOGLE_API_KEY"] = "AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY"

# Define a simple agent that answers user questions using an LLM and optional tools
root_agent = LlmAgent(
    model="gemini-2.0-flash-exp",  # Use your preferred model
    name="question_answer_agent",
    description="A helpful assistant agent that can answer general questions.",
    instruction="${agentInstruction}",
    tools=[google_search] if ${hasTools} else None,
    api_key="AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY"  # Provide API key directly
)`;

    return code;
  }, [nodes]);

  useEffect(() => {
    if (autoExecute) {
    const code = generateCode();
    executeInSandbox(code);
    }
  }, [generateCode, autoExecute]);

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

        <Tabs 
          defaultValue="adk" 
          value={activeTab} 
          onValueChange={(newTab) => {
            // Reset execution state when changing tabs
            if (isExecuting) {
              setIsExecuting(false);
              setSandboxOutput('Execution stopped due to tab change.');
              setShowOpenLink(false);
              toast({
                title: "Execution Stopped",
                description: "Code execution was stopped due to tab change.",
                variant: "default"
              });
            }
            setActiveTab(newTab);
          }}
        >
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
            <div className="flex items-center gap-2 ml-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={autoExecute}
                  onChange={() => {
                    const newValue = !autoExecute;
                    setAutoExecute(newValue);
                    toast({
                      title: newValue ? "Auto-Execute Enabled" : "Auto-Execute Disabled",
                      description: newValue 
                        ? "Code will automatically execute when generated." 
                        : "Code will only execute when you click the Execute button.",
                      variant: "default"
                    });
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                <span className="ms-3 text-sm font-medium">Auto-Execute Code</span>
              </label>
              <div className="text-xs text-muted-foreground ml-14 mt-1">
                When disabled, code will not automatically run in the browser
              </div>
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
                        onClick={handleExecuteClick}
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
                  
                  {/* Add the OpenLinkButton component */}
                  {showOpenLink && agentUrl && (
                    <OpenLinkButton url={agentUrl} label="Open Agent UI" />
                  )}
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
  let code = `import os\nfrom google.adk.agents import Agent\n\n`;
  
  // Add API key setup
  code += `# Set Google API key\nos.environ["GOOGLE_API_KEY"] = "AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY"\n\n`;
  
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
      code += `    server_url="${node.data.mcpUrl || 'http:// localhost:8080'}"\n`;
      code += `)\n`;
    });
  }

  // Generate MCP tool codes
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
    code += `    tools=${toolList},\n`;
    code += `    api_key="AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY"  # Provide API key directly\n`;
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
    code += `    tools=[],\n`;
    code += `    api_key="AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY"  # Provide API key directly\n`;
    code += `)\n\n`;
    code += `# Example usage\n`;
    code += `response = example_agent.generate("Hello, how can I assist you today?")\n`;
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

// Add the missing generateCodeWithOpenAI function
async function generateCodeWithOpenAI(nodes: Node<BaseNodeData>[], edges: Edge[], mcpEnabled: boolean): Promise<string> {
  try {
    // Create a simplified representation of the flow
    const nodeDescriptions = nodes.map(node => ({
      id: node.id,
      type: node.data.type,
      label: node.data.label,
      description: node.data.description || '',
      instruction: node.data.instruction || '',
      modelType: node.data.modelType || ''
    }));

    // Generate the Google ADK code
    const hasTools = nodes.some(node => node.data.type === 'tool');
    const agentInstruction = nodes.find(n => n.data.type === 'agent')?.data.instruction || 'Respond helpfully and concisely to the user\'s question. Use Google Search if needed.';
    const toolsConfig = hasTools ? '[google_search]' : 'None';
    
    const code = [
      'import os',
      'from google.adk.agents import LlmAgent',
      'from google.adk.tools import google_search',
      '',
      '# Set Google API key',
      'os.environ["GOOGLE_API_KEY"] = "AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY"',
      '',
      '# Define a simple agent that answers user questions using an LLM and optional tools',
      'root_agent = LlmAgent(',
      '    model="gemini-2.0-flash-exp",  # Use your preferred model',
      '    name="question_answer_agent",',
      '    description="A helpful assistant agent that can answer general questions.",',
      `    instruction="${agentInstruction}",`,
      `    tools=${toolsConfig},`,
      '    api_key="AIzaSyB6ibSXYT7Xq7rSzHmq7MH76F95V3BCIJY"  # Provide API key directly',
      ')'
    ].join('\n');

    return code;
  } catch (error) {
    console.error('Error generating code with OpenAI:', error);
    throw error;
  }
}
