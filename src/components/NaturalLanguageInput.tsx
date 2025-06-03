import { useState, useRef, useEffect } from 'react';
import { PanelTop, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { generateFlow } from '@/lib/openai.js';
import { toast } from '@/hooks/use-toast.js';  
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from './nodes/BaseNode.js';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
// Select component no longer needed as we only support Smithery MCP
import { MCP_TYPES } from '@/lib/constants';
import { MCPConfig } from '@/lib/codeGeneration';

interface NaturalLanguageInputProps {
  expanded: boolean;
  onToggle: () => void;
  onGenerate: (prompt: string, nodes: Node<BaseNodeData>[], edges: Edge[], mcpConfig?: MCPConfig) => void;
}

export function NaturalLanguageInput({ expanded, onToggle, onGenerate }: NaturalLanguageInputProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // MCP configuration state (Smithery only)
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [mcpCommand, setMcpCommand] = useState(MCP_TYPES[0].command);
  const [mcpArgs, setMcpArgs] = useState<string[]>(MCP_TYPES[0].defaultArgs);
  const [mcpEnvVars, setMcpEnvVars] = useState<{ [key: string]: string }>(MCP_TYPES[0].defaultEnvVars);
  
  // Smithery-specific state
  const [smitheryMcp, setSmitheryMcp] = useState('');
  const [smitheryApiKey, setSmitheryApiKey] = useState('');
  
  // Environment variable state
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  
  // Initialize Smithery MCP configuration
  useEffect(() => {
    const mcpType = MCP_TYPES[0]; // Only Smithery MCP is available
    setMcpCommand(mcpType.command);
    setMcpArgs(mcpType.defaultArgs);
    setMcpEnvVars(mcpType.defaultEnvVars);
    setSmitheryMcp(mcpType.smitheryMcp || '');
    setSmitheryApiKey(mcpType.defaultEnvVars['SMITHERY_API_KEY'] || '');
  }, []);
  
  // Focus the textarea when expanded
  useEffect(() => {
    if (expanded && textAreaRef.current) {
      console.log('NaturalLanguageInput: Component expanded, focusing textarea');
      textAreaRef.current.focus();
    }
  }, [expanded]);
  
  // Clear error when prompt changes
  useEffect(() => {
    if (error) {
      console.log('NaturalLanguageInput: Clearing error as prompt changed');
      setError(null);
    }
  }, [prompt, error]);
  
  const handleAddEnvVar = () => {
    if (newEnvKey && newEnvValue) {
      setMcpEnvVars(prev => ({
        ...prev,
        [newEnvKey]: newEnvValue
      }));
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };
  
  const handleRemoveEnvVar = (key: string) => {
    setMcpEnvVars(prev => {
      const newVars = { ...prev };
      delete newVars[key];
      return newVars;
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    console.log('NaturalLanguageInput: Form submitted');
    e.preventDefault();
    if (prompt.trim()) {
      handleGenerate();
    }
  };
  
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    console.log('NaturalLanguageInput: Starting flow generation with prompt:', prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''));
    setIsGenerating(true);
    setError(null);
    
    try {
      toast({
        title: "Flow Generation Started",
        description: `Generating ${mcpEnabled ? 'MCP-enabled ' : ''}agent flow from: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
        duration: 5000,
      });
      
      // Call the OpenAI service to generate the flow
      console.log('NaturalLanguageInput: Calling OpenAI service');
      let { nodes, edges } = await generateFlow(prompt);
      
      // If MCP is enabled, add necessary Smithery MCP nodes
      if (mcpEnabled) {
        const agentNode = nodes.find(n => n.data.type === 'agent');
        if (agentNode) {
          // Create MCP client node with user configuration
          const mcpClientNode: Node<BaseNodeData> = {
            id: `node_${Date.now()}_mcp_client`,
            type: 'baseNode',
            position: { x: agentNode.position.x + 200, y: agentNode.position.y },
            data: {
              label: smitheryMcp ? `Smithery Client: ${smitheryMcp.split('/').pop()}` : `Smithery Client`,
              type: 'mcp-client',
              description: smitheryMcp ? `MCP client for ${smitheryMcp} operations` : `MCP client for Smithery operations`,
              mcpUrl: 'http://localhost:8080',
              mcpType: 'smithery',
              smitheryMcp: smitheryMcp,
              smitheryApiKey: smitheryApiKey,
              mcpCommand: mcpCommand,
              mcpArgs: mcpArgs.join(' '),
              mcpEnvVars: JSON.stringify(mcpEnvVars)
            },
            draggable: true
          };
          
          // Create single MCP tool node with actual user configuration
          const mcpToolNode: Node<BaseNodeData> = {
            id: `node_${Date.now()}_mcp_tool`,
            type: 'baseNode',
            position: {
              x: mcpClientNode.position.x + 200,
              y: mcpClientNode.position.y
            },
            data: {
              label: smitheryMcp ? `Smithery MCP: ${smitheryMcp}` : `Smithery MCP Tool`,
              type: 'mcp-tool',
              description: smitheryMcp ? `MCP tool for ${smitheryMcp} operations` : `MCP tool for Smithery operations`,
              mcpToolId: smitheryMcp || '@smithery/mcp-example',
              mcpCommand: mcpCommand,
              mcpArgs: mcpArgs.join(' '),
              mcpEnvVars: JSON.stringify(mcpEnvVars),
              smitheryMcp: smitheryMcp,
              smitheryApiKey: smitheryApiKey
            },
            draggable: true
          };
          
          // Add edges to connect nodes
          const newEdges: Edge[] = [
            // Connect agent to MCP client
            {
              id: `edge_${Date.now()}_agent_client`,
              source: agentNode.id,
              target: mcpClientNode.id,
              type: 'default'
            },
            // Connect MCP client to MCP tool
            {
              id: `edge_${Date.now()}_client_tool`,
              source: mcpClientNode.id,
              target: mcpToolNode.id,
              type: 'default'
            }
          ];
          
          // Update nodes and edges
          nodes = [...nodes, mcpClientNode, mcpToolNode];
          edges = [...edges, ...newEdges];
          
          // Update agent node with Smithery-specific information
          agentNode.data.instruction = getDefaultInstructionForMcpType('smithery');
        }
      }
      
      // Only add Google Search if explicitly mentioned in the prompt
      if (prompt.toLowerCase().includes('google search') || 
          prompt.toLowerCase().includes('search tool') || 
          prompt.toLowerCase().includes('web search')) {
        
        const agentNode = nodes.find(n => n.data.type === 'agent');
        if (agentNode) {
          // Check if we already have a search node
          const existingSearchNode = nodes.find(n => 
            n.data.type === 'tool' && 
            (n.data.label?.toLowerCase().includes('search') || n.data.description?.toLowerCase().includes('search'))
          );
          
          // Only add if not already present
          if (!existingSearchNode) {
            const googleSearchNode: Node<BaseNodeData> = {
              id: `node_${Date.now()}_google_search`,
              type: 'baseNode',
              position: { 
                x: agentNode.position.x + 200, 
                y: agentNode.position.y + 100 // Position it below any potential MCP nodes
              },
              data: {
                label: 'Google Search',
                type: 'tool',
                description: 'Google Search tool for finding information',
              },
              draggable: true
            };
            
            const searchEdge: Edge = {
              id: `edge_${Date.now()}_agent_search`,
              source: agentNode.id,
              target: googleSearchNode.id,
              type: 'default'
            };
            
            nodes = [...nodes, googleSearchNode];
            edges = [...edges, searchEdge];
          }
        }
      }
      
      console.log('NaturalLanguageInput: Flow generated successfully:', { 
        nodeCount: nodes.length, 
        edgeCount: edges.length 
      });
      
      if (nodes.length === 0) {
        throw new Error("No nodes were generated. Please try a more detailed description.");
      }
      
      // Create MCP configuration if enabled (Smithery only)
      const mcpConfig = mcpEnabled ? {
        enabled: true,
        type: 'smithery',
        command: mcpCommand,
        args: mcpArgs,
        envVars: mcpEnvVars,
        smitheryMcp: smitheryMcp,
        smitheryApiKey: smitheryApiKey,
        availableFunctions: getMcpToolDescription('smithery')
      } : undefined;
      
      // Call the parent callback with the generated flow
      console.log('NaturalLanguageInput: Calling onGenerate callback');
      onGenerate(prompt, nodes, edges, mcpConfig);
      
      toast({
        title: "Flow Generation Complete",
        description: `Created ${nodes.length} nodes and ${edges.length} connections`,
        duration: 3000,
      });
      
      // Reset the prompt after successful generation
      setPrompt('');
    } catch (error) {
      console.error('Error generating flow:', error);
      
      // Set error message for display in the UI
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      console.log('NaturalLanguageInput: Error in generation', errorMessage);
      setError(errorMessage);
      
      toast({
        title: "Flow Generation Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      console.log('NaturalLanguageInput: Generation process completed');
      setIsGenerating(false);
    }
  };
  
  return (
    <div className={cn(
      "fixed left-1/2 transform -translate-x-1/2 transition-all duration-300 glass rounded-t-xl border border-white/10 z-10",
      expanded ? "bottom-0 w-2/3" : "bottom-0 w-64 translate-y-[calc(100%-48px)]"
    )}>
      <div 
        className="flex items-center justify-between p-3 border-b border-white/10 cursor-pointer"
        onClick={() => {
          console.log('NaturalLanguageInput: Toggle clicked, current state:', expanded);
          onToggle();
        }}
      >
        <div className="flex items-center gap-2">
          <PanelTop className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Google ADK Agent Builder</h3>
        </div>
        <div className="w-4 h-4 rounded-full bg-primary/50" />
      </div>
      
      {expanded && (
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Switch
              id="mcp-mode"
              checked={mcpEnabled}
              onCheckedChange={setMcpEnabled}
            />
            <Label htmlFor="mcp-mode">Enable MCP Support</Label>
          </div>
          
          {mcpEnabled && (
            <div className="space-y-4 mb-4 p-4 bg-gray-900/50 rounded-lg">
              <div className="text-sm font-medium text-primary mb-2">Smithery MCP Configuration</div>
              
              <div className="space-y-2">
                <Label>Command</Label>
                <Input 
                  value={mcpCommand}
                  onChange={(e) => setMcpCommand(e.target.value)}
                  placeholder="Command (e.g., npx)"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Arguments</Label>
                <Input 
                  value={mcpArgs.join(' ')}
                  onChange={(e) => setMcpArgs(e.target.value.split(' ').filter(Boolean))}
                  placeholder="Command arguments"
                />
              </div>
              
              <div className="space-y-4 mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="space-y-2">
                  <Label>Smithery MCP Package</Label>
                  <Input
                    value={smitheryMcp}
                    onChange={(e) => {
                      setSmitheryMcp(e.target.value);
                      // Update args with the new MCP package name
                      const newArgs = [...mcpArgs];
                      // Find the index after 'run' in the args array
                      const runIndex = newArgs.indexOf('run');
                      if (runIndex >= 0 && runIndex < newArgs.length - 1) {
                        newArgs[runIndex + 1] = e.target.value;
                      } else if (runIndex >= 0) {
                        newArgs.push(e.target.value);
                      }
                      setMcpArgs(newArgs);
                    }}
                    placeholder="@username/mcp-name"
                  />
                  <div className="text-xs text-muted-foreground">
                    Enter the Smithery MCP package name (e.g., @yokingma/time-mcp)
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Smithery API Key</Label>
                  <Input
                    type="password"
                    value={smitheryApiKey}
                    onChange={(e) => {
                      setSmitheryApiKey(e.target.value);
                      // Update environment variables with the new API key
                      setMcpEnvVars(prev => ({
                        ...prev,
                        'SMITHERY_API_KEY': e.target.value
                      }));
                    }}
                    placeholder="Your Smithery API key"
                  />
                  <div className="text-xs text-muted-foreground">
                    You can get your API key from <a href="https://smithery.ai/account/api-keys" target="_blank" className="text-primary hover:underline">smithery.ai/account/api-keys</a>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Environment Variables</Label>
                <div className="space-y-2">
                  {Object.entries(mcpEnvVars).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Input value={key} disabled className="flex-1" />
                      <Input 
                        value={value}
                        onChange={(e) => setMcpEnvVars(prev => ({
                          ...prev,
                          [key]: e.target.value
                        }))}
                        className="flex-1"
                      />
                      <button
                        onClick={() => handleRemoveEnvVar(key)}
                        className="p-2 text-red-500 hover:text-red-400"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-2">
                    <Input
                      value={newEnvKey}
                      onChange={(e) => setNewEnvKey(e.target.value)}
                      placeholder="ENV_KEY"
                      className="flex-1"
                    />
                    <Input
                      value={newEnvValue}
                      onChange={(e) => setNewEnvValue(e.target.value)}
                      placeholder="value"
                      className="flex-1"
                    />
                    <button
                      onClick={handleAddEnvVar}
                      disabled={!newEnvKey || !newEnvValue}
                      className="p-2 text-green-500 hover:text-green-400 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground mb-3">
            {mcpEnabled 
              ? `Describe your Google ADK agent that uses Smithery MCP functionality.`
              : "Describe your Google ADK agent. Include specific tools needed like Google Search if required."}
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                ref={textAreaRef}
                value={prompt}
                onChange={(e) => {
                  console.log('NaturalLanguageInput: Prompt updated, length:', e.target.value.length);
                  setPrompt(e.target.value);
                }}
                placeholder={mcpEnabled 
                  ? `Create a Google ADK agent that uses Smithery MCP to perform operations with external systems and APIs. For example: "Create an agent that can interact with the specified Smithery MCP package."`
                  : "Create a Google ADK agent that handles specific tasks. If you need search functionality, mention 'Google Search' explicitly."}
                className={cn(
                  "w-full h-24 bg-background rounded-md border p-3 text-sm resize-none",
                  error ? "border-red-500" : "border-border",
                  isGenerating && "opacity-70"
                )}
                disabled={isGenerating}
              />
              {prompt && !isGenerating && (
                <button
                  type="button"
                  onClick={() => {
                    console.log('NaturalLanguageInput: Clear prompt button clicked');
                    setPrompt('');
                  }}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {error && (
              <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                  prompt.trim() && !isGenerating
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                {isGenerating ? "Generating..." : `Generate ${mcpEnabled ? 'MCP ' : ''}Agent`}
              </button>
            </div>
          </form>
          
          {!error && (
            <div className="mt-3 text-xs text-muted-foreground">
              <strong>Tips:</strong>
              <ul className="list-disc list-inside mt-1">
                {mcpEnabled ? (
                  <>
                    <li>The agent will use Smithery MCP</li>
                    <li>Available tools: {getMcpToolDescription('smithery')}</li>
                    <li>Configure command arguments and environment variables as needed</li>
                    <li>The agent will use the gemini-2.0-flash model for processing</li>
                  </>
                ) : (
                  <>
                    <li>Explicitly mention "Google Search" if you need search functionality</li>
                    <li>Describe the agent's purpose and capabilities clearly</li>
                    <li>The agent will use the gemini-2.0-flash model for processing</li>
                    <li>Include any specific tools or capabilities needed for your use case</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Function to get default instructions based on MCP type
const getDefaultInstructionForMcpType = (mcpType: string): string => {
  
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
- merge_pull_request(owner="owner", repo="repo", pull_number=123)`;
    case 'time':
      return `You are a helpful assistant that can perform time-related operations.

Available functions:
- get_current_time(timezone="IANA timezone name") - Get current time in a specific timezone
- convert_time(source_timezone="source IANA timezone", time="HH:MM", target_timezone="target IANA timezone") - Convert time between timezones

IMPORTANT RULES:
1. Always use valid IANA timezone names (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo')
2. Use 24-hour format for time (HH:MM)
3. Handle timezone conversions carefully`;
    case 'filesystem':
      return `Filesystem operations assistant.

Available functions:
- read_file(path="file path") - Read contents of a file
- write_file(path="file path", content="content") - Write content to a file
- list_directory(path="directory path") - List contents of a directory
- file_exists(path="file path") - Check if a file exists
- make_directory(path="directory path") - Create a directory`;
    case 'smithery':
      return 'You are an agent that can use Smithery MCP to perform operations. Use the Smithery MCP tool to interact with external systems and APIs.';
    default:
      return `MCP assistant for ${mcpType} operations. Use the available tools to help users with their requests.`;
  }
};

// Helper function to get MCP tool descriptions
const getMcpToolDescription = (mcpType: string): string => {
  
  switch (mcpType.toLowerCase()) {
    case 'github':
      return 'repository search, issues, pull requests, user info';
    case 'time':
      return 'current time, timezone conversion';
    case 'filesystem':
      return 'read/write files, list directories';
    case 'smithery':
      return 'Smithery MCP tool for interacting with external systems and APIs';
    default:
      return `operations related to ${mcpType}`;
  }
};