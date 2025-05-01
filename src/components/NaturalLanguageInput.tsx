
import { useState } from 'react';
import { PanelTop, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NaturalLanguageInputProps {
  expanded: boolean;
  onToggle: () => void;
  onGenerate: (prompt: string) => void;
}

export function NaturalLanguageInput({ expanded, onToggle, onGenerate }: NaturalLanguageInputProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerate = () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    onGenerate(prompt);
    
    // Simulate generation delay
    setTimeout(() => {
      setIsGenerating(false);
      setPrompt('');
    }, 2000);
  };
  
  return (
    <div className={cn(
      "fixed left-1/2 transform -translate-x-1/2 transition-all duration-300 glass rounded-t-xl border border-white/10 z-10",
      expanded ? "bottom-0 w-2/3" : "bottom-0 w-64 translate-y-[calc(100%-48px)]"
    )}>
      <div 
        className="flex items-center justify-between p-3 border-b border-white/10 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <PanelTop className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Natural Language Builder</h3>
        </div>
        <div className="w-4 h-4 rounded-full bg-primary/50" />
      </div>
      
      {expanded && (
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-3">
            Describe your agent in natural language, and we'll generate a flow for you.
          </p>
          
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Create an agent that can search the web and summarize articles..."
              className="w-full h-24 bg-background rounded-md border border-border p-3 text-sm resize-none"
            />
            {prompt && (
              <button
                onClick={() => setPrompt('')}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                prompt.trim() && !isGenerating
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {isGenerating ? "Generating..." : "Generate Flow"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
