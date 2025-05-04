import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Node } from '@xyflow/react';
import { BaseNodeData } from './nodes/BaseNode';
import { cn } from '@/lib/utils';

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
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground mb-1">
              Model Type
            </label>
            <select 
              className="w-full bg-background rounded-md border border-border p-2 text-sm"
              value={modelType}
              onChange={handleModelTypeChange}
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.0-pro">Gemini 2.0 Pro</option>
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="llama-3-70b">Llama 3 70B</option>
            </select>
            
            <label className="block text-xs text-muted-foreground mb-1 mt-2">
              Temperature
            </label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.1" 
              defaultValue="0.7"
              className="w-full" 
            />
          </div>
        );
        
      case 'tool':
        return (
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground mb-1">
              Tool Type
            </label>
            <select className="w-full bg-background rounded-md border border-border p-2 text-sm">
              <option value="google_search">Google Search</option>
              <option value="calculator">Calculator</option>
              <option value="weather_api">Weather API</option>
              <option value="custom">Custom</option>
            </select>
            
            <label className="block text-xs text-muted-foreground mb-1 mt-2">
              API Key (if needed)
            </label>
            <input 
              type="password"
              className="w-full bg-background rounded-md border border-border p-2 text-sm" 
              placeholder="Enter API key..."
            />
          </div>
        );
        
      case 'agent':
        return (
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground mb-1">
              System Instruction
            </label>
            <textarea
              rows={4}
              value={nodeInstruction}
              onChange={handleInstructionChange}
              className="w-full bg-background rounded-md border border-border p-2 text-sm"
              placeholder="You are a helpful assistant that..."
            />
            
            <label className="block text-xs text-muted-foreground mb-1 mt-2">
              Agent Type
            </label>
            <select className="w-full bg-background rounded-md border border-border p-2 text-sm">
              <option value="LlmAgent">LLM Agent</option>
              <option value="Agent">Standard Agent</option>
              <option value="MultiModalAgent">Multi-Modal Agent</option>
              <option value="ReActAgent">ReAct Agent</option>
            </select>
          </div>
        );
      
      case 'mcp-client':
        return (
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground mb-1">
              MCP Server URL
            </label>
            <input
              type="text"
              value={mcpUrl}
              onChange={handleMcpUrlChange}
              className="w-full bg-background rounded-md border border-border p-2 text-sm"
              placeholder="http://localhost:8080"
            />
            
            <div className="p-2 bg-blue-500/10 rounded mt-2 text-xs">
              <p className="font-medium text-blue-400">MCP Client Info</p>
              <p className="mt-1">This node will connect to an MCP server to use its tools.</p>
            </div>
          </div>
        );
        
      case 'mcp-server':
        return (
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground mb-1">
              Port (optional)
            </label>
            <input
              type="text"
              placeholder="8080"
              className="w-full bg-background rounded-md border border-border p-2 text-sm"
            />
            
            <div className="p-2 bg-blue-500/10 rounded mt-2 text-xs">
              <p className="font-medium text-blue-400">MCP Server Info</p>
              <p className="mt-1">This node will expose your agent tools to other systems via MCP.</p>
            </div>
          </div>
        );
        
      case 'mcp-tool':
        return (
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground mb-1">
              MCP Tool ID
            </label>
            <input
              type="text"
              value={mcpToolId}
              onChange={handleMcpToolIdChange}
              className="w-full bg-background rounded-md border border-border p-2 text-sm"
              placeholder="tool_name"
            />
            
            <div className="p-2 bg-amber-500/10 rounded mt-2 text-xs">
              <p className="font-medium text-amber-400">MCP Tool Info</p>
              <p className="mt-1">Connect this node to an MCP client to use it in your agent.</p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className={cn(
      "fixed top-0 right-0 h-screen w-80 glass border-l border-white/10 p-4 transition-transform duration-300 z-10",
      selectedNode ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium">{getPanelTitle()}</h2>
        <button 
          onClick={onClose}
          className="rounded-full p-1 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {selectedNode && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Name
            </label>
            <input 
              type="text"
              value={nodeName}
              onChange={handleNameChange}
              className="w-full bg-background rounded-md border border-border p-2 text-sm" 
            />
          </div>
          
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Description
            </label>
            <textarea 
              value={nodeDescription}
              onChange={handleDescriptionChange}
              className="w-full bg-background rounded-md border border-border p-2 text-sm"
              rows={3}
            />
          </div>
          
          {getTypeSpecificFields()}
        </div>
      )}
    </div>
  );
}
