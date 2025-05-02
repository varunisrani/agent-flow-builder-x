
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from './nodes/BaseNode';
import { Copy, Download, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

export interface CodeGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
  customCode?: string;
}

export const CodeGenerationModal: React.FC<CodeGenerationModalProps> = ({ 
  open, 
  onOpenChange,
  nodes,
  edges,
  customCode
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('code');
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [pyodideInstance, setPyodideInstance] = useState<any>(null);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  
  const generatedCode = customCode || generateADKCode(nodes, edges);

  // Clean up Pyodide when modal closes
  useEffect(() => {
    return () => {
      if (pyodideInstance) {
        // Reset Pyodide state when modal closes
        setPyodideInstance(null);
      }
    };
  }, [open, pyodideInstance]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Code copied",
      description: "The generated code has been copied to your clipboard.",
    });
  };

  const handleExportCode = () => {
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
    
    try {
      setIsRunning(true);
      setActiveTab('output');
      
      if (!pyodideInstance) {
        setPyodideLoading(true);
        setOutput("Loading Python environment (this may take a minute)...");
        
        try {
          // Dynamic import to reduce initial load time
          const { loadPyodide } = await import("pyodide");
          
          const pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
          });
          
          setPyodideInstance(pyodide);
          setOutput("Setting up ADK simulation environment...");
          
          // Create mock ADK environment
          await pyodide.runPythonAsync(`
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
          `);
          
        } catch (error: any) {
          setOutput(`Failed to initialize Python environment: ${error.message}`);
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
      
      setOutput("Running your agent code in simulation mode...");
      
      // Execute the code with output capturing
      const result = await pyodideInstance.runPythonAsync(`
        import io
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
        
        output
      `);
      
      setOutput(result);
      
      toast({
        title: "Demo execution complete",
        description: "Your code ran in the browser simulation environment.",
      });
      
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
      toast({
        title: "Execution failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setPyodideLoading(false);
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
            <TabsContent value="code" className="h-full">
              <div className="relative h-full">
                <pre className="bg-black p-4 rounded-md text-sm overflow-auto h-full">
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
            
            <TabsContent value="install" className="h-full">
              <div className="p-4 space-y-4 overflow-auto h-full">
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
  let imports: string[] = [
    'from google.adk.agents import Agent, LlmAgent',
    'from google.adk.tools import google_search'
  ];
  
  let code = '';
  let agentVars: string[] = [];
  
  // Process each node
  nodes.forEach(node => {
    if (!node.data) return;
    
    const { type, label, description, instruction, modelType } = node.data;
    const varName = label.toLowerCase().replace(/\s+/g, '_');
    
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
  
  return imports.join('\n') + '\n' + code;
};
