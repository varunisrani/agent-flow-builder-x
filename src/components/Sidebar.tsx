import { useState } from 'react';
import { Bot, BrainCircuit, Code, WrenchIcon, ArrowRight, Network, Server, Plug, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils.js';

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
      "h-screen bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 backdrop-blur-xl border-r-[2px] border-black/5 dark:border-white/10 transition-all duration-300 flex flex-col shadow-xl",
      expanded ? "w-64" : "w-16"
    )}>
      {/* Header with gradient background */}
      <div className="p-4 border-b-[2px] border-black/5 dark:border-white/10 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-transparent dark:from-purple-400/5 dark:via-orange-200/5">
        <div className="flex items-center justify-between">
          {expanded ? (
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/30 dark:border-purple-400/30">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200">
                CogentX Builder
              </h2>
            </div>
          ) : (
            <div className="mx-auto p-1.5 rounded-lg bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/30 dark:border-purple-400/30">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          )}
          <button 
            onClick={onToggle} 
            className="p-1.5 rounded-lg bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 border border-black/5 dark:border-white/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 transition-all duration-300 group"
          >
            <ArrowRight className={cn(
              "w-3.5 h-3.5 transition-all duration-300 text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400", 
              !expanded && "rotate-180"
            )} />
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="flex border-b-[2px] border-black/5 dark:border-white/10 bg-gradient-to-r from-purple-500/2 via-pink-500/2 to-transparent dark:from-purple-400/2 dark:via-orange-200/2">
          <button 
            onClick={() => setActiveTab('nodes')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-all duration-300 relative",
              activeTab === 'nodes' 
                ? "text-purple-600 dark:text-purple-400" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            )}
          >
            Nodes
            {activeTab === 'nodes' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-orange-200"></div>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-all duration-300 relative",
              activeTab === 'templates' 
                ? "text-purple-600 dark:text-purple-400" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            )}
          >
            Templates
            {activeTab === 'templates' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-orange-200"></div>
            )}
          </button>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto scrollbar-none p-4">
        {expanded && activeTab === 'nodes' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-pink-500 dark:from-purple-400 dark:to-orange-200 rounded-full"></div>
              <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Drag to add
              </h3>
            </div>
            {nodeTypes.map((node) => (
              <div
                key={node.type}
                className="group p-3 rounded-xl bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-sm border-[2px] border-black/5 dark:border-white/10 cursor-grab hover:border-purple-500/30 dark:hover:border-purple-400/30 hover:from-zinc-300/20 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                draggable
                onDragStart={(event) => onDragStart(event, node.type)}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/20 dark:border-purple-400/20 group-hover:border-purple-500/40 dark:group-hover:border-purple-400/40 transition-all duration-300">
                    <div className="text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">
                      {node.icon}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                    {node.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {expanded && activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-pink-500 dark:from-purple-400 dark:to-orange-200 rounded-full"></div>
              <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Templates
              </h3>
            </div>
            {templates.map((template) => (
              <div
                key={template.id}
                className="group p-4 rounded-xl bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-sm border-[2px] border-black/5 dark:border-white/10 cursor-pointer hover:border-purple-500/30 dark:hover:border-purple-400/30 hover:from-zinc-300/20 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300 mb-1">
                  {template.name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {template.description}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!expanded && (
          <div className="flex flex-col items-center space-y-4 pt-2">
            {nodeTypes.map((node) => (
              <div
                key={node.type}
                className="group w-10 h-10 rounded-xl flex items-center justify-center cursor-grab bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 backdrop-blur-sm border-[2px] border-black/5 dark:border-white/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 hover:from-purple-500/20 hover:via-pink-500/20 hover:to-transparent dark:hover:from-purple-400/20 dark:hover:via-orange-200/20 transition-all duration-300 hover:scale-110"
                draggable
                onDragStart={(event) => onDragStart(event, node.type)}
              >
                <div className="text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">
                  {node.icon}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {expanded && (
        <div className="p-4 border-t-[2px] border-black/5 dark:border-white/10 bg-gradient-to-r from-purple-500/2 via-pink-500/2 to-transparent dark:from-purple-400/2 dark:via-orange-200/2">
          <span className="relative inline-block overflow-hidden rounded-xl p-[1px] w-full group">
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] group-hover:animate-[spin_1s_linear_infinite]" />
            <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-white dark:bg-gray-950 backdrop-blur-3xl">
              <button className="inline-flex rounded-xl text-center group items-center justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-0 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all duration-300 px-4 py-2.5 text-sm font-medium w-full hover:scale-105">
                <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                New Project
              </button>
            </div>
          </span>
        </div>
      )}
    </div>
  );
}
