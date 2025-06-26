import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Node } from '@xyflow/react';
import { BaseNodeData } from './nodes/BaseNode.js';
import { cn } from '@/lib/utils.js';

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
    <div className={cn(
      "fixed top-0 right-0 h-screen w-80 bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent from-zinc-300/5 via-purple-400/10 backdrop-blur-xl border-l-[2px] border-white/10 transition-transform duration-300 z-10 shadow-2xl",
      selectedNode ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header with gradient background */}
      <div className="p-6 border-b-[2px] border-white/10 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-transparent from-purple-400/5 via-orange-200/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent from-purple-400/20 via-orange-200/20 border border-purple-500/30 border-purple-400/30">
              <Sparkles className="w-4 h-4 text-purple-600 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 from-purple-300 to-orange-200">
              {getPanelTitle()}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent from-zinc-300/10 via-gray-400/10 border-[2px] border-white/10 hover:border-purple-500/30 hover:border-purple-400/30 transition-all duration-300 group"
          >
            <X className="w-4 h-4 text-gray-700 text-gray-300 group-hover:text-purple-600 group-hover:text-purple-400 transition-colors duration-300" />
          </button>
        </div>
      </div>
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedNode && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-gray-300 mb-2">
                Name
              </label>
              <input 
                type="text"
                value={nodeName}
                onChange={handleNameChange}
                className="w-full bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent from-zinc-300/5 via-gray-400/5 backdrop-blur-sm rounded-xl border-[2px] border-white/10 p-3 text-sm text-gray-900 text-white placeholder-gray-500 placeholder-gray-400 focus:border-purple-500/50 focus:border-purple-400/50 focus:ring-0 transition-all duration-300 hover:border-purple-500/30 hover:border-purple-400/30" 
                placeholder="Node name..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 text-gray-300 mb-2">
                Description
              </label>
              <textarea 
                value={nodeDescription}
                onChange={handleDescriptionChange}
                className="w-full bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent from-zinc-300/5 via-gray-400/5 backdrop-blur-sm rounded-xl border-[2px] border-white/10 p-3 text-sm text-gray-900 text-white placeholder-gray-500 placeholder-gray-400 focus:border-purple-500/50 focus:border-purple-400/50 focus:ring-0 transition-all duration-300 hover:border-purple-500/30 hover:border-purple-400/30 resize-none"
                rows={3}
                placeholder="Describe this node..."
              />
            </div>
            
            {getTypeSpecificFields()}
          </div>
        )}
      </div>
      
      {/* Footer gradient */}
      <div className="h-4 bg-gradient-to-t from-purple-500/5 via-pink-500/5 to-transparent from-purple-400/5 via-orange-200/5"></div>
    </div>
  );
}
