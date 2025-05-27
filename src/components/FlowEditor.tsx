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
import { generateADKCode } from '@/lib/codeGeneration';

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
