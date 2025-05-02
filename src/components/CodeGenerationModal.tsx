
import React from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from './nodes/BaseNode';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  
  const generatedCode = customCode || generateADKCode(nodes, edges);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Code copied",
      description: "The generated code has been copied to your clipboard.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generated Google ADK Code</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Button
            size="icon"
            variant="outline"
            className="absolute right-2 top-2"
            onClick={handleCopyCode}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <pre className="bg-black p-4 rounded-md text-sm overflow-x-auto">
            <code className="text-green-400">{generatedCode}</code>
          </pre>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
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
