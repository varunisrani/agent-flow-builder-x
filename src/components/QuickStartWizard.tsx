import React, { useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Bot, 
  MessageSquare, 
  BarChart3, 
  Briefcase, 
  Users, 
  FileText,
  ShoppingCart,
  Headphones,
  BookOpen,
  X,
  CheckCircle,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BaseNodeData } from '@/components/nodes/BaseNode';
import { MCPConfig } from '@/lib/codeGeneration';

interface UseCase {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  example: string;
}

const useCases: UseCase[] = [
  {
    id: 'customer-support',
    title: 'Customer Support',
    description: 'Help customers with inquiries and issues',
    icon: <Headphones className="w-6 h-6" />,
    category: 'customer-service',
    example: 'A friendly agent that answers product questions and resolves complaints'
  },
  {
    id: 'content-creation',
    title: 'Content Creation',
    description: 'Generate blogs, articles, and marketing content',
    icon: <FileText className="w-6 h-6" />,
    category: 'creative',
    example: 'An AI writer that creates engaging blog posts and social media content'
  },
  {
    id: 'data-analysis',
    title: 'Data Analysis',
    description: 'Analyze data and generate insights',
    icon: <BarChart3 className="w-6 h-6" />,
    category: 'analytics',
    example: 'An analyst that processes spreadsheets and creates charts'
  },
  {
    id: 'sales-assistant',
    title: 'Sales Assistant',
    description: 'Qualify leads and recommend products',
    icon: <ShoppingCart className="w-6 h-6" />,
    category: 'business',
    example: 'A sales agent that understands customer needs and suggests solutions'
  },
  {
    id: 'research-helper',
    title: 'Research Helper',
    description: 'Gather information and summarize findings',
    icon: <BookOpen className="w-6 h-6" />,
    category: 'technical',
    example: 'A researcher that finds reliable sources and creates summaries'
  },
  {
    id: 'personal-assistant',
    title: 'Personal Assistant',
    description: 'Help with scheduling and task management',
    icon: <Users className="w-6 h-6" />,
    category: 'business',
    example: 'An assistant that manages your calendar and prioritizes tasks'
  }
];

interface QuickStartWizardProps {
  onComplete: (nodes: Node<BaseNodeData>[], edges: Edge[], mcpConfig?: MCPConfig[]) => void;
  onClose: () => void;
}

export function QuickStartWizard({ onComplete, onClose }: QuickStartWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentInstructions, setAgentInstructions] = useState('');

  const steps = [
    'Choose Use Case',
    'Name Your Agent',
    'Describe Purpose',
    'Set Instructions',
    'Create Agent'
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUseCaseSelect = (useCase: UseCase) => {
    setSelectedUseCase(useCase);
    // Auto-populate based on use case
    setAgentName(useCase.title + ' Agent');
    setAgentDescription(useCase.description);
    setAgentInstructions(getDefaultInstructions(useCase.id));
  };

  const getDefaultInstructions = (useCaseId: string): string => {
    switch (useCaseId) {
      case 'customer-support':
        return 'You are a helpful customer support agent. Respond professionally and empathetically to customer inquiries. If you cannot resolve an issue, escalate it appropriately. Always maintain a positive and helpful tone.';
      case 'content-creation':
        return 'You are a skilled content writer. Create engaging, well-researched content that provides value to readers. Adapt your writing style to match the target audience and maintain consistent quality.';
      case 'data-analysis':
        return 'You are an expert data analyst. Examine data carefully to identify patterns, trends, and insights. Present your findings clearly with actionable recommendations and supporting evidence.';
      case 'sales-assistant':
        return 'You are a professional sales assistant. Focus on understanding customer needs and providing relevant solutions. Build trust through helpful guidance rather than pushy sales tactics.';
      case 'research-helper':
        return 'You are a thorough research assistant. Gather information from reliable sources, verify facts, and present comprehensive summaries. Always cite your sources and acknowledge limitations.';
      case 'personal-assistant':
        return 'You are an efficient personal assistant. Help with organization, scheduling, and task management. Be proactive in identifying potential issues and suggesting solutions.';
      default:
        return 'You are a helpful AI assistant. Provide accurate, useful information and assistance to users. Be professional, friendly, and responsive to their specific needs.';
    }
  };

  const generateAgentFlow = (): { nodes: Node<BaseNodeData>[], edges: Edge[] } => {
    const nodes: Node<BaseNodeData>[] = [
      {
        id: 'input-1',
        type: 'baseNode',
        position: { x: 100, y: 200 },
        data: {
          id: 'input-1',
          type: 'input',
          label: 'User Input',
          description: 'User query or request'
        }
      },
      {
        id: 'agent-1',
        type: 'baseNode',
        position: { x: 350, y: 200 },
        data: {
          id: 'agent-1',
          type: 'agent',
          label: agentName,
          description: agentDescription,
          instruction: agentInstructions
        }
      },
      {
        id: 'output-1',
        type: 'baseNode',
        position: { x: 600, y: 200 },
        data: {
          id: 'output-1',
          type: 'output',
          label: 'Agent Response',
          description: 'Generated response from agent'
        }
      }
    ];

    // Add use case specific nodes
    if (selectedUseCase) {
      switch (selectedUseCase.id) {
        case 'customer-support':
          nodes.push({
            id: 'tool-1',
            type: 'baseNode',
            position: { x: 350, y: 350 },
            data: {
              id: 'tool-1',
              type: 'tool',
              label: 'Knowledge Base',
              description: 'Company knowledge base search'
            }
          });
          break;
        case 'content-creation':
          nodes.push({
            id: 'tool-1',
            type: 'baseNode',
            position: { x: 350, y: 350 },
            data: {
              id: 'tool-1',
              type: 'tool',
              label: 'Research Tool',
              description: 'Web research for content'
            }
          });
          break;
        case 'data-analysis':
          nodes.push({
            id: 'tool-1',
            type: 'baseNode',
            position: { x: 350, y: 350 },
            data: {
              id: 'tool-1',
              type: 'tool',
              label: 'Data Processor',
              description: 'Data analysis and visualization'
            }
          });
          break;
        case 'sales-assistant':
          nodes.push({
            id: 'tool-1',
            type: 'baseNode',
            position: { x: 300, y: 120 },
            data: {
              id: 'tool-1',
              type: 'tool',
              label: 'CRM Integration',
              description: 'Customer data lookup'
            }
          });
          nodes.push({
            id: 'tool-2',
            type: 'baseNode',
            position: { x: 300, y: 280 },
            data: {
              id: 'tool-2',
              type: 'tool',
              label: 'Product Catalog',
              description: 'Product information and pricing'
            }
          });
          break;
        case 'research-helper':
          nodes.push({
            id: 'tool-1',
            type: 'baseNode',
            position: { x: 350, y: 350 },
            data: {
              id: 'tool-1',
              type: 'tool',
              label: 'Web Search',
              description: 'Internet research capability'
            }
          });
          break;
        case 'personal-assistant':
          nodes.push({
            id: 'memory-1',
            type: 'baseNode',
            position: { x: 350, y: 350 },
            data: {
              id: 'memory-1',
              type: 'memory',
              label: 'Personal Context',
              description: 'Remember user preferences and history'
            }
          });
          break;
      }
    }

    const edges: Edge[] = [
      { id: 'e1', source: 'input-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'agent-1', target: 'output-1', type: 'smoothstep' }
    ];

    // Add edges for additional nodes
    if (nodes.length > 3) {
      if (selectedUseCase?.id === 'sales-assistant') {
        edges.push(
          { id: 'e3', source: 'tool-1', target: 'agent-1', type: 'smoothstep' },
          { id: 'e4', source: 'tool-2', target: 'agent-1', type: 'smoothstep' }
        );
      } else {
        edges.push({ id: 'e3', source: nodes[3].id, target: 'agent-1', type: 'smoothstep' });
      }
    }

    return { nodes, edges };
  };

  const handleComplete = () => {
    const { nodes, edges } = generateAgentFlow();
    onComplete(nodes, edges);
    onClose();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedUseCase !== null;
      case 1: return agentName.trim() !== '';
      case 2: return agentDescription.trim() !== '';
      case 3: return agentInstructions.trim() !== '';
      default: return true;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-4xl bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent backdrop-blur-xl rounded-2xl border-[2px] border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-400/20 via-orange-200/20 to-transparent border border-purple-400/30">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-orange-200">
                  Quick Start Wizard
                </h2>
                <p className="text-gray-300 text-sm">
                  Create your first AI agent in 5 simple steps
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

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm text-gray-400">
                {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {steps.map((step, index) => (
                <span 
                  key={step}
                  className={`text-xs ${
                    index <= currentStep ? 'text-purple-400' : 'text-gray-500'
                  }`}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* Step 0: Choose Use Case */}
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    What type of AI agent do you want to build?
                  </h3>
                  <p className="text-gray-300">
                    Choose a use case to get started with a pre-configured template
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {useCases.map((useCase) => (
                    <Card
                      key={useCase.id}
                      className={`cursor-pointer transition-all duration-300 ${
                        selectedUseCase?.id === useCase.id
                          ? 'bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-transparent border-purple-400/50 scale-105'
                          : 'bg-gradient-to-br from-zinc-300/5 via-purple-400/5 to-transparent border-white/10 hover:border-purple-400/30 hover:scale-102'
                      }`}
                      onClick={() => handleUseCaseSelect(useCase)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl ${
                            selectedUseCase?.id === useCase.id
                              ? 'bg-purple-500/30 border-purple-400/50'
                              : 'bg-gradient-to-tr from-purple-400/20 via-orange-200/20 to-transparent border-purple-400/30'
                          } border`}>
                            {useCase.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white mb-1">
                              {useCase.title}
                            </h4>
                            <p className="text-gray-300 text-sm leading-relaxed">
                              {useCase.description}
                            </p>
                            <p className="text-gray-400 text-xs mt-2 italic">
                              {useCase.example}
                            </p>
                          </div>
                          {selectedUseCase?.id === useCase.id && (
                            <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 1: Name Your Agent */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    What should we call your agent?
                  </h3>
                  <p className="text-gray-300">
                    Give your agent a memorable name that reflects its purpose
                  </p>
                </div>

                <div className="max-w-lg mx-auto space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Agent Name
                    </label>
                    <Input
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g., Customer Support Helper"
                      className="bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent border border-white/10 focus:border-purple-400/50 transition-all backdrop-blur-sm text-lg h-12"
                    />
                  </div>

                  {selectedUseCase && (
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-transparent border border-purple-400/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        {selectedUseCase.icon}
                        <span className="font-medium text-purple-300">
                          {selectedUseCase.title} Agent
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">
                        Perfect for: {selectedUseCase.example}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Describe Purpose */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Describe what your agent will do
                  </h3>
                  <p className="text-gray-300">
                    Provide a brief description of your agent's main purpose
                  </p>
                </div>

                <div className="max-w-lg mx-auto">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <Textarea
                      value={agentDescription}
                      onChange={(e) => setAgentDescription(e.target.value)}
                      placeholder="Describe what your agent will help with..."
                      rows={4}
                      className="bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent border border-white/10 focus:border-purple-400/50 transition-all backdrop-blur-sm resize-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Set Instructions */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Set your agent's behavior
                  </h3>
                  <p className="text-gray-300">
                    Define how your agent should behave and respond to users
                  </p>
                </div>

                <div className="max-w-2xl mx-auto">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      System Instructions
                    </label>
                    <Textarea
                      value={agentInstructions}
                      onChange={(e) => setAgentInstructions(e.target.value)}
                      placeholder="You are a helpful assistant that..."
                      rows={6}
                      className="bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent border border-white/10 focus:border-purple-400/50 transition-all backdrop-blur-sm resize-none"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    These instructions guide how your agent thinks and responds. Be specific about tone, style, and behavior.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Review and Create */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Ready to create your agent!
                  </h3>
                  <p className="text-gray-300">
                    Review your configuration and create your first AI agent
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-4">
                  <Card className="bg-gradient-to-br from-zinc-300/5 via-purple-400/5 to-transparent border border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Bot className="w-5 h-5" />
                        {agentName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-300 mb-1">Purpose</h4>
                        <p className="text-gray-400 text-sm">{agentDescription}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-300 mb-1">Behavior</h4>
                        <p className="text-gray-400 text-sm line-clamp-3">{agentInstructions}</p>
                      </div>
                      {selectedUseCase && (
                        <div>
                          <h4 className="font-medium text-gray-300 mb-1">Use Case</h4>
                          <div className="flex items-center gap-2">
                            {selectedUseCase.icon}
                            <span className="text-gray-400 text-sm">{selectedUseCase.title}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="text-center">
                    <Button
                      onClick={handleComplete}
                      className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white px-8 py-3 gap-2 text-lg"
                    >
                      <Sparkles className="w-5 h-5" />
                      Create My Agent
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-transparent">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent border border-white/10 text-gray-300 hover:text-white hover:border-purple-400/30 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <Button
              onClick={currentStep === steps.length - 1 ? handleComplete : handleNext}
              disabled={!canProceed()}
              className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white disabled:opacity-50"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Agent
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}