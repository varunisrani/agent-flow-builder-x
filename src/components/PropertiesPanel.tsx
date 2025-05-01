
import { useState } from 'react';
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
  const [nodeName, setNodeName] = useState(selectedNode?.data.label || '');
  const [nodeDescription, setNodeDescription] = useState(selectedNode?.data.description || '');
  
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
    
    return typeLabels[selectedNode.data.type];
  };
  
  const getTypeSpecificFields = () => {
    if (!selectedNode) return null;
    
    switch (selectedNode.data.type) {
      case 'model':
        return (
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground mb-1">
              Model Type
            </label>
            <select className="w-full bg-background rounded-md border border-border p-2 text-sm">
              <option value="gpt-4o">GPT-4o</option>
              <option value="claude-3">Claude 3</option>
              <option value="gemini">Gemini</option>
              <option value="llama">Llama 3</option>
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
              <option value="search">Web Search</option>
              <option value="calculator">Calculator</option>
              <option value="weather">Weather</option>
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
              System Prompt
            </label>
            <textarea
              rows={4}
              className="w-full bg-background rounded-md border border-border p-2 text-sm"
              placeholder="You are a helpful assistant that..."
            />
            
            <label className="block text-xs text-muted-foreground mb-1 mt-2">
              Agent Type
            </label>
            <select className="w-full bg-background rounded-md border border-border p-2 text-sm">
              <option value="chat">Chat Agent</option>
              <option value="reasoning">Reasoning Agent</option>
              <option value="specialized">Specialized Agent</option>
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
