
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
  
  // Update local state when the selected node changes
  useEffect(() => {
    if (selectedNode?.data) {
      setNodeName(selectedNode.data.label || '');
      setNodeDescription(selectedNode.data.description || '');
      setNodeInstruction(selectedNode.data.instruction || '');
      setModelType(selectedNode.data.modelType || '');
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
  
  const getPanelTitle = () => {
    if (!selectedNode) return 'Properties';
    
    const typeLabels = {
      agent: 'Agent Properties',
      model: 'Model Properties',
      tool: 'Tool Properties',
      function: 'Function Properties',
      input: 'Input Properties',
      output: 'Output Properties'
    };
    
    return selectedNode.data.type && typeLabels[selectedNode.data.type] 
      ? typeLabels[selectedNode.data.type] 
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
        
      case 'function':
        return (
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground mb-1">
              Function Code
            </label>
            <textarea
              rows={6}
              className="w-full bg-background rounded-md border border-border p-2 text-sm font-mono"
              placeholder="def my_function(input):\n  # Your code here\n  return result"
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
