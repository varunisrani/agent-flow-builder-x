import { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  NodeTypes,
  Edge,
  addEdge,
  Connection,
  Panel,
  useReactFlow,
  BackgroundVariant,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PlusCircle, Zap, Code, Save, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

import { BaseNode, BaseNodeData } from './nodes/BaseNode';
import { CodeGenerationModal } from './CodeGenerationModal';
import { saveProjectNodesAndEdges } from '@/services/projectService';

// Fix the NodeTypes type
const nodeTypes: NodeTypes = {
  baseNode: BaseNode as any // Using "any" to bypass the TS error for now
};

interface FlowEditorProps {
  onNodeSelect: (node: Node<BaseNodeData> | null) => void;
  initialNodes?: Node<BaseNodeData>[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node<BaseNodeData>[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  projectId?: string;
}

// Define the default initial node if no nodes are provided
const defaultInitialNodes: Node<BaseNodeData>[] = [
  {
    id: '1',
    type: 'baseNode',
    data: { 
      label: 'Start',
      type: 'input',
      description: 'Initial input for your agent flow'
    },
    position: { x: 250, y: 5 },
    draggable: true
  }
];

const defaultInitialEdges: Edge[] = [];

export function FlowEditor({ 
  onNodeSelect, 
  initialNodes = defaultInitialNodes,
  initialEdges = defaultInitialEdges,
  onNodesChange: externalOnNodesChange,
  onEdgesChange: externalOnEdgesChange,
  projectId
}: FlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node<BaseNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [codeOutput, setCodeOutput] = useState<string>('');
  const reactFlowInstance = useReactFlow();
  const navigate = useNavigate();

  // Update internal state when external props change
  useEffect(() => {
    if (initialNodes?.length) {
      setNodes(initialNodes);
    }
  }, [initialNodes]);

  useEffect(() => {
    if (initialEdges?.length) {
      setEdges(initialEdges);
    }
  }, [initialEdges]);

  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updatedNodes = applyNodeChanges(changes, nodes) as Node<BaseNodeData>[];
      setNodes(updatedNodes);
      if (externalOnNodesChange) {
        externalOnNodesChange(updatedNodes);
      }
    },
    [nodes, externalOnNodesChange]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      setEdges(updatedEdges);
      if (externalOnEdgesChange) {
        externalOnEdgesChange(updatedEdges);
      }
    },
    [edges, externalOnEdgesChange]
  );
  
  const onConnect = useCallback<OnConnect>(
    (connection) => {
      const newEdges = addEdge(connection, edges);
      setEdges(newEdges);
      if (externalOnEdgesChange) {
        externalOnEdgesChange(newEdges);
      }
    },
    [edges, externalOnEdgesChange]
  );
  
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      
      if (!reactFlowBounds) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      const newNode: Node<BaseNodeData> = {
        id: `node_${Date.now()}`,
        type: 'baseNode',
        position,
        data: {
          label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          type: type as BaseNodeData['type'],
          description: ''
        },
      };

      const updatedNodes = [...nodes, newNode];
      setNodes(updatedNodes);
      
      if (externalOnNodesChange) {
        externalOnNodesChange(updatedNodes);
      }
      
      // Save to project if projectId is provided
      if (projectId) {
        saveProjectNodesAndEdges(projectId, updatedNodes, edges);
      }
    },
    [reactFlowInstance, nodes, edges, externalOnNodesChange, projectId]
  );
  
  const handleNodeClick = (event: React.MouseEvent, node: Node<BaseNodeData>) => {
    onNodeSelect(node);
  };
  
  const handlePaneClick = () => {
    onNodeSelect(null);
  };
  
  const handleGenerateCode = () => {
    // Generate Google ADK Python code
    const adkCode = generateADKCode(nodes, edges);
    setCodeOutput(adkCode);
    setCodeModalOpen(true);
  };

  const handleBackToProjects = () => {
    navigate('/projects');
  };

  const handleSaveWorkflow = () => {
    if (projectId) {
      saveProjectNodesAndEdges(projectId, nodes, edges);
      toast({
        title: "Workflow saved",
        description: "Your agent workflow has been saved successfully.",
      });
    } else {
      toast({
        title: "Error saving workflow",
        description: "No project ID found. Please try again.",
        variant: "destructive",
      });
    }
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

  return (
    <div className="h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        
        <Panel position="top-left" className="glass rounded-md p-2 m-4">
          <Button 
            className="flex items-center gap-2"
            variant="outline"
            onClick={handleBackToProjects}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Projects</span>
          </Button>
        </Panel>
        
        <Panel position="top-right" className="glass rounded-md p-2 m-4">
          <Button 
            className="flex items-center gap-2"
            variant="outline"
            onClick={handleSaveWorkflow}
          >
            <Save className="w-4 h-4" />
            <span>Save Workflow</span>
          </Button>
        </Panel>
        
        <Panel position="bottom-right" className="glass rounded-md p-2 m-4">
          <Button 
            onClick={handleGenerateCode} 
            className="flex items-center gap-2"
            variant="secondary"
          >
            <Code className="w-4 w-4" />
            <span>Generate Google ADK Code</span>
          </Button>
        </Panel>
        
        <Panel position="bottom-left" className="glass rounded-md p-2 m-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs">Use natural language builder for quick setup</span>
          </div>
        </Panel>
      </ReactFlow>
      
      <CodeGenerationModal 
        open={codeModalOpen} 
        onOpenChange={setCodeModalOpen} 
        nodes={nodes} 
        edges={edges} 
        customCode={codeOutput}
      />
    </div>
  );
}
