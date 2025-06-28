import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { 
  X, 
  ArrowRight, 
  CheckCircle, 
  PlayCircle, 
  Sparkles, 
  Mouse, 
  Hand, 
  Target, 
  MessageSquare,
  Bot,
  Zap,
  ChevronLeft,
  ChevronRight,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BaseNodeData } from '@/components/nodes/BaseNode';

interface InteractiveStep {
  id: string;
  title: string;
  description: string;
  instruction: string;
  target?: string;
  action: 'observe' | 'click' | 'drag' | 'type' | 'connect';
  icon: React.ReactNode;
  position?: { x: number; y: number };
  completed?: boolean;
  optional?: boolean;
}

const onboardingSteps: InteractiveStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Agent Flow Builder',
    description: 'Let\'s build your first AI agent together in just a few steps',
    instruction: 'Click "Start Tutorial" to begin your hands-on journey',
    action: 'click',
    icon: <Sparkles className="w-5 h-5" />
  },
  {
    id: 'sidebar-explore',
    title: 'Explore the Component Library',
    description: 'The sidebar contains all building blocks for your AI agent',
    instruction: 'Click on the "AI Agent" component in the sidebar to see what it does',
    target: '[data-node-type="agent"]',
    action: 'click',
    icon: <Bot className="w-5 h-5" />
  },
  {
    id: 'drag-agent',
    title: 'Create Your First Agent',
    description: 'Drag components from the sidebar to the canvas to build your flow',
    instruction: 'Drag the "AI Agent" component onto the canvas',
    target: '.react-flow__viewport',
    action: 'drag',
    icon: <Mouse className="w-5 h-5" />
  },
  {
    id: 'add-input',
    title: 'Add an Input Source',
    description: 'Every agent needs a way to receive information from users',
    instruction: 'Drag an "Input" component onto the canvas to the left of your agent',
    target: '.react-flow__viewport',
    action: 'drag',
    icon: <Target className="w-5 h-5" />
  },
  {
    id: 'connect-nodes',
    title: 'Connect the Components',
    description: 'Connect components by dragging from the dots on each node',
    instruction: 'Drag from the output dot of the Input to the input dot of the Agent',
    action: 'connect',
    icon: <Hand className="w-5 h-5" />
  },
  {
    id: 'configure-agent',
    title: 'Configure Your Agent',
    description: 'Click on your agent to configure how it behaves',
    instruction: 'Click on the Agent node to open its properties panel',
    action: 'click',
    icon: <Zap className="w-5 h-5" />
  },
  {
    id: 'test-agent',
    title: 'Test Your Creation',
    description: 'Use the test panel to interact with your agent',
    instruction: 'Click the chat icon in the top-right to test your agent',
    target: '[title="Test Agent"]',
    action: 'click',
    icon: <MessageSquare className="w-5 h-5" />
  },
  {
    id: 'complete',
    title: 'Congratulations!',
    description: 'You\'ve created your first AI agent flow',
    instruction: 'You\'re ready to build amazing AI agents!',
    action: 'observe',
    icon: <Star className="w-5 h-5" />,
    completed: true
  }
];

interface InteractiveOnboardingProps {
  onComplete: () => void;
  onNodeCreate?: (type: string, position: { x: number; y: number }) => void;
  onNodeSelect?: (nodeId: string) => void;
}

export function InteractiveOnboarding({ 
  onComplete, 
  onNodeCreate, 
  onNodeSelect 
}: InteractiveOnboardingProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [userProgress, setUserProgress] = useState({
    hasCreatedAgent: false,
    hasCreatedInput: false,
    hasConnectedNodes: false,
    hasConfiguredAgent: false,
    hasTestedAgent: false
  });

  const spotlightRef = useRef<HTMLDivElement>(null);
  const currentStep = onboardingSteps[currentStepIndex];

  // Track user actions to advance tutorial automatically
  const handleUserAction = useCallback((action: string, data?: any) => {
    switch (action) {
      case 'node-created':
        if (data?.type === 'agent') {
          setUserProgress(prev => ({ ...prev, hasCreatedAgent: true }));
          if (currentStep.id === 'drag-agent') {
            handleStepComplete('drag-agent');
          }
        }
        if (data?.type === 'input') {
          setUserProgress(prev => ({ ...prev, hasCreatedInput: true }));
          if (currentStep.id === 'add-input') {
            handleStepComplete('add-input');
          }
        }
        break;
      case 'nodes-connected':
        setUserProgress(prev => ({ ...prev, hasConnectedNodes: true }));
        if (currentStep.id === 'connect-nodes') {
          handleStepComplete('connect-nodes');
        }
        break;
      case 'node-configured':
        setUserProgress(prev => ({ ...prev, hasConfiguredAgent: true }));
        if (currentStep.id === 'configure-agent') {
          handleStepComplete('configure-agent');
        }
        break;
      case 'agent-tested':
        setUserProgress(prev => ({ ...prev, hasTestedAgent: true }));
        if (currentStep.id === 'test-agent') {
          handleStepComplete('test-agent');
        }
        break;
    }
  }, [currentStep.id]);

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
    
    // Auto-advance to next step after a short delay
    setTimeout(() => {
      if (currentStepIndex < onboardingSteps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        setShowCelebration(true);
        setTimeout(() => {
          handleComplete();
        }, 3000);
      }
    }, 1500);
  };

  const handleNext = () => {
    if (currentStepIndex < onboardingSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('cogentx-onboarding-complete', 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Auto-highlight target elements
  useEffect(() => {
    if (currentStep.target) {
      const element = document.querySelector(currentStep.target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('onboarding-highlight');
        
        return () => {
          element.classList.remove('onboarding-highlight');
        };
      }
    }
  }, [currentStep.target]);

  // Create sample nodes for the tutorial
  const createSampleAgent = () => {
    if (onNodeCreate) {
      onNodeCreate('agent', { x: 300, y: 200 });
      handleUserAction('node-created', { type: 'agent' });
    }
  };

  const createSampleInput = () => {
    if (onNodeCreate) {
      onNodeCreate('input', { x: 100, y: 200 });
      handleUserAction('node-created', { type: 'input' });
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center"
              >
                <Star className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-4">
                🎉 Congratulations!
              </h2>
              <p className="text-xl text-gray-300">
                You've built your first AI agent flow!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tutorial Overlay */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
        {/* Tutorial Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-md"
        >
          <Card className="bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent backdrop-blur-xl border-[2px] border-white/10 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-2 bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent border border-purple-500/30 rounded-xl flex-shrink-0">
                  {currentStep.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {currentStep.title}
                    </h3>
                    {completedSteps.has(currentStep.id) && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">
                    {currentStep.description}
                  </p>
                  <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-400/20">
                    <p className="text-blue-300 text-sm font-medium">
                      {currentStep.instruction}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleSkip}
                  className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>Step {currentStepIndex + 1} of {onboardingSteps.length}</span>
                  <span>{Math.round(((currentStepIndex + 1) / onboardingSteps.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStepIndex + 1) / onboardingSteps.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {currentStepIndex > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      className="bg-gray-800/50 border-gray-600 text-gray-300 hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Helper buttons for certain steps */}
                  {currentStep.id === 'drag-agent' && !userProgress.hasCreatedAgent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={createSampleAgent}
                      className="bg-purple-500/20 border-purple-500/30 text-purple-300 hover:text-purple-200"
                    >
                      <Bot className="w-4 h-4 mr-1" />
                      Create for me
                    </Button>
                  )}
                  
                  {currentStep.id === 'add-input' && !userProgress.hasCreatedInput && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={createSampleInput}
                      className="bg-blue-500/20 border-blue-500/30 text-blue-300 hover:text-blue-200"
                    >
                      <Target className="w-4 h-4 mr-1" />
                      Create for me
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={currentStepIndex === onboardingSteps.length - 1 ? handleComplete : handleNext}
                    className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white"
                  >
                    {currentStepIndex === onboardingSteps.length - 1 ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Finish
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Optional: Show completed actions */}
              {Object.values(userProgress).some(Boolean) && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-400 mb-2">Your progress:</p>
                  <div className="flex flex-wrap gap-1">
                    {userProgress.hasCreatedAgent && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                        Agent Created
                      </Badge>
                    )}
                    {userProgress.hasCreatedInput && (
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-xs">
                        Input Added
                      </Badge>
                    )}
                    {userProgress.hasConnectedNodes && (
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-xs">
                        Nodes Connected
                      </Badge>
                    )}
                    {userProgress.hasConfiguredAgent && (
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 text-xs">
                        Agent Configured
                      </Badge>
                    )}
                    {userProgress.hasTestedAgent && (
                      <Badge variant="secondary" className="bg-pink-500/20 text-pink-400 text-xs">
                        Agent Tested
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Spotlight effect for highlighted elements */}
        {currentStep.target && (
          <div className="absolute inset-0 pointer-events-none">
            <style jsx>{`
              .onboarding-highlight {
                position: relative;
                z-index: 51;
                box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px rgba(147, 51, 234, 0.5);
                border-radius: 8px;
              }
            `}</style>
          </div>
        )}
      </div>
    </>
  );
}