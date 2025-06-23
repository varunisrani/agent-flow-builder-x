
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
    <div className="h-16 bg-gradient-to-tr from-zinc-300/10 via-purple-400/20 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 backdrop-blur-xl border-b-[2px] border-black/5 dark:border-white/10 flex items-center justify-between px-6 shadow-xl">
      <div className="flex items-center space-x-4">
        {projectName ? (
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 border-[2px] border-black/5 dark:border-white/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300 group" 
              onClick={onSwitchProject}
            >
              <ArrowLeft className="h-4 w-4 text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/30 dark:border-purple-400/30">
                <Folders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200">CogentX</h1>
            </div>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-medium">{projectName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/30 dark:border-purple-400/30">
              <Folders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200">CogentX</h1>
          </div>
        )}
        <span className="px-3 py-1.5 rounded-full bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-transparent dark:from-blue-400/20 dark:via-purple-400/20 border border-blue-500/30 dark:border-blue-400/30 text-xs font-medium text-blue-700 dark:text-blue-300 backdrop-blur-sm">Beta</span>
      </div>
      
      <div className="flex items-center space-x-3">
        {onSwitchProject && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 border-[2px] border-black/5 dark:border-white/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300 flex items-center gap-2 rounded-xl"
            onClick={onSwitchProject}
          >
            <Folders className="w-4 h-4" />
            Projects
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 border-[2px] border-black/5 dark:border-white/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300 group"
        >
          <Save className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
        </Button>
        <span className="relative inline-block overflow-hidden rounded-xl p-[1px]">
          <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] group-hover:animate-[spin_1s_linear_infinite]" />
          <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-white dark:bg-gray-950 backdrop-blur-3xl">
            <Button
              className="inline-flex rounded-xl text-center group items-center justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-0 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all duration-300 px-4 py-2 text-sm font-medium gap-2 hover:scale-105"
              onClick={handleRunDemo}
              disabled={isRunning}
            >
              <Play className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
              {isRunning ? 'Starting...' : 'Test Agent'}
            </Button>
          </div>
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 border-[2px] border-black/5 dark:border-white/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300 group"
        >
          <Info className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 border-[2px] border-black/5 dark:border-white/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300 group"
        >
          <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
        </Button>
        
        <UserMenu />
      </div>
    </div>
  );
}
