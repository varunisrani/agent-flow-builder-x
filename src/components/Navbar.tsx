
import { Save, Play, Info, HelpCircle, Folders, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button.js';
import { useNavigate } from 'react-router-dom';
import { UserMenu } from './UserMenu.js';
import { ThemeToggle } from './ThemeToggle.js';
import { InlineUndoRedoControls } from './UndoRedoControls.js';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast.js';

interface NavbarProps {
  projectName?: string;
  onSwitchProject?: () => void;
  // Undo/Redo functionality
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  historyLength?: number;
}

export function Navbar({ 
  projectName, 
  onSwitchProject,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  historyLength = 0
}: NavbarProps) {
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
    <div className="h-16 bg-gradient-to-tr from-zinc-300/10 via-purple-400/20 to-transparent from-zinc-300/5 via-purple-400/10 from-zinc-700/10 via-purple-400/20 backdrop-blur-xl border-b-[2px] border-white/10 border-black/10 flex items-center justify-between px-6 shadow-xl">
      <div className="flex items-center space-x-4">
        {projectName ? (
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent from-zinc-300/10 via-gray-400/10 from-zinc-700/10 via-gray-600/10 border-[2px] border-white/10 border-black/10 hover:border-purple-500/30 hover:border-purple-400/30 hover:border-purple-600/30 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent hover:from-zinc-300/10 hover:via-purple-400/10 hover:from-zinc-700/20 hover:via-purple-400/20 transition-all duration-300 group" 
              onClick={onSwitchProject}
            >
              <ArrowLeft className="h-4 w-4 text-gray-700 text-gray-300 text-gray-800 group-hover:text-purple-600 group-hover:text-purple-400 group-hover:text-purple-700 transition-colors duration-300" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent from-purple-400/20 via-orange-200/20 border border-purple-500/30 border-purple-400/30">
                <Folders className="w-4 h-4 text-purple-600 text-purple-400" />
              </div>
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 from-purple-300 to-orange-200">CogentX</h1>
            </div>
            <span className="text-gray-500 text-gray-400">/</span>
            <span className="text-gray-700 text-gray-300 font-medium">{projectName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent from-purple-400/20 via-orange-200/20 border border-purple-500/30 border-purple-400/30">
              <Folders className="w-4 h-4 text-purple-600 text-purple-400" />
            </div>
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 from-purple-300 to-orange-200">CogentX</h1>
          </div>
        )}
        <span className="px-3 py-1.5 rounded-full bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-transparent from-blue-400/20 via-purple-400/20 border border-blue-500/30 border-blue-400/30 text-xs font-medium text-blue-700 text-blue-300 backdrop-blur-sm">Beta</span>
      </div>

      {/* Undo/Redo Controls */}
      {onUndo && onRedo && (
        <div className="flex items-center">
          <InlineUndoRedoControls
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
            historyLength={historyLength}
          />
        </div>
      )}
      
      <div className="flex items-center space-x-3">
        {onSwitchProject && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent from-zinc-300/10 via-gray-400/10 from-zinc-700/10 via-gray-600/10 border-[2px] border-white/10 border-black/10 hover:border-purple-500/30 hover:border-purple-400/30 hover:border-purple-600/30 text-gray-700 text-gray-300 text-gray-800 hover:text-purple-600 hover:text-purple-400 hover:text-purple-700 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent hover:from-zinc-300/10 hover:via-purple-400/10 hover:from-zinc-700/20 hover:via-purple-400/20 transition-all duration-300 flex items-center gap-2 rounded-xl"
            onClick={onSwitchProject}
          >
            <Folders className="w-4 h-4" />
            Projects
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent from-zinc-300/10 via-gray-400/10 from-zinc-700/10 via-gray-600/10 border-[2px] border-white/10 border-black/10 hover:border-purple-500/30 hover:border-purple-400/30 hover:border-purple-600/30 text-gray-700 text-gray-300 text-gray-800 hover:text-purple-600 hover:text-purple-400 hover:text-purple-700 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent hover:from-zinc-300/10 hover:via-purple-400/10 hover:from-zinc-700/20 hover:via-purple-400/20 transition-all duration-300 group"
        >
          <Save className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
        </Button>
        <span className="relative inline-block overflow-hidden rounded-xl p-[1px]">
          <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] group-hover:animate-[spin_1s_linear_infinite]" />
          <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-gray-950 backdrop-blur-3xl">
            <Button
              className="inline-flex rounded-xl text-center group items-center justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent from-zinc-300/5 via-purple-400/20 text-gray-900 text-white border-0 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent hover:from-zinc-300/10 hover:via-purple-400/30 transition-all duration-300 px-4 py-2 text-sm font-medium gap-2 hover:scale-105"
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
          className="rounded-xl bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent from-zinc-300/10 via-gray-400/10 from-zinc-700/10 via-gray-600/10 border-[2px] border-white/10 border-black/10 hover:border-purple-500/30 hover:border-purple-400/30 hover:border-purple-600/30 text-gray-700 text-gray-300 text-gray-800 hover:text-purple-600 hover:text-purple-400 hover:text-purple-700 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent hover:from-zinc-300/10 hover:via-purple-400/10 hover:from-zinc-700/20 hover:via-purple-400/20 transition-all duration-300 group"
        >
          <Info className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent from-zinc-300/10 via-gray-400/10 from-zinc-700/10 via-gray-600/10 border-[2px] border-white/10 border-black/10 hover:border-purple-500/30 hover:border-purple-400/30 hover:border-purple-600/30 text-gray-700 text-gray-300 text-gray-800 hover:text-purple-600 hover:text-purple-400 hover:text-purple-700 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent hover:from-zinc-300/10 hover:via-purple-400/10 hover:from-zinc-700/20 hover:via-purple-400/20 transition-all duration-300 group"
        >
          <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
        </Button>
        
        <ThemeToggle />
        
        <UserMenu />
      </div>
    </div>
  );
}
