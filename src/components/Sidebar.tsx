import { useState } from 'react';
import { Bot, BrainCircuit, Code, WrenchIcon, ArrowRight, Network, Server, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';

const nodeTypes = [
  { type: 'agent', label: 'Agent', icon: <Bot className="w-4 h-4" /> },
  { type: 'model', label: 'Model', icon: <BrainCircuit className="w-4 h-4" /> },
  { type: 'tool', label: 'Tool', icon: <WrenchIcon className="w-4 h-4" /> },
  { type: 'function', label: 'Function', icon: <Code className="w-4 h-4" /> },
  { type: 'mcp-client', label: 'MCP Client', icon: <Network className="w-4 h-4" /> },
  { type: 'mcp-server', label: 'MCP Server', icon: <Server className="w-4 h-4" /> },
  { type: 'mcp-tool', label: 'MCP Tool', icon: <Plug className="w-4 h-4" /> },
];

const templates = [
  { id: 'llm-agent', name: 'LLM Agent', description: 'Simple LLM-based agent with Google Search' },
  { id: 'weather-agent', name: 'Weather Agent', description: 'Agent with weather and time tools' },
  { id: 'multimodal', name: 'Multi-Modal Agent', description: 'Agent that can process images and text' },
];

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'nodes' | 'templates'>('nodes');
  
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };
  
  return (
    <div className={cn(
      "h-screen glass border-r border-white/10 transition-all duration-300 flex flex-col",
      expanded ? "w-64" : "w-16"
    )}>
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        {expanded ? (
          <h2 className="text-lg font-medium text-gradient">Google ADK Builder</h2>
        ) : (
          <span className="text-lg mx-auto text-gradient">ADK</span>
        )}
        <button 
          onClick={onToggle} 
          className="rounded-full p-1 hover:bg-white/10 transition-colors"
        >
          <ArrowRight className={cn(
            "w-4 h-4 transition-transform", 
            !expanded && "rotate-180"
          )} />
        </button>
      </div>
      
      {expanded && (
        <div className="flex border-b border-white/10">
          <button 
            onClick={() => setActiveTab('nodes')}
            className={cn(
              "flex-1 py-2 text-sm font-medium transition-colors",
              activeTab === 'nodes' 
                ? "border-b-2 border-primary text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Nodes
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={cn(
              "flex-1 py-2 text-sm font-medium transition-colors",
              activeTab === 'templates' 
                ? "border-b-2 border-primary text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Templates
          </button>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto scrollbar-none p-4">
        {expanded && activeTab === 'nodes' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drag to add</h3>
            {nodeTypes.map((node) => (
              <div
                key={node.type}
                className="glass-card p-3 cursor-grab hover:border-primary/50 transition-colors"
                draggable
                onDragStart={(event) => onDragStart(event, node.type)}
              >
                <div className="flex items-center space-x-2">
                  <div className="text-primary">{node.icon}</div>
                  <div className="text-sm font-medium">{node.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {expanded && activeTab === 'templates' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Templates</h3>
            {templates.map((template) => (
              <div
                key={template.id}
                className="glass-card p-3 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <div className="text-sm font-medium">{template.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
              </div>
            ))}
          </div>
        )}
        
        {!expanded && (
          <div className="flex flex-col items-center space-y-4 pt-2">
            {nodeTypes.map((node) => (
              <div
                key={node.type}
                className="w-8 h-8 rounded-md flex items-center justify-center cursor-grab bg-white/5 hover:bg-white/10 transition-colors"
                draggable
                onDragStart={(event) => onDragStart(event, node.type)}
              >
                <div className="text-primary">{node.icon}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {expanded && (
        <div className="p-4 border-t border-white/10">
          <button className="w-full py-1 px-3 bg-primary/20 hover:bg-primary/30 text-primary-foreground rounded-md text-sm transition-colors">
            New Project
          </button>
        </div>
      )}
    </div>
  );
}
