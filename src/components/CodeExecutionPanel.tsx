import React, { useState } from 'react';
import { CodeEditor } from './CodeEditor';
import { Loader2, Play, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';

interface CodeExecutionPanelProps {
  initialCode?: string;
  language?: string;
  height?: string;
}

export function CodeExecutionPanel({ 
  initialCode = "# Enter your Python code here\nprint('Hello, World!')", 
  language = 'python',
  height = '300px'
}: CodeExecutionPanelProps) {
  const [code, setCode] = useState<string>(initialCode);
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fix common Python indentation issues
  const fixPythonIndentation = (code: string): string => {
    // Remove indentation from the first line if present
    const lines = code.split('\n');
    if (lines[0].startsWith(' ') || lines[0].startsWith('\t')) {
      lines[0] = lines[0].trimStart();
    }
    
    return lines.join('\n');
  };

  const executeCode = async () => {
    setIsRunning(true);
    setError(null);
    setOutput('');
    
    try {
      // For Python code, fix indentation before executing
      let codeToExecute = code;
      if (language === 'python') {
        codeToExecute = fixPythonIndentation(code);
      }
      
      // This is a placeholder for actual code execution
      // In a real implementation, you would use Pyodide or another method to run the code
      setOutput(`// Execution of ${language} code would happen here\n// Code to execute:\n${codeToExecute}`);
      
      // Simulating a delay for execution
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex justify-between items-center">
          <span>{language.charAt(0).toUpperCase() + language.slice(1)} Code Editor</span>
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant="outline" 
              disabled={isRunning}
              onClick={() => setCode(initialCode)}
            >
              <X className="h-4 w-4 mr-1" /> Reset
            </Button>
            <Button 
              size="sm"
              variant="default" 
              onClick={executeCode}
              disabled={isRunning}
              className="bg-green-600 hover:bg-green-700"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              Run
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="mb-4">
          <CodeEditor 
            code={code} 
            onChange={handleCodeChange} 
            language={language}
            height={height}
          />
        </div>
        
        {(output || error) && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Output:</h3>
            <div className="bg-zinc-900 text-zinc-100 p-4 rounded-md overflow-auto max-h-[200px]">
              {error ? (
                <pre className="text-red-400">{error}</pre>
              ) : (
                <pre>{output}</pre>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 text-xs text-muted-foreground">
        Use the Run button to execute your code.
      </CardFooter>
    </Card>
  );
}
