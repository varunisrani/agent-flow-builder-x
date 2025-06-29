import React from 'react';
import { Node, Edge } from '@xyflow/react';
import { 
  Bot, 
  BarChart3, 
  ArrowRight,
  Sparkles,
  Clock,
  X,
  Code,
  Settings,
  Database,
  Activity,
  Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BaseNodeData } from '@/components/nodes/BaseNode';
import { MCPConfig } from '@/lib/codeGeneration';
import { CODE_TEMPLATES, CodeTemplateMetadata } from '@/lib/templateMetadata';
import { applyTemplateToFlow } from '@/lib/templateToNodes';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'creative' | 'technical' | 'customer-service' | 'analytics' | 'Code Templates';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  icon: React.ReactNode;
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
  mcpConfig?: MCPConfig[];
  tags: string[];
  isPopular?: boolean;
  isNew?: boolean;
  features?: string[];
}

// Convert code templates to regular template format
function convertCodeTemplateToTemplate(codeTemplate: CodeTemplateMetadata): Template {
  const iconMap: Record<string, React.ReactNode> = {
    'basic-agent': <Bot className="w-5 h-5" />,
    'mcp-agent': <Settings className="w-5 h-5" />,
    'langfuse-agent': <BarChart3 className="w-5 h-5" />,
    'memory-agent': <Database className="w-5 h-5" />,
    'event-handling-agent': <Activity className="w-5 h-5" />,
    'combined-agent': <Layers className="w-5 h-5" />
  };

  // Convert template nodes to ReactFlow nodes
  const { nodes, edges } = applyTemplateToFlow(codeTemplate);

  return {
    id: codeTemplate.id,
    name: codeTemplate.name,
    description: codeTemplate.description,
    category: codeTemplate.category,
    difficulty: codeTemplate.difficulty.toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
    estimatedTime: codeTemplate.estimatedTime,
    icon: iconMap[codeTemplate.id] || <Code className="w-5 h-5" />,
    nodes,
    edges,
    tags: codeTemplate.tags,
    isPopular: codeTemplate.isPopular,
    isNew: codeTemplate.isNew,
    features: codeTemplate.features
  };
}

// Use only CODE_TEMPLATES - no flowTemplates needed

// Use only CODE_TEMPLATES for first-time template library
const templates: Template[] = CODE_TEMPLATES.map(convertCodeTemplateToTemplate);

interface TemplateLibraryProps {
  onSelectTemplate: (nodes: Node<BaseNodeData>[], edges: Edge[], mcpConfig?: MCPConfig[]) => void;
  onClose: () => void;
}

export function TemplateLibrary({ onSelectTemplate, onClose }: TemplateLibraryProps) {
  // Simplified - no search or filtering needed for 6 CODE_TEMPLATES

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'advanced': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const handleSelectTemplate = (template: Template) => {
    onSelectTemplate(template.nodes, template.edges, template.mcpConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-6xl h-[80vh] bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent backdrop-blur-xl rounded-2xl border-[2px] border-white/10 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-400/20 via-orange-200/20 to-transparent border border-purple-400/30">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-orange-200">
                  Template Library
                </h2>
                <p className="text-gray-300 text-sm">
                  Choose a template to get started quickly
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-gray-300 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Simple Template Grid - All 6 CODE_TEMPLATES */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-white">Agent Templates</h3>
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-300 border-purple-500/30">
                ADK & MCP Ready
              </Badge>
            </div>
            <p className="text-gray-400 text-sm">
              Choose a template to get started with your AI agent. All templates generate production-ready Python code.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <TemplateCard 
                  key={template.id} 
                  template={template} 
                  onSelect={handleSelectTemplate}
                  getDifficultyColor={getDifficultyColor}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
  getDifficultyColor: (difficulty: string) => string;
}

function TemplateCard({ template, onSelect, getDifficultyColor }: TemplateCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="cursor-pointer h-full bg-gradient-to-br from-zinc-300/5 via-purple-400/5 to-transparent border border-white/10 hover:border-purple-400/30 transition-all duration-300 group"
        onClick={() => onSelect(template)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-400/20 via-orange-200/20 to-transparent border border-purple-400/30">
                {template.icon}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                  {template.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {template.isPopular && (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      Popular
                    </Badge>
                  )}
                  {template.isNew && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                      New
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-300" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
            {template.description}
          </p>
          
          {/* Code template features */}
          {template.features && template.features.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-purple-400">Features:</div>
              <div className="flex flex-wrap gap-1">
                {template.features.slice(0, 2).map((feature) => (
                  <Badge key={feature} variant="outline" className="text-xs bg-purple-500/10 text-purple-300 border-purple-500/30">
                    {feature}
                  </Badge>
                ))}
                {template.features.length > 2 && (
                  <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-300 border-purple-500/30">
                    +{template.features.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">{template.estimatedTime}</span>
            </div>
            <Badge className={`text-xs px-2 py-1 border ${getDifficultyColor(template.difficulty)}`}>
              {template.difficulty}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs bg-gray-800/50 text-gray-400 border-gray-600">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-xs bg-gray-800/50 text-gray-400 border-gray-600">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}