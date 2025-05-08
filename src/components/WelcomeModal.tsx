import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.js';

interface WelcomeStep {
  title: string;
  description: string;
  image?: string;
}

const steps: WelcomeStep[] = [
  {
    title: "Welcome to CogentX",
    description: "Create powerful AI agents without writing code. This quick tour will show you the basics."
  },
  {
    title: "Drag & Drop Nodes",
    description: "Drag components from the sidebar and drop them on the canvas to build your agent's workflow."
  },
  {
    title: "Connect Nodes",
    description: "Click and drag from one node's handle to another to create connections between components."
  },
  {
    title: "Natural Language Creation",
    description: "Describe your agent in plain English and we'll generate a flow for you automatically."
  },
  {
    title: "Test Your Agent",
    description: "Use the testing panel to chat with your agent and see how it performs."
  }
];

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if first-time user
    const hasSeenWelcome = localStorage.getItem('cogentx-welcome-shown');
    if (!hasSeenWelcome) {
      setIsOpen(true);
      localStorage.setItem('cogentx-welcome-shown', 'true');
    }
  }, []);
  
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsOpen(false);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSkip = () => {
    localStorage.setItem('cogentx-welcome-shown', 'true');
    setIsOpen(false);
    
    toast({
      title: "Welcome to CogentX",
      description: "You can access the tutorial again from the help menu.",
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card max-w-lg w-full p-6 relative">
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gradient mb-1">{steps[currentStep].title}</h3>
            <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
          </div>
          
          <div className="h-40 flex items-center justify-center glass rounded-md">
            {/* Placeholder for step images */}
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-2xl text-primary">{currentStep + 1}</span>
            </div>
          </div>
          
          <div className="flex justify-between pt-4">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={currentStep === 0 
                ? "text-sm text-muted-foreground cursor-not-allowed"
                : "text-sm text-primary hover:text-primary/80"
              }
            >
              Back
            </button>
            
            <div className="flex items-center space-x-1">
              {steps.map((_, index) => (
                <div 
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={nextStep}
              className="text-sm text-primary hover:text-primary/80 flex items-center"
            >
              {currentStep === steps.length - 1 ? "Finish" : "Next"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
