import { useState } from 'react';
import { Bot, BrainCircuit, Code, WrenchIcon, ArrowRight, Network, Server, Plug, Sparkles, BarChart3, Database, Zap } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const nodeCategories = {
  core: [
    { type: 'agent', label: 'AI Agent', description: 'The main AI brain of your workflow', icon: <Bot className="w-4 h-4" /> },
    { type: 'model', label: 'AI Model', description: 'Choose which AI model to use', icon: <BrainCircuit className="w-4 h-4" /> },
    { type: 'tool', label: 'Tool', description: 'Add capabilities like search or APIs', icon: <WrenchIcon className="w-4 h-4" /> },
  ],
  integrations: [
    { type: 'langfuse', label: 'Analytics', description: 'Track and analyze agent performance', icon: <BarChart3 className="w-4 h-4" /> },
    { type: 'memory', label: 'Memory', description: 'Remember conversations and context', icon: <Database className="w-4 h-4" /> },
    { type: 'event-handling', label: 'Event Tracking', description: 'Monitor and log agent events', icon: <Zap className="w-4 h-4" /> },
  ],
  advanced: [
    { type: 'mcp-client', label: 'MCP Client', description: 'Connect to external services', icon: <Network className="w-4 h-4" /> },
    { type: 'mcp-server', label: 'MCP Server', description: 'Host external connections', icon: <Server className="w-4 h-4" /> },
    { type: 'mcp-tool', label: 'MCP Tool', description: 'Advanced external tool integration', icon: <Plug className="w-4 h-4" /> },
    { type: 'function', label: 'Custom Logic', description: 'Add custom programming logic', icon: <Code className="w-4 h-4" /> },
  ]
};

const templates = [
  { id: 'llm-agent', name: '🔍 Basic Search Agent', description: 'Simple AI agent that can search the web and answer questions', difficulty: 'Beginner' },
  { id: 'analytics-agent', name: '📊 Smart Analytics Agent', description: 'AI agent with built-in performance tracking and analytics', difficulty: 'Beginner' },
  { id: 'memory-agent', name: '🧠 Learning Agent', description: 'AI agent that remembers conversations and learns from interactions', difficulty: 'Intermediate' },
  { id: 'full-stack-agent', name: '🚀 Complete Agent', description: 'Full-featured agent with memory, analytics, and event tracking', difficulty: 'Intermediate' },
  { id: 'customer-service', name: '💬 Support Agent', description: 'Customer service agent with conversation memory and analytics', difficulty: 'Intermediate' },
  { id: 'data-analyst', name: '📈 Enterprise Agent', description: 'Advanced agent with MCP tools, memory, and comprehensive monitoring', difficulty: 'Advanced' },
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
      "sidebar h-screen bg-gradient-to-br from-zinc-300/5 via-purple-400/10 backdrop-blur-xl border-r-[2px] border-white/10 transition-all duration-300 flex flex-col shadow-xl",
      expanded ? "w-64" : "w-16"
    )}>
      {/* Header with gradient background */}
      <div className="p-4 border-b-[2px] border-white/10 bg-gradient-to-r from-purple-400/5 via-orange-200/5">
        <div className="flex items-center justify-between">
          {expanded ? (
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-400/20 via-orange-200/20 border border-purple-400/30">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-orange-200">
                CogentX Builder
              </h2>
            </div>
          ) : (
            <div className="mx-auto p-1.5 rounded-lg bg-gradient-to-tr from-purple-400/20 via-orange-200/20 border border-purple-400/30">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
          )}
          <button 
            onClick={onToggle} 
            className="p-1.5 rounded-lg bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 border border-white/10 hover:border-purple-400/30 transition-all duration-300 group"
          >
            <ArrowRight className={cn(
              "w-3.5 h-3.5 transition-all duration-300 text-gray-300 group-hover:text-purple-400", 
              !expanded && "rotate-180"
            )} />
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="flex border-b-[2px] border-white/10 bg-gradient-to-r from-purple-400/2 via-orange-200/2">
          <button 
            onClick={() => setActiveTab('nodes')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-all duration-300 relative",
              activeTab === 'nodes' 
                ? "text-purple-400" 
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            Nodes
            {activeTab === 'nodes' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 to-orange-200"></div>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-all duration-300 relative",
              activeTab === 'templates' 
                ? "text-purple-400" 
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            Templates
            {activeTab === 'templates' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 to-orange-200"></div>
            )}
          </button>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto scrollbar-none p-4 pb-20">
        {expanded && activeTab === 'nodes' && (
          <div className="space-y-6">
            {/* Core Components */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-orange-200 rounded-full"></div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Essential Components
                </h3>
              </div>
              <div className="space-y-3">
                {nodeCategories.core.map((node) => (
                  <div
                    key={node.type}
                    className="group p-3 rounded-xl bg-gradient-to-tr from-zinc-300/5 via-gray-400/5 backdrop-blur-sm border-[2px] border-white/10 cursor-grab hover:border-purple-400/30 hover:from-zinc-300/10 hover:via-purple-400/10 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    draggable
                    onDragStart={(event) => onDragStart(event, node.type)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-400/20 via-orange-200/20 border border-purple-400/20 group-hover:border-purple-400/40 transition-all duration-300 flex-shrink-0">
                        <div className="text-purple-400 group-hover:scale-110 transition-transform duration-300">
                          {node.icon}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 group-hover:text-purple-400 transition-colors duration-300">
                          {node.label}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                          {node.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Integration Components */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-violet-400 to-pink-300 rounded-full"></div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Smart Integrations
                </h3>
              </div>
              <div className="space-y-3">
                {nodeCategories.integrations.map((node) => (
                  <div
                    key={node.type}
                    className="group p-3 rounded-xl bg-gradient-to-tr from-zinc-300/5 via-gray-400/5 backdrop-blur-sm border-[2px] border-white/10 cursor-grab hover:border-violet-400/30 hover:from-zinc-300/10 hover:via-violet-400/10 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    draggable
                    onDragStart={(event) => onDragStart(event, node.type)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-1.5 rounded-lg bg-gradient-to-tr from-violet-400/20 via-pink-300/20 border border-violet-400/20 group-hover:border-violet-400/40 transition-all duration-300 flex-shrink-0">
                        <div className="text-violet-400 group-hover:scale-110 transition-transform duration-300">
                          {node.icon}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 group-hover:text-violet-400 transition-colors duration-300">
                          {node.label}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                          {node.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced Components */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-400 to-cyan-300 rounded-full"></div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Advanced Components
                </h3>
              </div>
              <div className="space-y-3">
                {nodeCategories.advanced.map((node) => (
                  <div
                    key={node.type}
                    className="group p-3 rounded-xl bg-gradient-to-tr from-zinc-300/5 via-gray-400/5 backdrop-blur-sm border-[2px] border-white/10 cursor-grab hover:border-blue-400/30 hover:from-zinc-300/10 hover:via-blue-400/10 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    draggable
                    onDragStart={(event) => onDragStart(event, node.type)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-400/20 via-cyan-300/20 border border-blue-400/20 group-hover:border-blue-400/40 transition-all duration-300 flex-shrink-0">
                        <div className="text-blue-400 group-hover:scale-110 transition-transform duration-300">
                          {node.icon}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 group-hover:text-blue-400 transition-colors duration-300">
                          {node.label}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                          {node.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {expanded && activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-orange-200 rounded-full"></div>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Ready-to-Use Templates
              </h3>
            </div>
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="group p-4 rounded-xl bg-gradient-to-tr from-zinc-300/5 via-gray-400/5 backdrop-blur-sm border-[2px] border-white/10 cursor-pointer hover:border-purple-400/30 hover:from-zinc-300/10 hover:via-purple-400/10 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-medium text-gray-200 group-hover:text-purple-400 transition-colors duration-300">
                      {template.name}
                    </div>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                      template.difficulty === 'Beginner' && "bg-green-900/30 text-green-300",
                      template.difficulty === 'Intermediate' && "bg-yellow-900/30 text-yellow-300",
                      template.difficulty === 'Advanced' && "bg-red-900/30 text-red-300"
                    )}>
                      {template.difficulty}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    {template.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!expanded && (
          <div className="flex flex-col items-center space-y-4 pt-2">
            {[...nodeCategories.core, ...nodeCategories.integrations, ...nodeCategories.advanced].map((node) => (
              <div
                key={node.type}
                className="group w-10 h-10 rounded-xl flex items-center justify-center cursor-grab bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 backdrop-blur-sm border-[2px] border-white/10 hover:border-purple-400/30 hover:from-purple-400/20 hover:via-orange-200/20 transition-all duration-300 hover:scale-110"
                draggable
                onDragStart={(event) => onDragStart(event, node.type)}
              >
                <div className="text-purple-400 group-hover:scale-110 transition-transform duration-300">
                  {node.icon}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {expanded && (
        <div className="p-4 border-t-[2px] border-white/10 bg-gradient-to-r from-purple-400/2 via-orange-200/2">
          <span className="relative inline-block overflow-hidden rounded-xl p-[1px] w-full group">
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] group-hover:animate-[spin_1s_linear_infinite]" />
            <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-gray-950 backdrop-blur-3xl">
              <button className="inline-flex rounded-xl text-center group items-center justify-center bg-gradient-to-tr from-zinc-300/5 via-purple-400/20 text-white border-0 hover:bg-gradient-to-tr hover:from-zinc-300/10 hover:via-purple-400/30 transition-all duration-300 px-4 py-2.5 text-sm font-medium w-full hover:scale-105">
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
