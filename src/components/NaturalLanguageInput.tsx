import { useState, useRef, useEffect } from 'react';
import { PanelTop, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { generateFlow } from '@/lib/openai.js';
import { toast } from '@/hooks/use-toast.js';  
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from './nodes/BaseNode.js';

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
      console.log('NaturalLanguageInput: Component expanded, focusing textarea');
      textAreaRef.current.focus();
    }
  }, [expanded]);
  
  // Clear error when prompt changes
  useEffect(() => {
    if (error) {
      console.log('NaturalLanguageInput: Clearing error as prompt changed');
      setError(null);
    }
  }, [prompt, error]);
  
  const handleSubmit = (e: React.FormEvent) => {
    console.log('NaturalLanguageInput: Form submitted');
    e.preventDefault();
    if (prompt.trim()) {
      handleGenerate();
    }
  };
  
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    console.log('NaturalLanguageInput: Starting flow generation with prompt:', prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''));
    setIsGenerating(true);
    setError(null);
    
    try {
      toast({
        title: "Flow Generation Started",
        description: `Generating agent flow from: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
        duration: 5000,
      });
      
      // Call the OpenAI service to generate the flow
      console.log('NaturalLanguageInput: Calling OpenAI service');
      const { nodes, edges } = await generateFlow(prompt);
      
      console.log('NaturalLanguageInput: Flow generated successfully:', { 
        nodeCount: nodes.length, 
        edgeCount: edges.length 
      });
      
      if (nodes.length === 0) {
        throw new Error("No nodes were generated. Please try a more detailed description.");
      }
      
      // Call the parent callback with the generated flow
      console.log('NaturalLanguageInput: Calling onGenerate callback');
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
      console.log('NaturalLanguageInput: Error in generation', errorMessage);
      setError(errorMessage);
      
      toast({
        title: "Flow Generation Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      console.log('NaturalLanguageInput: Generation process completed');
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
        onClick={() => {
          console.log('NaturalLanguageInput: Toggle clicked, current state:', expanded);
          onToggle();
        }}
      >
        <div className="flex items-center gap-2">
          <PanelTop className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Google Search Agent Builder</h3>
        </div>
        <div className="w-4 h-4 rounded-full bg-primary/50" />
      </div>
      
      {expanded && (
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-3">
            Describe your Google ADK agent that uses the Google Search tool to find and process information.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                ref={textAreaRef}
                value={prompt}
                onChange={(e) => {
                  console.log('NaturalLanguageInput: Prompt updated, length:', e.target.value.length);
                  setPrompt(e.target.value);
                }}
                placeholder="Create a Google ADK agent that uses the google_search tool to find information about specific topics and provide summaries using the gemini-2.0-flash model..."
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
                  onClick={() => {
                    console.log('NaturalLanguageInput: Clear prompt button clicked');
                    setPrompt('');
                  }}
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
                {isGenerating ? "Generating..." : "Generate Search Agent"}
              </button>
            </div>
          </form>
          
          {!error && (
            <div className="mt-3 text-xs text-muted-foreground">
              <strong>Tips:</strong>
              <ul className="list-disc list-inside mt-1">
                <li>The agent will use the official google_search tool from Google ADK</li>
                <li>Specify how you want the agent to process search results</li>
                <li>The agent will use the gemini-2.0-flash model for processing</li>
                <li>Include any specific search topics or domains to focus on</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}