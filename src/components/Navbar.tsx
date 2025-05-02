import { Save, Play, Info, HelpCircle, Folders, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { UserMenu } from './UserMenu';

interface NavbarProps {
  projectName?: string;
  onSwitchProject?: () => void;
}

export function Navbar({ projectName, onSwitchProject }: NavbarProps) {
  const navigate = useNavigate();

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
        >
          <Play className="w-4 h-4 mr-1" />
          Test
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
