
import { Save, Play, Info, HelpCircle } from 'lucide-react';

export function Navbar() {
  return (
    <div className="h-14 glass border-b border-white/10 flex items-center justify-between px-4">
      <div className="flex items-center space-x-2">
        <h1 className="text-lg font-bold text-gradient">Agent Flow Builder</h1>
        <span className="glass px-2 py-0.5 rounded text-xs text-white/70">Beta</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <button className="p-2 hover:bg-white/10 rounded-md transition-colors text-muted-foreground hover:text-foreground">
          <Save className="w-4 h-4" />
        </button>
        <button className="flex items-center px-3 py-1.5 bg-primary/80 hover:bg-primary text-primary-foreground rounded-md text-sm transition-colors">
          <Play className="w-4 h-4 mr-1" />
          Test
        </button>
        <button className="p-2 hover:bg-white/10 rounded-md transition-colors text-muted-foreground hover:text-foreground">
          <Info className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-white/10 rounded-md transition-colors text-muted-foreground hover:text-foreground">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
