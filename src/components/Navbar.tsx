
import { Save, Play, Info, HelpCircle, Folders, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button.js';
import { useNavigate } from 'react-router-dom';
import { UserMenu } from './UserMenu.js';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast.js';

interface NavbarProps {
  projectName?: string;
  onSwitchProject?: () => void;
}

export function Navbar({ projectName, onSwitchProject }: NavbarProps) {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);

  const handleRunDemo = async () => {
    try {
      setIsRunning(true);
      toast({
        title: "Setting up environment",
        description: "Creating virtual environment and installing packages...",
      });

      // Call the API endpoint to run the agent
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentName: 'current-agent',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Agent running!",
          description: "Your agent is now running at " + data.urls.agentUrl,
        });
        
        // Open the agent URL in a new tab
        window.open(data.urls.agentUrl, '_blank');
      } else {
        throw new Error(data.error || 'Failed to run the agent');
      }
    } catch (error) {
      console.error('Error running agent:', error);
      toast({
        title: "Error running agent",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-14 glass border-b border-white/10 flex items-center justify-between px-4">
      <div className="flex items-center space-x-4">
        {projectName ? (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full" 
              onClick={onSwitchProject}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold text-gradient">CogentX</h1>
            <span className="text-muted-foreground">/</span>
            <span>{projectName}</span>
          </div>
        ) : (
          <h1 className="text-lg font-bold text-gradient">CogentX</h1>
        )}
        <span className="glass px-2 py-0.5 rounded text-xs text-white/70">Beta</span>
      </div>
      
      <div className="flex items-center space-x-2">
        {onSwitchProject && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            onClick={onSwitchProject}
          >
            <Folders className="w-4 h-4" />
            Projects
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-foreground"
        >
          <Save className="w-4 h-4" />
        </Button>
        <Button 
          className="flex items-center px-3 py-1.5 bg-primary/80 hover:bg-primary text-primary-foreground rounded-md text-sm transition-colors"
          onClick={handleRunDemo}
          disabled={isRunning}
        >
          <Play className="w-4 h-4 mr-1" />
          {isRunning ? 'Starting...' : 'Test'}
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-foreground"
        >
          <Info className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
        
        <UserMenu />
      </div>
    </div>
  );
}
