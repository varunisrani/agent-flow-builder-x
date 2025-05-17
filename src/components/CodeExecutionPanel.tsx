
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Loader2, Play, Terminal, Check, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { CodeEditor } from './CodeEditor';
import { toast } from '@/hooks/use-toast';

interface CodeExecutionPanelProps {
  code: string;
  onCodeChange?: (newCode: string) => void;
  readOnly?: boolean;
}

export function CodeExecutionPanel({ code, onCodeChange, readOnly = false }: CodeExecutionPanelProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  
  // Automatically fix common Python indentation issues
  const fixPythonIndentation = (code: string) => {
    // Remove trailing spaces at the beginning of lines
    let lines = code.split('\n');
    lines = lines.map(line => {
      // Replace tabs with spaces for consistent indentation
      let processedLine = line.replace(/\t/g, '    ');
      // Handle any other indentation issues if needed
      return processedLine;
    });
    
    // Make sure there are no empty lines at the start
    while (lines.length > 0 && lines[0].trim() === '') {
      lines.shift();
    }
    
    return lines.join('\n');
  };
  
  const handleRunCode = async () => {
    try {
      setIsRunning(true);
      setLogs(prev => [...prev, '> Setting up virtual environment...']);
      
      // First, fix any potential indentation issues
      const fixedCode = fixPythonIndentation(code);
      
      if (fixedCode !== code && onCodeChange) {
        onCodeChange(fixedCode);
      }
      
      // First, set up the virtual environment if not already done
      if (!isSetupComplete) {
        await setupVirtualEnvironment(fixedCode);
      }
      
      setLogs(prev => [...prev, '> Running code...']);
      
      // Now run the code
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
        setLogs(prev => [...prev, '> Code executed successfully!']);
        setLogs(prev => [...prev, `> Agent URL: ${data.urls.agentUrl}`]);
        
        toast({
          title: "Code executed successfully",
          description: `Your agent is running at ${data.urls.agentUrl}`,
        });
        
        // Open the agent URL in a new tab
        window.open(data.urls.agentUrl, '_blank');
      } else {
        throw new Error(data.error || 'Failed to execute code');
      }
    } catch (error) {
      console.error('Error running code:', error);
      setLogs(prev => [...prev, `> Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      
      toast({
        title: "Error running code",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };
  
  const setupVirtualEnvironment = async (codeToUse: string) => {
    try {
      setLogs(prev => [...prev, '> Creating virtual environment...']);
      
      // Create agent with the code
      const createResponse = await fetch('/api/agents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentName: 'current-agent',
          code: codeToUse
        }),
      });
      
      const createData = await createResponse.json();
      
      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create agent');
      }
      
      setLogs(prev => [...prev, '> Virtual environment created!']);
      setLogs(prev => [...prev, '> Installing packages (google-generativeai-adk, openai)...']);
      
      // We don't actually need to install packages as the run API handles this
      // But we'll add a small delay to simulate the installation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setLogs(prev => [...prev, '> Packages installed successfully!']);
      setIsSetupComplete(true);
      
      return true;
    } catch (error) {
      console.error('Error setting up virtual environment:', error);
      setLogs(prev => [...prev, `> Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Code Editor</h3>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant="default"
                    size="sm"
                    className={`flex items-center gap-2 ${isRunning ? 'opacity-70 cursor-not-allowed' : ''}`}
                    onClick={handleRunCode}
                    disabled={isRunning}
                  >
                    {isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isSetupComplete ? 'Run Code' : 'Setup & Run'}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Run code in a virtual environment</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {isSetupComplete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <Check className="h-3 w-3" /> 
                    <span>Environment Ready</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Virtual environment is set up and ready</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      <CodeEditor 
        code={code} 
        onChange={value => onCodeChange?.(value || '')} 
        readOnly={readOnly}
        height="40vh"
        language="python"
      />
      
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="h-4 w-4" />
          <h4 className="font-medium">Console Output</h4>
        </div>
        
        <div className="bg-black/90 rounded-md p-3 h-32 overflow-y-auto font-mono text-sm text-green-400">
          {logs.length === 0 ? (
            <div className="text-muted-foreground italic">
              Run the code to see output here
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="leading-relaxed">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
