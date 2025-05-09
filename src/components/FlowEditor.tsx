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
  EdgeChange,
  NodeMouseHandler
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PlusCircle, Zap, Code, Save, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button.js';
import { toast } from '../hooks/use-toast.js';
import { useNavigate } from 'react-router-dom';

import BaseNode, { BaseNodeData } from './nodes/BaseNode.js';
import { CodeGenerationModal } from './CodeGenerationModal.js';
import { saveProjectNodesAndEdges } from '@/services/projectService.js';

// Fix the NodeTypes type
const nodeTypes: NodeTypes = {
  baseNode: BaseNode
};

interface FlowEditorProps {
  onNodeSelect: (node: Node<BaseNodeData> | null) => void;
  initialNodes?: Node<BaseNodeData>[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node<BaseNodeData>[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  projectId?: string;
}

// Add this helper function
const transformNodesForSave = (nodes: Node<BaseNodeData>[]) => {
  return nodes.map(node => ({
    ...node,
    data: { ...node.data, id: node.id }
  }));
};

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
      // Need to cast the result of applyNodeChanges to fix type issues
      const updatedNodes = applyNodeChanges(changes, nodes) as unknown as Node<BaseNodeData>[];
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
        saveProjectNodesAndEdges(projectId, transformNodesForSave(updatedNodes), edges);
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
      saveProjectNodesAndEdges(projectId, transformNodesForSave(nodes), edges);
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
  
  // Function to generate Google ADK code
  const generateADKCode = (nodes: Node<BaseNodeData>[], edges: Edge[]): string => {
    const imports: string[] = [
      'from google.adk.agents import Agent, LlmAgent',
      'from google.adk.tools import google_search'
    ];
    
    // Add MCP imports if any MCP nodes are present
    if (nodes.some(node => node.data?.type.startsWith('mcp-'))) {
      imports.push('from google.adk.mcp.mcp_client import McpClient');
      imports.push('from google.adk.mcp.mcp_server import McpServer');
    }
    
    let code = '';
    const agentVars: string[] = [];
    const mcpClientVars: string[] = [];
    const mcpServerVars: string[] = [];
    
    // Process each node
    nodes.forEach(node => {
      if (!node.data) return;
      
      const { type, label, description, instruction, modelType, mcpUrl, mcpToolId } = node.data;
      const varName = label.toLowerCase().replace(/\s+/g, '_');
      
      if (type === 'agent') {
        imports.push('from google.adk.models.lite_llm import LiteLlm');
        
        let tools = 'None';
        
        // Find connected tools (including MCP tools)
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
      else if (type === 'mcp-client') {
        code += `\n# ${label} - MCP Client\n`;
        code += `${varName} = McpClient(\n`;
        code += `    name="${varName}",\n`;
        code += `    server_url="${mcpUrl || 'http://localhost:8080'}"\n`;
        code += `)\n`;
        
        mcpClientVars.push(varName);
      }
      else if (type === 'mcp-server') {
        code += `\n# ${label} - MCP Server\n`;
        code += `${varName} = McpServer(\n`;
        code += `    name="${varName}",\n`;
        code += `    host="0.0.0.0",\n`;
        code += `    port=8080\n`;
        code += `)\n`;
        
        // Find connected tools to expose via MCP
        const connectedTools = edges
          .filter(edge => edge.source === node.id)
          .map(edge => {
            const targetNode = nodes.find(n => n.id === edge.target);
            return targetNode?.data?.label?.toLowerCase().replace(/\s+/g, '_') || '';
          })
          .filter(Boolean);
          
        if (connectedTools.length) {
          connectedTools.forEach(tool => {
            code += `${varName}.register_tool(${tool})\n`;
          });
        }
        
        mcpServerVars.push(varName);
      }
      else if (type === 'mcp-tool') {
        code += `\n# ${label} - MCP Tool\n`;
        code += `${varName} = ${mcpClientVars[0] || 'mcp_client'}.get_tool("${mcpToolId || label}")\n`;
      }
    });
    
    // If we have agents, add example usage
    if (agentVars.length) {
      const primaryAgent = agentVars[0];
      
      code += `\n# Example usage\ndef main():\n`;
      code += `    # Initialize the agent\n`;
      code += `    result = ${primaryAgent}.invoke("What can you help me with?")\n`;
      code += `    print(result)\n\n`;
      
      // Add MCP server start if any exist
      if (mcpServerVars.length) {
        code += `    # Start MCP server\n`;
        code += `    ${mcpServerVars[0]}.start()\n\n`;
      }
      
      code += `if __name__ == "__main__":\n`;
      code += `    main()\n`;
      
      // Export the primary agent as root_agent for __init__.py import
      code += `\n# Export the primary agent as root_agent for __init__.py import\nroot_agent = ${primaryAgent}\n`;
    }
    
    return imports.join('\n') + '\n' + code;
  };

  return (
    <div className="h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick as NodeMouseHandler}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        className="bg-background"
      >
        <Controls 
          className="bg-card border border-border rounded-lg shadow-lg"
          position="bottom-right"
          style={{ right: 120, bottom: 24 }}
        />
        <MiniMap 
          className="bg-card border border-border rounded-lg shadow-lg !bottom-24 !right-4"
          nodeColor="#aaa"
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={16} 
          size={1} 
          color="#666"
        />
        
        <Panel position="top-left" className="glass rounded-md p-2 m-4 bg-card/80 backdrop-blur border border-border shadow-md">
          <Button 
            className="flex items-center gap-2"
            variant="outline"
            onClick={handleBackToProjects}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Projects</span>
          </Button>
        </Panel>
        
        <Panel position="top-right" className="glass rounded-md p-2 m-4 bg-card/80 backdrop-blur border border-border shadow-md">
          <Button 
            className="flex items-center gap-2"
            variant="outline"
            onClick={handleSaveWorkflow}
          >
            <Save className="w-4 h-4" />
            <span>Save Workflow</span>
          </Button>
        </Panel>
        
        <Panel position="bottom-right" className="glass rounded-md p-2 m-4 bg-card/80 backdrop-blur border border-border shadow-md" style={{ bottom: 100 }}>
          <Button 
            onClick={handleGenerateCode} 
            className="flex items-center gap-2"
            variant="secondary"
          >
            <Code className="w-4 w-4" />
            <span>Generate Google ADK Code</span>
          </Button>
        </Panel>
        
        <Panel position="bottom-left" className="glass rounded-md p-2 m-4 bg-card/80 backdrop-blur border border-border shadow-md">
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
      />
    </div>
  );
}
