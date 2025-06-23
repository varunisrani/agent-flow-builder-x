import { useState, useRef, useEffect } from 'react';
import { PanelTop, XCircle, Loader2, AlertCircle, Store, ExternalLink, User, Plus, Settings, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { generateFlow, getApiKeyStatus, testOpenRouterApiKey } from '@/lib/openai.js';
import { toast } from '@/hooks/use-toast.js';
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from './nodes/BaseNode.js';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  SmitheryProfile, 
  CreateProfileRequest, 
  testSmitheryApiKey, 
  createProfile, 
  listProfiles, 
  deleteProfile,
  DEFAULT_SCHEMAS,
  DEFAULT_MODELS
} from '@/lib/smitheryApi.js';
// Select component no longer needed as we only support Smithery MCP
import { MCP_TYPES } from '@/lib/constants';
import { MCPConfig } from '@/lib/codeGeneration';

// OpenRouter API Key: Use environment variable (recommended for production)
// Hardcoded OpenRouter API Key (FOR DEMONSTRATION - NOT RECOMMENDED FOR PRODUCTION)
// const HARDCODED_OPENROUTER_API_KEY = "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";

// MCP Server Marketplace data
interface MCPServer {
  id: string;
  name: string;
  package: string;
  description: string;
  url: string;
  category: string;
  features: string[];
}

const MCP_SERVERS: MCPServer[] = [
  {
    id: 'vibecoder',
    name: 'VibeCoderMCP',
    package: '@crazyrabbitLTC/mcp-vibecoder',
    description: 'AI-powered code generation and development assistance with intelligent code suggestions and automated programming workflows.',
    url: 'https://smithery.ai/server/@crazyrabbitLTC/mcp-vibecoder',
    category: 'Development',
    features: ['Code Generation', 'AI Assistance', 'Development Workflows']
  },
  {
    id: 'biomcp',
    name: 'BioMCP',
    package: '@genomoncology/biomcp',
    description: 'Bioinformatics and genomics data processing server for analyzing biological sequences, genetic data, and molecular information.',
    url: 'https://smithery.ai/server/@genomoncology/biomcp',
    category: 'Science',
    features: ['Genomics', 'Bioinformatics', 'Data Analysis']
  },
  {
    id: 'sequential-thinking',
    name: 'Sequential Thinking Tools',
    package: '@xinzhongyouhai/mcp-sequentialthinking-tools',
    description: 'Advanced reasoning and sequential thinking tools for complex problem-solving and logical analysis workflows.',
    url: 'https://smithery.ai/server/@xinzhongyouhai/mcp-sequentialthinking-tools',
    category: 'AI/ML',
    features: ['Reasoning', 'Problem Solving', 'Logic Analysis']
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo Search',
    package: '@nickclyde/duckduckgo-mcp-server',
    description: 'Privacy-focused web search capabilities using DuckDuckGo search engine for secure information retrieval.',
    url: 'https://smithery.ai/server/@nickclyde/duckduckgo-mcp-server',
    category: 'Search',
    features: ['Web Search', 'Privacy-Focused', 'Information Retrieval']
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia MCP',
    package: '@Rudra-ravi/wikipedia-mcp',
    description: 'Wikipedia integration for accessing and searching encyclopedia content, articles, and knowledge base information.',
    url: 'https://smithery.ai/server/@Rudra-ravi/wikipedia-mcp',
    category: 'Knowledge',
    features: ['Wikipedia Search', 'Knowledge Base', 'Encyclopedia Access']
  },
  {
    id: 'agentic-control',
    name: 'Agentic Control Framework',
    package: '@FutureAtoms/agentic-control-framework',
    description: 'Advanced agent control and coordination framework for managing complex multi-agent systems and workflows.',
    url: 'https://smithery.ai/server/@FutureAtoms/agentic-control-framework',
    category: 'AI/ML',
    features: ['Agent Control', 'Multi-Agent Systems', 'Workflow Management']
  },
  {
    id: 'taskmanager',
    name: 'Task Manager',
    package: '@kazuph/mcp-taskmanager',
    description: 'Comprehensive task management system for organizing, tracking, and managing projects and to-do lists.',
    url: 'https://smithery.ai/server/@kazuph/mcp-taskmanager',
    category: 'Productivity',
    features: ['Task Management', 'Project Organization', 'To-Do Lists']
  },
  {
    id: 'time-mcp',
    name: 'Time MCP',
    package: '@yokingma/time-mcp',
    description: 'Time management and scheduling tools for handling dates, times, timezone conversions, and calendar operations.',
    url: 'https://smithery.ai/server/@yokingma/time-mcp',
    category: 'Productivity',
    features: ['Time Management', 'Timezone Conversion', 'Calendar Operations']
  },
  {
    id: 'context7',
    name: 'Context7 MCP',
    package: '@upstash/context7-mcp',
    description: 'Advanced context management and data storage solutions for maintaining conversation context and data persistence.',
    url: 'https://smithery.ai/server/@upstash/context7-mcp',
    category: 'Data',
    features: ['Context Management', 'Data Storage', 'Persistence']
  },
  {
    id: 'yahoo-finance',
    name: 'Yahoo Finance MCP',
    package: '@hwangwoohyun-nav/yahoo-finance-mcp',
    description: 'Financial data and market information access through Yahoo Finance API for stock prices, market analysis, and financial insights.',
    url: 'https://smithery.ai/server/@hwangwoohyun-nav/yahoo-finance-mcp',
    category: 'Finance',
    features: ['Stock Data', 'Market Analysis', 'Financial Information']
  },
  {
    id: 'geeknews',
    name: 'GeekNews MCP',
    package: '@the0807/geeknews-mcp-server',
    description: 'Technology news aggregation and analysis server for staying updated with the latest tech trends and developments.',
    url: 'https://smithery.ai/server/@the0807/geeknews-mcp-server',
    category: 'News',
    features: ['Tech News', 'News Aggregation', 'Trend Analysis']
  }
];

interface NaturalLanguageInputProps {
  expanded: boolean;
  onToggle: () => void;
  onGenerate: (prompt: string, nodes: Node<BaseNodeData>[], edges: Edge[], mcpConfig?: MCPConfig[]) => void;
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
  const [smitheryMcps, setSmitheryMcps] = useState<string[]>([]);
  const [smitheryApiKey, setSmitheryApiKey] = useState('');

  // Environment variable state
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  // MCP Server Marketplace state
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [selectedServers, setSelectedServers] = useState<MCPServer[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Smithery Profile Management state
  const [showProfiles, setShowProfiles] = useState(false);
  const [profiles, setProfiles] = useState<SmitheryProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [smitheryKeyValid, setSmitheryKeyValid] = useState<boolean | null>(null);
  const [checkingSmitheryKey, setCheckingSmitheryKey] = useState(false);
  
  // Profile creation state
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [newProfile, setNewProfile] = useState<CreateProfileRequest>({
    name: '',
    description: '',
    schema_id: 'openai.chat',
    defaults: {
      model: 'gpt-4o-mini',
      system_prompt: '',
      temperature: 0.7
    }
  });
  const [creatingProfile, setCreatingProfile] = useState(false);

  // API key status state
  const [apiKeyStatus, setApiKeyStatus] = useState<{ valid: boolean; error?: string } | null>(null);
  const [checkingApiKey, setCheckingApiKey] = useState(false);
  
  // Initialize Smithery MCP configuration
  useEffect(() => {
    const mcpType = MCP_TYPES[0]; // Only Smithery MCP is available
    setMcpCommand(mcpType.command);
    setMcpArgs(mcpType.defaultArgs);
    setMcpEnvVars(mcpType.defaultEnvVars);
    if (mcpType.smitheryMcp) {
      setSmitheryMcps([mcpType.smitheryMcp]);
    }
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

  // MCP Server Marketplace functions
  const handleSelectServer = (server: MCPServer) => {
    setSelectedServers(prev => {
      const exists = prev.some(s => s.id === server.id);
      if (exists) {
        setSmitheryMcps(pkgs => pkgs.filter(p => p !== server.package));
        return prev.filter(s => s.id !== server.id);
      }
      setSmitheryMcps(pkgs => [...pkgs, server.package]);
      return [...prev, server];
    });

    // Close marketplace
    setShowMarketplace(false);

    toast({
      title: "MCP Server Selected",
      description: `Toggled ${server.name} (${server.package})`,
      duration: 3000,
    });
  };

  // Filter servers based on search and category
  const filteredServers = MCP_SERVERS.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         server.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         server.package.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || server.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(MCP_SERVERS.map(server => server.category)))];

  // Smithery Profile Management Functions
  const checkSmitheryApiKey = async () => {
    if (!smitheryApiKey.trim()) {
      setSmitheryKeyValid(null);
      return;
    }

    setCheckingSmitheryKey(true);
    try {
      const result = await testSmitheryApiKey(smitheryApiKey);
      setSmitheryKeyValid(result.valid);
      
      if (result.valid) {
        // Load profiles if key is valid
        loadProfiles();
      } else if (result.error) {
        toast({
          title: "Invalid Smithery API Key",
          description: result.error,
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      setSmitheryKeyValid(false);
      console.error('Error checking Smithery API key:', error);
    } finally {
      setCheckingSmitheryKey(false);
    }
  };

  const loadProfiles = async () => {
    if (!smitheryApiKey.trim()) return;

    setLoadingProfiles(true);
    try {
      const userProfiles = await listProfiles(smitheryApiKey);
      setProfiles(userProfiles);
      
      if (userProfiles.length > 0 && !selectedProfile) {
        setSelectedProfile(userProfiles[0].id);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast({
        title: "Failed to load profiles",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!smitheryApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter a valid Smithery API key first",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (!newProfile.name.trim()) {
      toast({
        title: "Profile Name Required",
        description: "Please enter a name for the profile",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setCreatingProfile(true);
    try {
      const createdProfile = await createProfile(smitheryApiKey, newProfile);
      setProfiles(prev => [...prev, createdProfile]);
      setSelectedProfile(createdProfile.id);
      setShowCreateProfile(false);
      
      // Reset form
      setNewProfile({
        name: '',
        description: '',
        schema_id: 'openai.chat',
        defaults: {
          model: 'gpt-4o-mini',
          system_prompt: '',
          temperature: 0.7
        }
      });

      toast({
        title: "Profile Created",
        description: `Profile "${createdProfile.name}" created successfully`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        title: "Failed to create profile",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      await deleteProfile(smitheryApiKey, profileId);
      setProfiles(prev => prev.filter(p => p.id !== profileId));
      
      if (selectedProfile === profileId) {
        const remainingProfiles = profiles.filter(p => p.id !== profileId);
        setSelectedProfile(remainingProfiles.length > 0 ? remainingProfiles[0].id : '');
      }

      toast({
        title: "Profile Deleted",
        description: "Profile deleted successfully",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast({
        title: "Failed to delete profile",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Check Smithery API key when it changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (smitheryApiKey.trim()) {
        checkSmitheryApiKey();
      } else {
        setSmitheryKeyValid(null);
        setProfiles([]);
        setSelectedProfile('');
      }
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [smitheryApiKey]);

  // Check API key status on component mount
  useEffect(() => {
    const checkApiKey = async () => {
      setCheckingApiKey(true);
      try {
        // Add console log here to check the env variable
        console.log('NaturalLanguageInput: VITE_OPENROUTER_API_KEY is set:', !!import.meta.env.VITE_OPENROUTER_API_KEY);
        console.log('NaturalLanguageInput: VITE_OPENROUTER_API_KEY value (first 5 chars):', String(import.meta.env.VITE_OPENROUTER_API_KEY).substring(0, 5));

        const status = await testOpenRouterApiKey();
        setApiKeyStatus(status);

        if (!status.valid) {
          console.error('OpenRouter API key validation failed:', status.error);

          // Show debug information
          const debugInfo = getApiKeyStatus();
          console.log('API Key Debug Info:', debugInfo);
        }
      } catch (error) {
        console.error('Error checking API key:', error);
        setApiKeyStatus({
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setCheckingApiKey(false);
      }
    };

    checkApiKey();
  }, []);
  
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
          smitheryMcps.forEach((pkg, idx) => {
            const clientNode: Node<BaseNodeData> = {
              id: `node_${Date.now()}_${idx}_mcp_client`,
              type: 'baseNode',
              position: { x: agentNode.position.x + 200 + idx * 250, y: agentNode.position.y },
              data: {
                label: `Smithery Client: ${pkg.split('/').pop()}`,
                type: 'mcp-client',
                description: `MCP client for ${pkg} operations`,
                mcpUrl: 'http://localhost:8080',
                mcpType: 'smithery',
                smitheryMcp: pkg,
                smitheryApiKey: smitheryApiKey,
                mcpCommand: mcpCommand,
                mcpArgs: mcpArgs.join(' '),
                mcpEnvVars: JSON.stringify(mcpEnvVars),
                profileId: selectedProfile
              },
              draggable: true
            };

            const toolNode: Node<BaseNodeData> = {
              id: `node_${Date.now()}_${idx}_mcp_tool`,
              type: 'baseNode',
              position: {
                x: clientNode.position.x + 200,
                y: clientNode.position.y
              },
              data: {
                label: `Smithery MCP: ${pkg}`,
                type: 'mcp-tool',
                description: `MCP tool for ${pkg} operations`,
                mcpToolId: pkg,
                mcpCommand: mcpCommand,
                mcpArgs: mcpArgs.join(' '),
                mcpEnvVars: JSON.stringify(mcpEnvVars),
                smitheryMcp: pkg,
                smitheryApiKey: smitheryApiKey,
                profileId: selectedProfile
              },
              draggable: true
            };

            const newEdges: Edge[] = [
              {
                id: `edge_${Date.now()}_${idx}_agent_client`,
                source: agentNode.id,
                target: clientNode.id,
                type: 'default'
              },
              {
                id: `edge_${Date.now()}_${idx}_client_tool`,
                source: clientNode.id,
                target: toolNode.id,
                type: 'default'
              }
            ];

            nodes = [...nodes, clientNode, toolNode];
            edges = [...edges, ...newEdges];
          });

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
const uniquePkgs = Array.from(new Set(smitheryMcps));
const mcpConfigs = mcpEnabled ? uniquePkgs.map(pkg => {
  // Build MCP args with profile if selected
  let finalArgs = [...mcpArgs];
  
  // Add profile parameter if selected
  if (selectedProfile && smitheryKeyValid) {
    // Ensure --profile is not already in args
    if (!finalArgs.includes('--profile')) {
      finalArgs.push('--profile', selectedProfile);
    }
  }
  
  return {
    enabled: true,
    type: 'smithery',
    command: mcpCommand,
    args: finalArgs,
    envVars: mcpEnvVars,
    smitheryMcp: pkg,
    smitheryApiKey: smitheryApiKey,
    profileId: selectedProfile,
    availableFunctions: getMcpToolDescription('smithery')
  };
}) : undefined;

      
      // Call the parent callback with the generated flow
      console.log('NaturalLanguageInput: Calling onGenerate callback');
      onGenerate(prompt, nodes, edges, mcpConfigs);
      
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
      "fixed left-1/2 transform -translate-x-1/2 transition-all duration-300 bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 backdrop-blur-xl rounded-t-xl border-[2px] border-black/5 dark:border-white/10 shadow-2xl z-10",
      expanded ? "bottom-0 w-2/3" : "bottom-0 w-64 translate-y-[calc(100%-48px)]"
    )}>
      <div 
        className="flex items-center justify-between p-4 border-b-[2px] border-black/5 dark:border-white/10 cursor-pointer bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-transparent dark:from-purple-400/5 dark:via-orange-200/5 hover:from-purple-500/10 hover:via-pink-500/10 hover:to-transparent dark:hover:from-purple-400/10 dark:hover:via-orange-200/10 transition-all duration-300"
        onClick={() => {
          console.log('NaturalLanguageInput: Toggle clicked, current state:', expanded);
          onToggle();
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/30 dark:border-purple-400/30">
            <PanelTop className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200">
            CogentX Agent Builder
          </h3>
        </div>
        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-orange-200 animate-pulse" />
      </div>
      
      {expanded && (
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6 p-3 rounded-xl bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-sm border-[2px] border-black/5 dark:border-white/10">
            <Switch
              id="mcp-mode"
              checked={mcpEnabled}
              onCheckedChange={setMcpEnabled}
            />
            <Label htmlFor="mcp-mode" className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable MCP Support</Label>
          </div>
          
          {mcpEnabled && (
            <div className="space-y-6 mb-6 p-6 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent dark:from-blue-400/10 dark:via-purple-400/10 backdrop-blur-sm rounded-xl border-[2px] border-blue-500/20 dark:border-blue-400/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-transparent dark:from-blue-400/20 dark:via-purple-400/20 border border-blue-500/30 dark:border-blue-400/30">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">Smithery MCP Configuration</div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Command</Label>
                <Input 
                  value={mcpCommand}
                  onChange={(e) => setMcpCommand(e.target.value)}
                  placeholder="Command (e.g., npx)"
                  className="bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-sm border-[2px] border-black/5 dark:border-white/10 focus:border-purple-500/50 dark:focus:border-purple-400/50"
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Arguments</Label>
                <Input 
                  value={mcpArgs.join(' ')}
                  onChange={(e) => setMcpArgs(e.target.value.split(' ').filter(Boolean))}
                  placeholder="Command arguments"
                  className="bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-sm border-[2px] border-black/5 dark:border-white/10 focus:border-purple-500/50 dark:focus:border-purple-400/50"
                />
              </div>
              
              <div className="space-y-4 mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                {/* MCP Server Marketplace Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      MCP Server Marketplace
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMarketplace(!showMarketplace)}
                      className="text-xs"
                    >
                      {showMarketplace ? 'Hide' : 'Browse'} Servers
                    </Button>
                  </div>

                  {showMarketplace && (
                    <div className="space-y-3 p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                      {/* Search and Filter */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search servers..."
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          className="flex-1 text-xs"
                        />
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="px-2 py-1 text-xs bg-background border border-border rounded-md"
                        >
                          {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>

                      {/* Server Grid */}
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {filteredServers.map(server => (
                          <div
                            key={server.id}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                              selectedServers.some(s => s.id === server.id)
                                ? "border-primary bg-primary/10"
                                : "border-gray-600 bg-gray-800/30"
                            )}
                            onClick={() => handleSelectServer(server)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-medium text-white truncate">{server.name}</h4>
                                  <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                                    {server.category}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300 mb-2 line-clamp-2">{server.description}</p>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {server.features.slice(0, 3).map(feature => (
                                    <span key={feature} className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded">
                                      {feature}
                                    </span>
                                  ))}
                                </div>
                                <code className="text-xs text-blue-400 bg-gray-900/50 px-1.5 py-0.5 rounded">
                                  {server.package}
                                </code>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(server.url, '_blank');
                                }}
                                className="p-1 h-auto text-gray-400 hover:text-white"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {filteredServers.length === 0 && (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            No servers found matching your criteria
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Smithery MCP Package</Label>
                  <Input
                    value={smitheryMcps.join(', ')}
                    onChange={(e) => {
                      const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                      setSmitheryMcps(values);
                    }}
                    placeholder="@username/mcp-name, another/mcp"
                  />
                  <div className="text-xs text-muted-foreground">
                    Enter one or more package names separated by commas or select from the marketplace above
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Smithery API Key</Label>
                  <div className="flex items-center gap-2">
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
                    {checkingSmitheryKey && <Loader2 className="w-4 h-4 animate-spin" />}
                    {smitheryKeyValid === true && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                    {smitheryKeyValid === false && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    You can get your API key from <a href="https://smithery.ai/account/api-keys" target="_blank" className="text-primary hover:underline">smithery.ai/account/api-keys</a>
                  </div>
                </div>

                {/* Profile Management Section */}
                {smitheryKeyValid && (
                  <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/30">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Profile Management
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowProfiles(!showProfiles)}
                        className="text-xs"
                      >
                        {showProfiles ? 'Hide' : 'Manage'} Profiles
                      </Button>
                    </div>

                    {showProfiles && (
                      <div className="space-y-3">
                        {/* Profile Selection */}
                        <div className="space-y-2">
                          <Label>Select Profile</Label>
                          <div className="flex gap-2">
                            <select
                              value={selectedProfile}
                              onChange={(e) => setSelectedProfile(e.target.value)}
                              className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded-md"
                              disabled={loadingProfiles}
                            >
                              <option value="">No Profile (Default)</option>
                              {profiles.map(profile => (
                                <option key={profile.id} value={profile.id}>
                                  {profile.name} - {profile.defaults.model || 'No model'}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCreateProfile(true)}
                              className="text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              New
                            </Button>
                          </div>
                          {loadingProfiles && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Loading profiles...
                            </div>
                          )}
                        </div>

                        {/* Profile List */}
                        {profiles.length > 0 && (
                          <div className="space-y-2">
                            <Label>Your Profiles</Label>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {profiles.map(profile => (
                                <div
                                  key={profile.id}
                                  className={cn(
                                    "p-2 rounded border text-xs",
                                    selectedProfile === profile.id
                                      ? "border-primary bg-primary/10"
                                      : "border-gray-600 bg-gray-800/20"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-white truncate">{profile.name}</div>
                                      <div className="text-gray-400 truncate">{profile.description || 'No description'}</div>
                                      <div className="text-gray-500 mt-1">
                                        {profile.defaults.model || 'No model'} • {profile.schema_id}
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteProfile(profile.id)}
                                      className="p-1 h-auto text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Create Profile Modal */}
                        {showCreateProfile && (
                          <div className="space-y-3 p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">Create New Profile</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCreateProfile(false)}
                                className="p-1 h-auto"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs">Profile Name</Label>
                                <Input
                                  value={newProfile.name}
                                  onChange={(e) => setNewProfile(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="e.g., Friendly CS Agent"
                                  className="text-xs"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Description</Label>
                                <Input
                                  value={newProfile.description}
                                  onChange={(e) => setNewProfile(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Brief description of this profile"
                                  className="text-xs"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Schema</Label>
                                <select
                                  value={newProfile.schema_id}
                                  onChange={(e) => {
                                    const schema = e.target.value;
                                    setNewProfile(prev => ({
                                      ...prev,
                                      schema_id: schema,
                                      defaults: {
                                        ...prev.defaults,
                                        model: DEFAULT_MODELS[schema as keyof typeof DEFAULT_MODELS]?.[0] || 'gpt-4o-mini'
                                      }
                                    }));
                                  }}
                                  className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md"
                                >
                                  {DEFAULT_SCHEMAS.map(schema => (
                                    <option key={schema.id} value={schema.id}>{schema.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <Label className="text-xs">Model</Label>
                                <select
                                  value={newProfile.defaults.model}
                                  onChange={(e) => setNewProfile(prev => ({
                                    ...prev,
                                    defaults: { ...prev.defaults, model: e.target.value }
                                  }))}
                                  className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md"
                                >
                                  {(DEFAULT_MODELS[newProfile.schema_id as keyof typeof DEFAULT_MODELS] || []).map(model => (
                                    <option key={model} value={model}>{model}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <Label className="text-xs">System Prompt</Label>
                                <textarea
                                  value={newProfile.defaults.system_prompt}
                                  onChange={(e) => setNewProfile(prev => ({
                                    ...prev,
                                    defaults: { ...prev.defaults, system_prompt: e.target.value }
                                  }))}
                                  placeholder="Enter system prompt for this profile..."
                                  className="w-full h-16 px-2 py-1 text-xs bg-background border border-border rounded-md resize-none"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Temperature ({newProfile.defaults.temperature})</Label>
                                <input
                                  type="range"
                                  min="0"
                                  max="2"
                                  step="0.1"
                                  value={newProfile.defaults.temperature}
                                  onChange={(e) => setNewProfile(prev => ({
                                    ...prev,
                                    defaults: { ...prev.defaults, temperature: parseFloat(e.target.value) }
                                  }))}
                                  className="w-full"
                                />
                              </div>

                              <Button
                                type="button"
                                onClick={handleCreateProfile}
                                disabled={creatingProfile || !newProfile.name.trim()}
                                className="w-full text-xs"
                              >
                                {creatingProfile ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                    Creating...
                                  </>
                                ) : (
                                  'Create Profile'
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
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

          {/* API Key Status Indicator */}
          {(checkingApiKey || apiKeyStatus) && (
            <div className={cn(
              "p-3 rounded-lg border text-sm mb-3",
              checkingApiKey
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : apiKeyStatus?.valid
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
            )}>
              <div className="flex items-center gap-2">
                {checkingApiKey ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking OpenRouter API key...</span>
                  </>
                ) : apiKeyStatus?.valid ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>OpenRouter API key is valid</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>OpenRouter API key issue: {apiKeyStatus?.error}</span>
                  </>
                )}
              </div>
              {!checkingApiKey && !apiKeyStatus?.valid && (
                <div className="mt-2 text-xs">
                  <p>Please check your .env file and ensure VITE_OPENROUTER_API_KEY is set correctly.</p>
                  <p>You may need to restart the development server after updating the .env file.</p>
                </div>
              )}
            </div>
          )}

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
                    <li>Create and select profiles to customize agent behavior</li>
                    <li>Profiles include model, system prompt, and temperature settings</li>
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