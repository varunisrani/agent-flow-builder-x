import { useState, useEffect } from 'react';
import { X, Sparkles, ChevronDown, ChevronRight, Info, HelpCircle, Settings, Layers, Zap } from 'lucide-react';
import { Node } from '@xyflow/react';
import { BaseNodeData } from './nodes/BaseNode.js';
import { cn } from '@/lib/utils.js';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.js';
import { Button } from '@/components/ui/button.js';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.js';
import { Badge } from '@/components/ui/badge.js';

interface PropertiesPanelProps {
  selectedNode: Node<BaseNodeData> | null;
  onClose: () => void;
  onUpdateNode: (id: string, data: Partial<BaseNodeData>) => void;
}

export function PropertiesPanel({ selectedNode, onClose, onUpdateNode }: PropertiesPanelProps) {
  const [nodeName, setNodeName] = useState('');
  const [nodeDescription, setNodeDescription] = useState('');
  const [nodeInstruction, setNodeInstruction] = useState('');
  const [modelType, setModelType] = useState('');
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpToolId, setMcpToolId] = useState('');
  
  // Collapsible section states
  const [basicSectionOpen, setBasicSectionOpen] = useState(true);
  const [advancedSectionOpen, setAdvancedSectionOpen] = useState(false);
  const [integrationSectionOpen, setIntegrationSectionOpen] = useState(false);
  const [showAdvancedMode, setShowAdvancedMode] = useState(false);
  
  // Update local state when the selected node changes
  useEffect(() => {
    if (selectedNode?.data) {
      setNodeName(selectedNode.data.label || '');
      setNodeDescription(selectedNode.data.description || '');
      setNodeInstruction(selectedNode.data.instruction || '');
      setModelType(selectedNode.data.modelType || '');
      setMcpUrl(selectedNode.data.mcpUrl || '');
      setMcpToolId(selectedNode.data.mcpToolId || '');
    }
  }, [selectedNode]);
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNodeName(e.target.value);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, { label: e.target.value });
    }
  };
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNodeDescription(e.target.value);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, { description: e.target.value });
    }
  };
  
  const handleInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNodeInstruction(e.target.value);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, { instruction: e.target.value });
    }
  };
  
  const handleModelTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModelType(e.target.value);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, { modelType: e.target.value });
    }
  };
  
  const handleMcpUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMcpUrl(e.target.value);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, { mcpUrl: e.target.value });
    }
  };
  
  const handleMcpToolIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMcpToolId(e.target.value);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, { mcpToolId: e.target.value });
    }
  };
  
  const getPanelTitle = () => {
    if (!selectedNode) return 'Properties';
    
    const typeLabels = {
      agent: 'Agent Properties',
      model: 'Model Properties',
      tool: 'Tool Properties',
      input: 'Input Properties',
      output: 'Output Properties',
      'mcp-client': 'MCP Client Properties',
      'mcp-server': 'MCP Server Properties',
      'mcp-tool': 'MCP Tool Properties'
    };
    
    return selectedNode.data.type && typeLabels[selectedNode.data.type as keyof typeof typeLabels] 
      ? typeLabels[selectedNode.data.type as keyof typeof typeLabels] 
      : 'Properties';
  };
  
  const hasAdvancedConfig = () => {
    if (!selectedNode?.data.type) return false;
    return ['agent', 'model', 'tool', 'mcp-client', 'mcp-server', 'mcp-tool'].includes(selectedNode.data.type);
  };

  const hasIntegrationConfig = () => {
    if (!selectedNode?.data.type) return false;
    return ['mcp-client', 'mcp-server', 'mcp-tool'].includes(selectedNode.data.type);
  };

  const getConfigurationHint = () => {
    if (!selectedNode?.data.type) return '';
    
    const hints = {
      agent: 'Configure how your AI agent behaves and responds to users',
      model: 'Set model parameters for optimal performance',
      tool: 'Define tool capabilities and external integrations',
      input: 'Customize how data enters your workflow',
      output: 'Define how results are formatted and delivered',
      'mcp-client': 'Connect to external MCP servers for additional capabilities',
      'mcp-server': 'Expose your agent tools to other systems',
      'mcp-tool': 'Configure specific MCP tool functionality'
    };
    
    return hints[selectedNode.data.type as keyof typeof hints] || '';
  };

  const getTypeSpecificFields = () => {
    if (!selectedNode || !selectedNode.data) return null;
    
    switch (selectedNode.data.type) {
      case 'model':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-gray-300 mb-2">
                Model Type
              </label>
              <select 
                className="w-full bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent from-zinc-300/5 via-gray-400/5 backdrop-blur-sm rounded-xl border-[2px] border-white/10 p-3 text-sm text-gray-900 text-white focus:border-purple-500/50 focus:border-purple-400/50 focus:ring-0 transition-all duration-300 hover:border-purple-500/30 hover:border-purple-400/30"
                value={modelType}
                onChange={handleModelTypeChange}
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-2.0-pro">Gemini 2.0 Pro</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="llama-3-70b">Llama 3 70B</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 text-gray-300 mb-2">
                Temperature
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                defaultValue="0.7"
                className="w-full h-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg appearance-none slider-thumb" 
              />
              <div className="flex justify-between text-xs text-gray-600 text-gray-400 mt-1">
                <span>0</span>
                <span>1</span>
              </div>
            </div>
          </div>
        );
        
      case 'tool':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-gray-300 mb-2">
                Tool Type
              </label>
              <select className="w-full bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent from-zinc-300/5 via-gray-400/5 backdrop-blur-sm rounded-xl border-[2px] border-white/10 p-3 text-sm text-gray-900 text-white focus:border-purple-500/50 focus:border-purple-400/50 focus:ring-0 transition-all duration-300 hover:border-purple-500/30 hover:border-purple-400/30">
                <option value="google_search">Google Search</option>
                <option value="calculator">Calculator</option>
                <option value="weather_api">Weather API</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 text-gray-300 mb-2">
                API Key (if needed)
              </label>
              <input 
                type="password"
                className="w-full bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent from-zinc-300/5 via-gray-400/5 backdrop-blur-sm rounded-xl border-[2px] border-white/10 p-3 text-sm text-gray-900 text-white placeholder-gray-500 placeholder-gray-400 focus:border-purple-500/50 focus:border-purple-400/50 focus:ring-0 transition-all duration-300 hover:border-purple-500/30 hover:border-purple-400/30" 
                placeholder="Enter API key..."
              />
            </div>
          </div>
        );
        
      case 'agent':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-gray-300 mb-2">
                System Instruction
              </label>
              <textarea
                rows={4}
                value={nodeInstruction}
                onChange={handleInstructionChange}
                className="w-full bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent from-zinc-300/5 via-gray-400/5 backdrop-blur-sm rounded-xl border-[2px] border-white/10 p-3 text-sm text-gray-900 text-white placeholder-gray-500 placeholder-gray-400 focus:border-purple-500/50 focus:border-purple-400/50 focus:ring-0 transition-all duration-300 hover:border-purple-500/30 hover:border-purple-400/30 resize-none"
                placeholder="You are a helpful assistant that..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 text-gray-300 mb-2">
                Agent Type
              </label>
              <select className="w-full bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent from-zinc-300/5 via-gray-400/5 backdrop-blur-sm rounded-xl border-[2px] border-white/10 p-3 text-sm text-gray-900 text-white focus:border-purple-500/50 focus:border-purple-400/50 focus:ring-0 transition-all duration-300 hover:border-purple-500/30 hover:border-purple-400/30">
                <option value="LlmAgent">LLM Agent</option>
                <option value="Agent">Standard Agent</option>
                <option value="MultiModalAgent">Multi-Modal Agent</option>
                <option value="ReActAgent">ReAct Agent</option>
              </select>
            </div>
          </div>
        );
      
      case 'mcp-client':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-gray-300 mb-2">
                MCP Server URL
              </label>
              <input
                type="text"
                value={mcpUrl}
                onChange={handleMcpUrlChange}
                className="w-full bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent from-zinc-300/5 via-gray-400/5 backdrop-blur-sm rounded-xl border-[2px] border-white/10 p-3 text-sm text-gray-900 text-white placeholder-gray-500 placeholder-gray-400 focus:border-purple-500/50 focus:border-purple-400/50 focus:ring-0 transition-all duration-300 hover:border-purple-500/30 hover:border-purple-400/30"
                placeholder="http://localhost:8080"
              />
            </div>
            
            <div className="p-4 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent from-blue-400/10 via-purple-400/10 backdrop-blur-sm rounded-xl border-[2px] border-blue-500/20 border-blue-400/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-600 text-blue-400" />
                <p className="font-medium text-blue-700 text-blue-300 text-sm">MCP Client Info</p>
              </div>
              <p className="text-blue-600 text-blue-300 text-xs leading-relaxed">This node will connect to an MCP server to use its tools.</p>
            </div>
          </div>
        );
        
      case 'mcp-server':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-gray-300 mb-2">
                Port (optional)
              </label>
              <input
                type="text"
                placeholder="8080"
                className="w-full bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent from-zinc-300/5 via-gray-400/5 backdrop-blur-sm rounded-xl border-[2px] border-white/10 p-3 text-sm text-gray-900 text-white placeholder-gray-500 placeholder-gray-400 focus:border-purple-500/50 focus:border-purple-400/50 focus:ring-0 transition-all duration-300 hover:border-purple-500/30 hover:border-purple-400/30"
              />
            </div>
            
            <div className="p-4 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent from-blue-400/10 via-purple-400/10 backdrop-blur-sm rounded-xl border-[2px] border-blue-500/20 border-blue-400/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-600 text-blue-400" />
                <p className="font-medium text-blue-700 text-blue-300 text-sm">MCP Server Info</p>
              </div>
              <p className="text-blue-600 text-blue-300 text-xs leading-relaxed">This node will expose your agent tools to other systems via MCP.</p>
            </div>
          </div>
        );
        
      case 'mcp-tool':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-gray-300 mb-2">
                MCP Tool ID
              </label>
              <input
                type="text"
                value={mcpToolId}
                onChange={handleMcpToolIdChange}
                className="w-full bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent from-zinc-300/5 via-gray-400/5 backdrop-blur-sm rounded-xl border-[2px] border-white/10 p-3 text-sm text-gray-900 text-white placeholder-gray-500 placeholder-gray-400 focus:border-purple-500/50 focus:border-purple-400/50 focus:ring-0 transition-all duration-300 hover:border-purple-500/30 hover:border-purple-400/30"
                placeholder="tool_name"
              />
            </div>
            
            <div className="p-4 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-transparent from-amber-400/10 via-orange-400/10 backdrop-blur-sm rounded-xl border-[2px] border-amber-500/20 border-amber-400/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-600 text-amber-400" />
                <p className="font-medium text-amber-700 text-amber-300 text-sm">MCP Tool Info</p>
              </div>
              <p className="text-amber-600 text-amber-300 text-xs leading-relaxed">Connect this node to an MCP client to use it in your agent.</p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <TooltipProvider>
      <div className={cn(
        "fixed top-0 right-0 h-screen w-80 bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent backdrop-blur-xl border-l-[2px] border-white/10 transition-transform duration-300 z-10 shadow-2xl",
        selectedNode ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Enhanced Header */}
        <div className="p-4 border-b-[2px] border-white/10 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-transparent">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-400/20 via-orange-200/20 to-transparent border border-purple-400/30">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-orange-200">
                  {getPanelTitle()}
                </h2>
                {selectedNode && (
                  <p className="text-xs text-gray-400 mt-1">
                    {getConfigurationHint()}
                  </p>
                )}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent border-[2px] border-white/10 hover:border-purple-400/30 transition-all duration-300 group"
            >
              <X className="w-4 h-4 text-gray-300 group-hover:text-purple-400 transition-colors duration-300" />
            </button>
          </div>

          {/* Mode Toggle */}
          {selectedNode && hasAdvancedConfig() && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-gradient-to-r from-gray-500/10 to-transparent rounded-lg border border-white/5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedMode(!showAdvancedMode)}
                className="text-xs h-6 px-2 text-gray-300 hover:text-white"
              >
                <Settings className="w-3 h-3 mr-1" />
                {showAdvancedMode ? 'Simple Mode' : 'Advanced Mode'}
              </Button>
              {showAdvancedMode && (
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-xs">
                  Expert
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {/* Scrollable content area with progressive disclosure */}
        <div className="flex-1 overflow-y-auto">
          {selectedNode && (
            <div className="space-y-1">
              {/* Basic Properties Section */}
              <Collapsible open={basicSectionOpen} onOpenChange={setBasicSectionOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto text-left hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span className="font-medium text-white">Basic Properties</span>
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs ml-2">
                        Required
                      </Badge>
                    </div>
                    {basicSectionOpen ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Name
                        </label>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-3 h-3 text-gray-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">A descriptive name for this component</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <input 
                        type="text"
                        value={nodeName}
                        onChange={handleNameChange}
                        className="w-full bg-gradient-to-tr from-zinc-300/5 via-gray-400/5 to-transparent backdrop-blur-sm rounded-lg border border-white/10 p-3 text-sm text-white placeholder-gray-400 focus:border-purple-400/50 focus:ring-0 transition-all duration-300" 
                        placeholder="Enter a descriptive name..."
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Description
                        </label>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-3 h-3 text-gray-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Explain what this component does</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <textarea 
                        value={nodeDescription}
                        onChange={handleDescriptionChange}
                        className="w-full bg-gradient-to-tr from-zinc-300/5 via-gray-400/5 to-transparent backdrop-blur-sm rounded-lg border border-white/10 p-3 text-sm text-white placeholder-gray-400 focus:border-purple-400/50 focus:ring-0 transition-all duration-300 resize-none"
                        rows={3}
                        placeholder="Describe what this component does..."
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Advanced Configuration Section */}
              {(showAdvancedMode || hasAdvancedConfig()) && (
                <Collapsible open={advancedSectionOpen} onOpenChange={setAdvancedSectionOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto text-left hover:bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-purple-400" />
                        <span className="font-medium text-white">Advanced Configuration</span>
                        {!showAdvancedMode && (
                          <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs ml-2">
                            Optional
                          </Badge>
                        )}
                      </div>
                      {advancedSectionOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    {getTypeSpecificFields()}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Integration Settings Section */}
              {hasIntegrationConfig() && (
                <Collapsible open={integrationSectionOpen} onOpenChange={setIntegrationSectionOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto text-left hover:bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="font-medium text-white">Integration Settings</span>
                        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs ml-2">
                          MCP
                        </Badge>
                      </div>
                      {integrationSectionOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    {selectedNode?.data.type?.includes('mcp') && getTypeSpecificFields()}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Help & Tips Section */}
              <div className="p-4 m-4 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent border border-blue-400/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">Configuration Tips</span>
                </div>
                <p className="text-xs text-blue-300/80 leading-relaxed">
                  {selectedNode?.data.type === 'agent' && 'Be specific in your instructions. Clear instructions lead to better agent behavior.'}
                  {selectedNode?.data.type === 'model' && 'Higher temperature values make responses more creative, lower values more focused.'}
                  {selectedNode?.data.type === 'tool' && 'Make sure to configure API keys for external tools to work properly.'}
                  {selectedNode?.data.type?.includes('mcp') && 'MCP allows your agent to use external tools and services seamlessly.'}
                  {!selectedNode?.data.type?.match(/agent|model|tool|mcp/) && 'Configure this component based on your workflow needs.'}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer gradient */}
        <div className="h-2 bg-gradient-to-t from-purple-500/5 via-pink-500/5 to-transparent"></div>
      </div>
    </TooltipProvider>
  );
}
