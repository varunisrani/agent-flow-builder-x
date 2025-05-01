import { useState, useRef, useEffect } from 'react';
import { PanelTop, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateFlow } from '@/lib/openai';
import { toast } from '@/hooks/use-toast';
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from './nodes/BaseNode';

interface NaturalLanguageInputProps {
  expanded: boolean;
  onToggle: () => void;
  onGenerate: (prompt: string, nodes: Node<BaseNodeData>[], edges: Edge[]) => void;
}

export function NaturalLanguageInput({ expanded, onToggle, onGenerate }: NaturalLanguageInputProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // Focus the textarea when expanded
  useEffect(() => {
    if (expanded && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [expanded]);
  
  // Clear error when prompt changes
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [prompt, error]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      handleGenerate();
    }
  };
  
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      toast({
        title: "Flow Generation Started",
        description: `Generating agent flow from: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
        duration: 5000,
      });
      
      // Call the OpenAI service to generate the flow
      const { nodes, edges } = await generateFlow(prompt);
      
      if (nodes.length === 0) {
        throw new Error("No nodes were generated. Please try a more detailed description.");
      }
      
      // Call the parent callback with the generated flow
      onGenerate(prompt, nodes, edges);
      
      toast({
        title: "Flow Generation Complete",
        description: `Created ${nodes.length} nodes and ${edges.length} connections`,
        duration: 3000,
      });
      
      // Reset the prompt after successful generation
      setPrompt('');
    } catch (error) {
      console.error('Error generating flow:', error);
      
      // Set error message for display in the UI
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      
      toast({
        title: "Flow Generation Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
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
            Describe your agent workflow in natural language, including the tools, models, and connections it should have.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                ref={textAreaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Create an agent that searches the web for information, analyzes the results with GPT-4, and returns a summary..."
                className={cn(
                  "w-full h-24 bg-background rounded-md border p-3 text-sm resize-none",
                  error ? "border-red-500" : "border-border",
                  isGenerating && "opacity-70"
                )}
                disabled={isGenerating}
              />
              {prompt && !isGenerating && (
                <button
                  type="button"
                  onClick={() => setPrompt('')}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {error && (
              <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                  prompt.trim() && !isGenerating
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                {isGenerating ? "Generating..." : "Generate Flow"}
              </button>
            </div>
          </form>
          
          {!error && (
            <div className="mt-3 text-xs text-muted-foreground">
              <strong>Tip:</strong> Be specific about the tools and models you want to use, and how they should be connected.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
