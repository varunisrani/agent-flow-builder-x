import React, { useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { 
  Bot, 
  MessageSquare, 
  Search, 
  Briefcase, 
  ShoppingCart, 
  Users, 
  FileText, 
  BarChart3, 
  Headphones,
  BookOpen,
  Camera,
  Mail,
  ArrowRight,
  Sparkles,
  Star,
  Clock,
  Zap,
  Filter,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BaseNodeData } from '@/components/nodes/BaseNode';
import { MCPConfig } from '@/lib/codeGeneration';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'creative' | 'technical' | 'customer-service' | 'analytics';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  icon: React.ReactNode;
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
  mcpConfig?: MCPConfig[];
  tags: string[];
  isPopular?: boolean;
  isNew?: boolean;
}

const templates: Template[] = [
  {
    id: 'customer-support',
    name: 'Customer Support Agent',
    description: 'Intelligent customer service agent that can handle inquiries, escalate issues, and provide helpful responses.',
    category: 'customer-service',
    difficulty: 'beginner',
    estimatedTime: '5 min',
    icon: <Headphones className="w-5 h-5" />,
    isPopular: true,
    tags: ['support', 'chat', 'automation'],
    nodes: [
      {
        id: 'input-1',
        type: 'baseNode',
        position: { x: 100, y: 200 },
        data: {
          id: 'input-1',
          type: 'input',
          label: 'Customer Query',
          description: 'Customer support inquiry input'
        }
      },
      {
        id: 'agent-1',
        type: 'baseNode',
        position: { x: 350, y: 200 },
        data: {
          id: 'agent-1',
          type: 'agent',
          label: 'Support Agent',
          description: 'AI agent for customer support',
          instruction: 'You are a helpful customer support agent. Respond professionally and helpfully to customer inquiries. If you cannot resolve an issue, escalate it appropriately.'
        }
      },
      {
        id: 'tool-1',
        type: 'baseNode',
        position: { x: 350, y: 350 },
        data: {
          id: 'tool-1',
          type: 'tool',
          label: 'Knowledge Base',
          description: 'Search company knowledge base'
        }
      },
      {
        id: 'output-1',
        type: 'baseNode',
        position: { x: 600, y: 200 },
        data: {
          id: 'output-1',
          type: 'output',
          label: 'Support Response',
          description: 'Generated customer support response'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'input-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'tool-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e3', source: 'agent-1', target: 'output-1', type: 'smoothstep' }
    ]
  },
  {
    id: 'content-writer',
    name: 'Content Writer Agent',
    description: 'Creative writing assistant for blogs, articles, and marketing content with research capabilities.',
    category: 'creative',
    difficulty: 'beginner',
    estimatedTime: '7 min',
    icon: <FileText className="w-5 h-5" />,
    isNew: true,
    tags: ['content', 'writing', 'marketing'],
    nodes: [
      {
        id: 'input-1',
        type: 'baseNode',
        position: { x: 100, y: 150 },
        data: {
          id: 'input-1',
          type: 'input',
          label: 'Content Brief',
          description: 'Topic and requirements for content'
        }
      },
      {
        id: 'tool-1',
        type: 'baseNode',
        position: { x: 300, y: 80 },
        data: {
          id: 'tool-1',
          type: 'tool',
          label: 'Research Tool',
          description: 'Web research for content'
        }
      },
      {
        id: 'agent-1',
        type: 'baseNode',
        position: { x: 350, y: 200 },
        data: {
          id: 'agent-1',
          type: 'agent',
          label: 'Content Writer',
          description: 'AI content writing agent',
          instruction: 'You are a skilled content writer. Create engaging, well-researched content based on the provided brief. Use research data to enhance your writing with facts and insights.'
        }
      },
      {
        id: 'tool-2',
        type: 'baseNode',
        position: { x: 300, y: 320 },
        data: {
          id: 'tool-2',
          type: 'tool',
          label: 'Grammar Check',
          description: 'Grammar and style checking'
        }
      },
      {
        id: 'output-1',
        type: 'baseNode',
        position: { x: 600, y: 200 },
        data: {
          id: 'output-1',
          type: 'output',
          label: 'Published Content',
          description: 'Final polished content'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'input-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'tool-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e3', source: 'agent-1', target: 'tool-2', type: 'smoothstep' },
      { id: 'e4', source: 'tool-2', target: 'output-1', type: 'smoothstep' }
    ]
  },
  {
    id: 'data-analyst',
    name: 'Data Analysis Agent',
    description: 'Intelligent data analyst that can process datasets, generate insights, and create visualizations.',
    category: 'analytics',
    difficulty: 'intermediate',
    estimatedTime: '10 min',
    icon: <BarChart3 className="w-5 h-5" />,
    isPopular: true,
    tags: ['data', 'analytics', 'insights', 'visualization'],
    nodes: [
      {
        id: 'input-1',
        type: 'baseNode',
        position: { x: 100, y: 200 },
        data: {
          id: 'input-1',
          type: 'input',
          label: 'Dataset Input',
          description: 'Data files or database connection'
        }
      },
      {
        id: 'tool-1',
        type: 'baseNode',
        position: { x: 300, y: 120 },
        data: {
          id: 'tool-1',
          type: 'tool',
          label: 'Data Processor',
          description: 'Clean and process data'
        }
      },
      {
        id: 'agent-1',
        type: 'baseNode',
        position: { x: 400, y: 200 },
        data: {
          id: 'agent-1',
          type: 'agent',
          label: 'Data Analyst',
          description: 'AI data analysis agent',
          instruction: 'You are an expert data analyst. Analyze the provided data to identify patterns, trends, and insights. Generate clear, actionable recommendations based on your findings.'
        }
      },
      {
        id: 'tool-2',
        type: 'baseNode',
        position: { x: 300, y: 280 },
        data: {
          id: 'tool-2',
          type: 'tool',
          label: 'Chart Generator',
          description: 'Create data visualizations'
        }
      },
      {
        id: 'output-1',
        type: 'baseNode',
        position: { x: 650, y: 150 },
        data: {
          id: 'output-1',
          type: 'output',
          label: 'Insights Report',
          description: 'Analysis results and insights'
        }
      },
      {
        id: 'output-2',
        type: 'baseNode',
        position: { x: 650, y: 250 },
        data: {
          id: 'output-2',
          type: 'output',
          label: 'Visualizations',
          description: 'Charts and graphs'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'input-1', target: 'tool-1', type: 'smoothstep' },
      { id: 'e2', source: 'tool-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e3', source: 'agent-1', target: 'tool-2', type: 'smoothstep' },
      { id: 'e4', source: 'agent-1', target: 'output-1', type: 'smoothstep' },
      { id: 'e5', source: 'tool-2', target: 'output-2', type: 'smoothstep' }
    ]
  },
  {
    id: 'sales-assistant',
    name: 'Sales Assistant Agent',
    description: 'Intelligent sales agent for lead qualification, product recommendations, and customer engagement.',
    category: 'business',
    difficulty: 'intermediate',
    estimatedTime: '8 min',
    icon: <ShoppingCart className="w-5 h-5" />,
    tags: ['sales', 'crm', 'leads', 'recommendations'],
    nodes: [
      {
        id: 'input-1',
        type: 'baseNode',
        position: { x: 100, y: 200 },
        data: {
          id: 'input-1',
          type: 'input',
          label: 'Customer Inquiry',
          description: 'Sales inquiry or question'
        }
      },
      {
        id: 'tool-1',
        type: 'baseNode',
        position: { x: 300, y: 120 },
        data: {
          id: 'tool-1',
          type: 'tool',
          label: 'CRM Lookup',
          description: 'Customer data retrieval'
        }
      },
      {
        id: 'agent-1',
        type: 'baseNode',
        position: { x: 400, y: 200 },
        data: {
          id: 'agent-1',
          type: 'agent',
          label: 'Sales Agent',
          description: 'AI sales assistant',
          instruction: 'You are a professional sales agent. Qualify leads, understand customer needs, and provide personalized product recommendations. Always be helpful and focus on solving customer problems.'
        }
      },
      {
        id: 'tool-2',
        type: 'baseNode',
        position: { x: 300, y: 280 },
        data: {
          id: 'tool-2',
          type: 'tool',
          label: 'Product Catalog',
          description: 'Product information and pricing'
        }
      },
      {
        id: 'memory-1',
        type: 'baseNode',
        position: { x: 400, y: 350 },
        data: {
          id: 'memory-1',
          type: 'memory',
          label: 'Conversation Memory',
          description: 'Remember customer preferences'
        }
      },
      {
        id: 'output-1',
        type: 'baseNode',
        position: { x: 650, y: 200 },
        data: {
          id: 'output-1',
          type: 'output',
          label: 'Sales Response',
          description: 'Personalized sales recommendation'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'input-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'tool-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e3', source: 'tool-2', target: 'agent-1', type: 'smoothstep' },
      { id: 'e4', source: 'memory-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e5', source: 'agent-1', target: 'output-1', type: 'smoothstep' }
    ]
  },
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Academic and market research agent with citation capabilities and comprehensive analysis.',
    category: 'technical',
    difficulty: 'advanced',
    estimatedTime: '12 min',
    icon: <BookOpen className="w-5 h-5" />,
    tags: ['research', 'academic', 'analysis', 'citations'],
    nodes: [
      {
        id: 'input-1',
        type: 'baseNode',
        position: { x: 100, y: 200 },
        data: {
          id: 'input-1',
          type: 'input',
          label: 'Research Query',
          description: 'Research topic or question'
        }
      },
      {
        id: 'tool-1',
        type: 'baseNode',
        position: { x: 250, y: 120 },
        data: {
          id: 'tool-1',
          type: 'tool',
          label: 'Web Search',
          description: 'Internet research tool'
        }
      },
      {
        id: 'tool-2',
        type: 'baseNode',
        position: { x: 250, y: 280 },
        data: {
          id: 'tool-2',
          type: 'tool',
          label: 'Academic DB',
          description: 'Academic database search'
        }
      },
      {
        id: 'agent-1',
        type: 'baseNode',
        position: { x: 450, y: 200 },
        data: {
          id: 'agent-1',
          type: 'agent',
          label: 'Research Agent',
          description: 'AI research assistant',
          instruction: 'You are a thorough research assistant. Analyze sources critically, synthesize information from multiple sources, and provide well-cited, comprehensive research summaries.'
        }
      },
      {
        id: 'tool-3',
        type: 'baseNode',
        position: { x: 450, y: 320 },
        data: {
          id: 'tool-3',
          type: 'tool',
          label: 'Citation Generator',
          description: 'Format citations properly'
        }
      },
      {
        id: 'output-1',
        type: 'baseNode',
        position: { x: 700, y: 150 },
        data: {
          id: 'output-1',
          type: 'output',
          label: 'Research Report',
          description: 'Comprehensive research findings'
        }
      },
      {
        id: 'output-2',
        type: 'baseNode',
        position: { x: 700, y: 250 },
        data: {
          id: 'output-2',
          type: 'output',
          label: 'Bibliography',
          description: 'Formatted citations and sources'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'input-1', target: 'tool-1', type: 'smoothstep' },
      { id: 'e2', source: 'input-1', target: 'tool-2', type: 'smoothstep' },
      { id: 'e3', source: 'tool-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e4', source: 'tool-2', target: 'agent-1', type: 'smoothstep' },
      { id: 'e5', source: 'agent-1', target: 'tool-3', type: 'smoothstep' },
      { id: 'e6', source: 'agent-1', target: 'output-1', type: 'smoothstep' },
      { id: 'e7', source: 'tool-3', target: 'output-2', type: 'smoothstep' }
    ]
  },
  {
    id: 'email-composer',
    name: 'Email Marketing Agent',
    description: 'Automated email marketing agent for personalized campaigns and customer engagement.',
    category: 'business',
    difficulty: 'beginner',
    estimatedTime: '6 min',
    icon: <Mail className="w-5 h-5" />,
    tags: ['email', 'marketing', 'automation', 'personalization'],
    nodes: [
      {
        id: 'input-1',
        type: 'baseNode',
        position: { x: 100, y: 200 },
        data: {
          id: 'input-1',
          type: 'input',
          label: 'Campaign Brief',
          description: 'Email campaign requirements'
        }
      },
      {
        id: 'tool-1',
        type: 'baseNode',
        position: { x: 300, y: 120 },
        data: {
          id: 'tool-1',
          type: 'tool',
          label: 'Customer Segmentation',
          description: 'Segment customer database'
        }
      },
      {
        id: 'agent-1',
        type: 'baseNode',
        position: { x: 400, y: 200 },
        data: {
          id: 'agent-1',
          type: 'agent',
          label: 'Email Writer',
          description: 'AI email marketing agent',
          instruction: 'You are an expert email marketer. Create compelling, personalized email content that drives engagement and conversions. Adapt tone and content based on customer segments.'
        }
      },
      {
        id: 'tool-2',
        type: 'baseNode',
        position: { x: 300, y: 280 },
        data: {
          id: 'tool-2',
          type: 'tool',
          label: 'A/B Test Generator',
          description: 'Create email variations'
        }
      },
      {
        id: 'output-1',
        type: 'baseNode',
        position: { x: 650, y: 200 },
        data: {
          id: 'output-1',
          type: 'output',
          label: 'Email Campaign',
          description: 'Ready-to-send email content'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'input-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'tool-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e3', source: 'agent-1', target: 'tool-2', type: 'smoothstep' },
      { id: 'e4', source: 'tool-2', target: 'output-1', type: 'smoothstep' }
    ]
  }
];

interface TemplateLibraryProps {
  onSelectTemplate: (nodes: Node<BaseNodeData>[], edges: Edge[], mcpConfig?: MCPConfig[]) => void;
  onClose: () => void;
}

export function TemplateLibrary({ onSelectTemplate, onClose }: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Templates', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'business', label: 'Business', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'creative', label: 'Creative', icon: <Camera className="w-4 h-4" /> },
    { id: 'customer-service', label: 'Customer Service', icon: <Headphones className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'technical', label: 'Technical', icon: <Bot className="w-4 h-4" /> }
  ];

  const difficulties = [
    { id: 'all', label: 'All Levels' },
    { id: 'beginner', label: 'Beginner' },
    { id: 'intermediate', label: 'Intermediate' },
    { id: 'advanced', label: 'Advanced' }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const popularTemplates = templates.filter(t => t.isPopular);
  const newTemplates = templates.filter(t => t.isNew);

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

          {/* Search and Filters */}
          <div className="mt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
              <Input 
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent border border-white/10 focus:border-purple-400/50 transition-all backdrop-blur-sm"
              />
            </div>

            <div className="flex gap-4 overflow-x-auto">
              <div className="flex gap-2 min-w-0">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 whitespace-nowrap ${
                      selectedCategory === category.id 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white border-0' 
                        : 'bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent border border-white/10 text-gray-300 hover:text-white hover:border-purple-400/30'
                    }`}
                  >
                    {category.icon}
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Difficulty:</span>
              {difficulties.map((difficulty) => (
                <Button
                  key={difficulty.id}
                  variant={selectedDifficulty === difficulty.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedDifficulty(difficulty.id)}
                  className={`text-xs ${
                    selectedDifficulty === difficulty.id 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {difficulty.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Popular Templates */}
          {selectedCategory === 'all' && !searchQuery && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-white">Popular Templates</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularTemplates.map((template) => (
                  <TemplateCard 
                    key={template.id} 
                    template={template} 
                    onSelect={handleSelectTemplate}
                    getDifficultyColor={getDifficultyColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* New Templates */}
          {selectedCategory === 'all' && !searchQuery && newTemplates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-white">New Templates</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {newTemplates.map((template) => (
                  <TemplateCard 
                    key={template.id} 
                    template={template} 
                    onSelect={handleSelectTemplate}
                    getDifficultyColor={getDifficultyColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Templates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">
              {searchQuery ? `Search Results (${filteredTemplates.length})` : 'All Templates'}
            </h3>
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard 
                    key={template.id} 
                    template={template} 
                    onSelect={handleSelectTemplate}
                    getDifficultyColor={getDifficultyColor}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-300 mb-2">No templates found</h4>
                <p className="text-gray-400">Try adjusting your search criteria or filters</p>
              </div>
            )}
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