import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Sparkles, MousePointer, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  icon: React.ReactNode;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '🎉 Welcome to CogentX',
    description: 'Build powerful AI agents visually without any coding experience. Let\'s take a quick tour!',
    target: '',
    position: 'bottom',
    icon: <Sparkles className="w-5 h-5" />
  },
  {
    id: 'sidebar',
    title: '🧱 Component Library',
    description: 'Drag and drop components from here to build your agent. Start with "AI Agent" for the main brain.',
    target: '.sidebar',
    position: 'right',
    icon: <MousePointer className="w-5 h-5" />
  },
  {
    id: 'canvas',
    title: '🎨 Visual Canvas',
    description: 'This is where you build your agent flow. Connect components by dragging from the dots on each node.',
    target: '.react-flow',
    position: 'top',
    icon: <Zap className="w-5 h-5" />
  },
  {
    id: 'natural-language',
    title: '💬 Natural Language Builder',
    description: 'Too easy! Just describe what you want in plain English and we\'ll build it for you automatically.',
    target: '.natural-language-input',
    position: 'top',
    icon: <Sparkles className="w-5 h-5" />
  },
  {
    id: 'generate',
    title: '🚀 Generate & Deploy',
    description: 'Click "Generate Google ADK Code" to convert your visual flow into production-ready code.',
    target: '.generate-code-button',
    position: 'left',
    icon: <Zap className="w-5 h-5" />
  }
];

interface OnboardingOverlayProps {
  onComplete: () => void;
}

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('cogentx-onboarding-complete');
    if (!hasSeenOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
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

  if (!isVisible) return null;

  const step = onboardingSteps[currentStep];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      {/* Welcome step - centered modal */}
      {step.id === 'welcome' && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 backdrop-blur-xl rounded-2xl border-[2px] border-black/5 dark:border-white/10 shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/30 dark:border-purple-400/30 rounded-2xl flex items-center justify-center mb-6">
                {step.icon}
              </div>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200 mb-4">
                {step.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                {step.description}
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={handleSkip}>
                  Skip Tour
                </Button>
                <span className="relative inline-block overflow-hidden rounded-xl p-[1px]">
                  <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                  <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-white dark:bg-gray-950 backdrop-blur-3xl">
                    <Button onClick={handleNext} className="bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 border-0 hover:scale-105">
                      Start Tour
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other steps - positioned tooltips */}
      {step.id !== 'welcome' && (
        <>
          {/* Backdrop with cutout effect would go here in a real implementation */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 backdrop-blur-xl rounded-2xl border-[2px] border-black/5 dark:border-white/10 shadow-2xl p-6 max-w-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-2 bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/30 dark:border-purple-400/30 rounded-xl flex-shrink-0">
                  {step.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
                <button 
                  onClick={handleSkip}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {currentStep} of {onboardingSteps.length - 1}
                  </span>
                  <div className="flex gap-1">
                    {onboardingSteps.slice(1).map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          index === currentStep - 1
                            ? "bg-purple-500"
                            : "bg-gray-300 dark:bg-gray-600"
                        )}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {currentStep > 1 && (
                    <Button variant="outline" size="sm" onClick={handlePrevious}>
                      Previous
                    </Button>
                  )}
                  <Button size="sm" onClick={handleNext}>
                    {currentStep === onboardingSteps.length - 1 ? 'Finish' : 'Next'}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}