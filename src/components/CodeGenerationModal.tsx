import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from './nodes/BaseNode';
import { Copy, Download, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

// Define PyodideInterface type for better type safety
interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<string>;
  globals: Record<string, unknown>;
}

export interface CodeGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
  customCode?: string;
}

// Helper function to remove common leading whitespace (dedent)
function dedent(str: string): string {
  const lines = str.split('\n');
  let minIndent = Infinity;
  
  // Find minimum indentation level
  lines.forEach(line => {
    // Ignore empty lines
    if (line.trim() === '') return;
    
    const indent = line.match(/^\s*/)?.[0].length || 0;
    minIndent = Math.min(minIndent, indent);
  });
  
  // Remove common indent from all lines
  if (minIndent !== Infinity) {
    return lines.map(line => line.slice(minIndent)).join('\n');
  }
  
  return str;
}

export const CodeGenerationModal: React.FC<CodeGenerationModalProps> = ({ 
  open, 
  onOpenChange,
  nodes,
  edges,
  customCode
}) => {
  console.log('CodeGenerationModal rendered', { nodeCount: nodes.length, edgeCount: edges.length });
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('code');
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [pyodideInstance, setPyodideInstance] = useState<PyodideInterface | null>(null);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  
  // Use ref to track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  
  const generatedCode = customCode || generateADKCode(nodes, edges);

  // Set up mount/unmount lifecycle
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      console.log('Component unmounting, cleaning up');
      isMounted.current = false;
    };
  }, []);

  // Clean up Pyodide when modal closes
  useEffect(() => {
    console.log('Modal open state changed:', open);
    
    if (!open && pyodideInstance) {
      console.log('Modal closed, preparing to reset Pyodide');
      // Schedule reset for next tick to avoid conflicts with ongoing operations
      setTimeout(() => {
        if (!isMounted.current) return;
        console.log('Cleaning up Pyodide instance');
        setPyodideInstance(null);
      }, 0);
      }
  }, [open, pyodideInstance]);

  const handleCopyCode = () => {
    console.log('Copying code to clipboard');
    navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Code copied",
      description: "The generated code has been copied to your clipboard.",
    });
  };

  const handleExportCode = () => {
    console.log('Exporting code as Python file');
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent_code.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Code exported",
      description: "Your code has been downloaded as agent_code.py",
    });
  };

  const handleRunCode = async () => {
    if (isRunning) return;
    
    console.log('Run code button clicked');
    
    try {
      setIsRunning(true);
      setActiveTab('output');
      
      let pyodide = pyodideInstance;
      if (!pyodide) {
        console.log('Pyodide not loaded, initializing...');
        setPyodideLoading(true);
        setOutput("Loading Python environment (this may take a minute)...");
        
        try {
          // Dynamic import to reduce initial load time
          console.log('Importing Pyodide dynamically');
          const pyodideModule = await import("pyodide");
          const { loadPyodide } = pyodideModule;
          
          console.log('Loading Pyodide instance');
          pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
          }) as PyodideInterface;
          
          // Check if component is still mounted before updating state
          if (!isMounted.current) {
            console.log('Component unmounted during Pyodide load, aborting');
            return;
          }
          
          console.log('Pyodide loaded successfully, instance:', pyodide);
          setPyodideInstance(pyodide);
          setOutput("Setting up ADK simulation environment...");
          
          // Create mock ADK environment
          console.log('Setting up mock ADK environment');
          await pyodide.runPythonAsync(dedent(`
            # Mock implementation of Google ADK
            class Agent:
                def __init__(self, name="", model="", description="", instruction="", tools=None):
                    self.name = name
                    self.model = model
                    self.description = description
                    self.instruction = instruction
                    self.tools = tools or []
                
                def invoke(self, query):
                    return f"Agent {self.name} responding to: {query}\\nUsing model: {self.model}\\nTools: {', '.join([t.__name__ if hasattr(t, '__name__') else str(t) for t in (self.tools or [])])}\\n\\nINSTRUCTION: {self.instruction}"

            class LlmAgent(Agent):
                pass
                
            # Mock LLM models
            class LiteLlm:
                def __init__(self, model_name):
                    self.model_name = model_name
                    
                def __repr__(self):
                    return f"LiteLlm({self.model_name})"
                    
            # Mock Google Search tool
            def google_search(query):
                return {
                    "query": query,
                    "results": [
                        {"title": "Sample result 1", "url": "https://example.com/1", "snippet": "This is a sample search result."},
                        {"title": "Sample result 2", "url": "https://example.com/2", "snippet": "Another example search result."}
                    ]
                }
                    
            # Create module structure for imports
            class MockModule:
                def __getattr__(self, name):
                    return globals().get(name, self)
                    
            import sys
            sys.modules['google.adk.agents'] = MockModule()
            sys.modules['google.adk.tools'] = MockModule()
            sys.modules['google.adk.models.lite_llm'] = MockModule()
          `));
          
          console.log('Mock ADK environment setup complete');
          
        } catch (error: unknown) {
          console.error('Failed to initialize Python environment:', error);
          setOutput(`Failed to initialize Python environment: ${error instanceof Error ? error.message : String(error)}`);
          toast({
            title: "Setup failed",
            description: "Could not load Python environment in the browser.",
            variant: "destructive"
          });
          setIsRunning(false);
          setPyodideLoading(false);
          return;
        }
      }
      
      // Verify that pyodide is still available
      if (!pyodide) {
        console.error('Pyodide instance is null after setup');
        setOutput("Error: Python environment was not properly initialized.");
        toast({
          title: "Execution failed",
          description: "Python environment was not properly initialized.",
          variant: "destructive"
        });
        setIsRunning(false);
        setPyodideLoading(false);
        return;
      }
      
      console.log('Running code in Pyodide, instance available:', !!pyodide);
      setOutput("Running your agent code in simulation mode...");
      
      // Execute the code with output capturing
      console.log('Code length:', generatedCode.length, 'First 100 chars:', generatedCode.substring(0, 100));
      
      // Prepare Python code with proper indentation
      const pythonCode = 
`import io
        import sys
        import traceback
        
        # Capture print output
        output_buffer = io.StringIO()
        sys.stdout = output_buffer
        
        try:
          ${generatedCode}
          
          # Execute main function if present
          if 'main' in globals():
              main()
              
          output = output_buffer.getvalue()
          if not output:
              output = "Code executed successfully with no output."
              
          output += "\\n\\n--- SIMULATION NOTICE ---\\nThis is a simulated environment. For full ADK functionality, run this code in a proper Python environment."
        except Exception:
          output = "Error executing code:\\n" + traceback.format_exc()
        
output`;
      const pythonRunner = dedent(pythonCode);
      
      console.log('Running Python code with dedented structure');
      const result = await pyodide.runPythonAsync(pythonRunner);
      
      if (!isMounted.current) return;
      
      console.log('Code execution complete, result length:', result.length);
      setOutput(result);
      
      toast({
        title: "Demo execution complete",
        description: "Your code ran in the browser simulation environment.",
      });
      
    } catch (error: unknown) {
      if (!isMounted.current) return;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error running code:', error);
      setOutput(`Error: ${errorMessage}`);
      toast({
        title: "Execution failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      if (isMounted.current) {
        console.log('Code execution finished, clearing loading state');
      setIsRunning(false);
      setPyodideLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Google ADK Code</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <TabsList>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
              <TabsTrigger value="install">Installation</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCopyCode}
                title="Copy code to clipboard"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportCode}
                title="Download as Python file"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="code" className="h-full overflow-hidden">
              <div className="relative h-full overflow-hidden">
                <pre className="bg-black p-4 rounded-md text-sm overflow-auto h-full max-h-[60vh]">
                  <code className="text-green-400">{generatedCode}</code>
                </pre>
              </div>
            </TabsContent>
            
            <TabsContent value="output" className="h-full">
              <div className="bg-gray-900 p-4 rounded-md h-full overflow-auto">
                {output ? (
                  <pre className="text-gray-100 text-sm whitespace-pre-wrap">{output}</pre>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    Run the code to see output here
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="install" className="h-full overflow-hidden">
              <div className="p-4 space-y-4 overflow-auto h-full max-h-[60vh]">
                <h3 className="text-lg font-medium">Running Your Agent Code Locally</h3>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Step 1: Install Python</h4>
                  <p className="text-sm">Make sure you have Python 3.8 or newer installed. <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Download Python</a></p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Step 2: Install Google ADK</h4>
                  <p className="text-sm">Open a terminal or command prompt and run:</p>
                  <pre className="bg-gray-900 p-3 rounded text-sm text-white">pip install google-adk</pre>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Step 3: Download Your Code</h4>
                  <p className="text-sm">Click the "Download" button to save your code as a Python file.</p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Step 4: Run Your Agent</h4>
                  <p className="text-sm">Navigate to the directory where you saved your code and run:</p>
                  <pre className="bg-gray-900 p-3 rounded text-sm text-white">python agent_code.py</pre>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Step 5: Use the ADK Web Interface</h4>
                  <p className="text-sm">You can also use the Google ADK web interface to test and run your agent:</p>
                  <pre className="bg-gray-900 p-3 rounded text-sm text-white">adk web</pre>
                  <p className="text-sm">This will start the ADK web interface where you can interact with your agent through a browser.</p>
                </div>
                
                <div className="mt-6 p-3 bg-blue-50 text-blue-800 rounded-md">
                  <p className="font-medium">Google ADK Documentation</p>
                  <p className="text-sm">For more information about using the Google Agent Development Kit, visit the <a href="https://developers.google.com/adk/docs" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">official documentation</a>.</p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-xs text-muted-foreground">
            {pyodideLoading ? "Loading Python environment..." : ""}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="default" 
              onClick={handleRunCode}
              disabled={isRunning}
              className="bg-green-600 hover:bg-green-700"
            >
              {isRunning ? (
                <>Running...</>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Demo
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
        
        <div className="mt-2 p-3 bg-amber-50 text-amber-800 rounded-md text-xs">
          <p className="font-medium">Browser Demo Mode</p>
          <p>This runs a simplified simulation of the Google ADK in your browser. For production use, download the code and run it in a proper Python environment with the ADK installed.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Function to generate Google ADK Python code
const generateADKCode = (nodes: Node<BaseNodeData>[], edges: Edge[]): string => {
  console.log('Generating ADK code for', nodes.length, 'nodes and', edges.length, 'edges');
  
  const imports: string[] = [
    'from google.adk.agents import Agent, LlmAgent',
    'from google.adk.tools import google_search'
  ];
  
  let code = '';
  const agentVars: string[] = [];
  
  // Process each node
  nodes.forEach(node => {
    if (!node.data) return;
    
    const { type, label, description, instruction, modelType } = node.data;
    const varName = label.toLowerCase().replace(/\s+/g, '_');
    
    console.log('Processing node:', { type, label });
    
    if (type === 'agent') {
      imports.push('from google.adk.models.lite_llm import LiteLlm');
      
      let tools = 'None';
      
      // Find connected tools
      const connectedTools = edges
        .filter(edge => edge.source === node.id)
        .map(edge => {
          const targetNode = nodes.find(n => n.id === edge.target);
          return targetNode?.data?.label?.toLowerCase().replace(/\s+/g, '_') || '';
        })
        .filter(Boolean);
        
      if (connectedTools.length) {
        tools = `[${connectedTools.join(', ')}]`;
        console.log('Agent connected to tools:', connectedTools);
      }
      
      code += `\n# ${label} - ${description || 'Agent'}\n`;
      code += `${varName} = Agent(\n`;
      code += `    name="${varName}",\n`;
      code += `    model="gemini-2.0-flash",\n`;
      code += `    description="${description || ''}",\n`;
      code += `    instruction="${instruction || 'Respond to user queries.'}",\n`;
      code += `    tools=${tools}\n`;
      code += `)\n`;
      
      agentVars.push(varName);
    } 
    else if (type === 'tool') {
      code += `\n# ${label} Tool\n`;
      code += `def ${varName}(query: str) -> dict:\n`;
      code += `    """${description || 'Tool function'}\n`;
      code += `    \n`;
      code += `    Args:\n`;
      code += `        query: The user query\n`;
      code += `    \n`;
      code += `    Returns:\n`;
      code += `        dict: The result\n`;
      code += `    """\n`;
      code += `    # TODO: Implement ${label} functionality\n`;
      code += `    return {"status": "success", "result": f"Results for {query}"}\n`;
    }
    else if (type === 'model') {
      code += `\n# ${label} - ${description || 'LLM'}\n`;
      code += `${varName} = LiteLlm("${modelType || 'gemini-2.0-flash'}")\n`;
    }
  });
  
  // If we have agents, add example usage
  if (agentVars.length) {
    const primaryAgent = agentVars[0];
    
    code += `\n# Example usage\ndef main():\n`;
    code += `    # Initialize the agent\n`;
    code += `    result = ${primaryAgent}.invoke("What can you help me with?")\n`;
    code += `    print(result)\n\n`;
    code += `if __name__ == "__main__":\n`;
    code += `    main()\n`;
  }
  
  console.log('Code generation complete, total size:', imports.join('\n').length + code.length);
  return imports.join('\n') + '\n' + code;
};
