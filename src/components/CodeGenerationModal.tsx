
import { useState, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BaseNodeData } from './nodes/BaseNode';
import { Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CodeGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
}

export function CodeGenerationModal({
  open,
  onOpenChange,
  nodes,
  edges,
}: CodeGenerationModalProps) {
  const [activeTab, setActiveTab] = useState<string>('adk');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Generate code when the modal opens or when nodes/edges change
  useEffect(() => {
    if (open) {
      setLoading(true);
      
      // Generate code based on the flow
      const code = generateAgentCode(nodes, edges, activeTab);
      setGeneratedCode(code);
      
      setLoading(false);
    }
  }, [open, nodes, edges, activeTab]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Code copied!",
      description: "The generated code has been copied to your clipboard.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generated Agent Code</DialogTitle>
          <DialogDescription>
            This code represents the agent flow you've designed. You can copy and use it in Python environments.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="adk" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="adk">Google ADK</TabsTrigger>
            <TabsTrigger value="vertex">Vertex AI</TabsTrigger>
            <TabsTrigger value="custom">Custom Agent</TabsTrigger>
          </TabsList>
          
          <TabsContent value="adk" className="mt-4">
            <div className="relative">
              <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-md overflow-auto max-h-96">
                {loading ? "Generating code..." : generatedCode}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="vertex" className="mt-4">
            <div className="relative">
              <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-md overflow-auto max-h-96">
                {loading ? "Generating code..." : generateVertexCode(nodes, edges)}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="custom" className="mt-4">
            <div className="relative">
              <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-md overflow-auto max-h-96">
                {loading ? "Generating code..." : generateCustomAgentCode(nodes, edges)}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Code generation functions
function generateAgentCode(nodes: Node<BaseNodeData>[], edges: Edge[], type: string = 'adk'): string {
  // Find agent nodes
  const agentNodes = nodes.filter(node => node.data.type === 'agent');
  const modelNodes = nodes.filter(node => node.data.type === 'model');
  const toolNodes = nodes.filter(node => node.data.type === 'tool');
  const functionNodes = nodes.filter(node => node.data.type === 'function');
  
  let code = `from google.adk.agents import Agent\n`;
  
  // Import needed libraries
  if (toolNodes.length > 0) {
    code += `from google.adk.tools import google_search\n`;
  }
  
  if (functionNodes.length > 0) {
    code += `\n# Custom function definitions\n`;
    functionNodes.forEach(node => {
      code += `def ${node.data.label.toLowerCase().replace(/\s+/g, '_')}(input: str) -> dict:\n`;
      code += `    # Implementation for ${node.data.label}\n`;
      code += `    return {"status": "success", "result": f"Processed {input}"}\n\n`;
    });
  }
  
  // Generate agent code
  code += `\n# Create agent\n`;
  if (agentNodes.length > 0) {
    const mainAgent = agentNodes[0];
    const connectedModelId = edges.find(edge => edge.source === mainAgent.id)?.target || '';
    const connectedModel = nodes.find(node => node.id === connectedModelId);
    const modelName = connectedModel?.data?.modelType || 'gemini-2.0-flash';
    
    // Find connected tools
    const connectedToolIds = edges
      .filter(edge => edge.target === mainAgent.id)
      .map(edge => edge.source);
    
    const connectedTools = connectedToolIds.map(id => 
      nodes.find(node => node.id === id)
    ).filter(Boolean);
    
    const toolList = connectedTools.length > 0 
      ? `[${connectedTools.map(tool => tool?.data.label.toLowerCase().replace(/\s+/g, '_')).join(', ')}]` 
      : '[]';
    
    code += `${mainAgent.data.label.toLowerCase().replace(/\s+/g, '_')} = Agent(\n`;
    code += `    name="${mainAgent.data.label.toLowerCase().replace(/\s+/g, '_')}",\n`;
    code += `    model="${modelName}",\n`;
    code += `    description="${mainAgent.data.description || 'An AI agent'}",\n`;
    code += `    instruction="${mainAgent.data.instruction || 'I am a helpful assistant.'}",\n`;
    code += `    tools=${toolList}\n`;
    code += `)\n`;
    
    // Add usage example
    code += `\n# Example usage\n`;
    code += `response = ${mainAgent.data.label.toLowerCase().replace(/\s+/g, '_')}.generate("Hello, how can you help me today?")\n`;
    code += `print(response)\n`;
  } else {
    code += `# No agent nodes found in your flow. Add an agent node to generate code.\n`;
    code += `\n# Example agent code\n`;
    code += `example_agent = Agent(\n`;
    code += `    name="example_agent",\n`;
    code += `    model="gemini-2.0-flash",\n`;
    code += `    description="A helpful assistant agent that can answer questions.",\n`;
    code += `    instruction="I am a helpful assistant that provides accurate and detailed information.",\n`;
    code += `    tools=[]\n`;
    code += `)\n\n`;
    code += `# Example usage\n`;
    code += `response = example_agent.generate("Hello, how can you help me today?")\n`;
    code += `print(response)\n`;
  }
  
  return code;
}

function generateVertexCode(nodes: Node<BaseNodeData>[], edges: Edge[]): string {
  // Generate Vertex AI code
  let code = `from google.cloud import aiplatform\n\n`;
  code += `# Initialize the Vertex AI SDK\n`;
  code += `aiplatform.init(project="your-project-id", location="your-location")\n\n`;
  
  // Find agent nodes
  const agentNodes = nodes.filter(node => node.data.type === 'agent');
  
  if (agentNodes.length > 0) {
    const mainAgent = agentNodes[0];
    
    code += `# Create an agent\n`;
    code += `agent = aiplatform.Agent.create(\n`;
    code += `    display_name="${mainAgent.data.label}",\n`;
    code += `    model="gemini-pro"\n`;
    code += `)\n\n`;
    
    code += `# Interact with the agent\n`;
    code += `response = agent.chat("Hello, how can I assist you today?")\n`;
    code += `print(response)\n`;
  } else {
    code += `# No agent nodes found in your flow. Add an agent node to generate code.\n`;
    code += `\n# Example agent code\n`;
    code += `agent = aiplatform.Agent.create(\n`;
    code += `    display_name="My Vertex AI Agent",\n`;
    code += `    model="gemini-pro"\n`;
    code += `)\n\n`;
    code += `# Interact with the agent\n`;
    code += `response = agent.chat("Hello, how can I assist you today?")\n`;
    code += `print(response)\n`;
  }
  
  return code;
}

function generateCustomAgentCode(nodes: Node<BaseNodeData>[], edges: Edge[]): string {
  // Generate code for a custom agent using tools
  const functionNodes = nodes.filter(node => node.data.type === 'function' || node.data.type === 'tool');
  const agentNodes = nodes.filter(node => node.data.type === 'agent');
  
  let code = `from google.adk.agents import Agent\n\n`;
  
  // Generate function definitions
  if (functionNodes.length > 0) {
    code += `# Function definitions\n`;
    functionNodes.forEach(node => {
      const functionName = node.data.label.toLowerCase().replace(/\s+/g, '_');
      
      code += `def ${functionName}(city: str) -> dict:\n`;
      code += `    # This is a mock implementation for ${node.data.label}\n`;
      code += `    if city.lower() == "new york":\n`;
      code += `        return {"status": "success",\n`;
      code += `                "report": "The result for ${node.data.label} function call."}\n`;
      code += `    else:\n`;
      code += `        return {"status": "error",\n`;
      code += `                "error_message": f"Information for '{city}' is not available."}\n\n`;
    });
  }
  
  // Generate agent
  if (agentNodes.length > 0) {
    const mainAgent = agentNodes[0];
    const toolStrings = functionNodes.map(node => node.data.label.toLowerCase().replace(/\s+/g, '_'));
    
    code += `# Create agent\n`;
    code += `root_agent = Agent(\n`;
    code += `    name="${mainAgent.data.label.toLowerCase().replace(/\s+/g, '_')}",\n`;
    code += `    model="gemini-2.0-flash",\n`;
    code += `    description="${mainAgent.data.description || 'An agent that helps with various tasks.'}",\n`;
    code += `    instruction="${mainAgent.data.instruction || 'I can help answer your questions.'}",\n`;
    
    if (toolStrings.length > 0) {
      code += `    tools=[${toolStrings.join(', ')}]\n`;
    } else {
      code += `    tools=[]\n`;
    }
    
    code += `)\n\n`;
    code += `# Example usage\n`;
    code += `response = root_agent.generate("How can you help me today?")\n`;
    code += `print(response)\n`;
  } else {
    code += `# No agent nodes found in your flow. Add an agent node to generate code.\n`;
  }
  
  return code;
}
