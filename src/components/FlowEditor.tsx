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
  useNodesState,
  useEdgesState,
  Connection,
  Panel,
  useReactFlow,
  BackgroundVariant,
  OnConnect,
  NodeProps,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PlusCircle, Zap, Code } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from '@/hooks/use-toast';

import { BaseNode, BaseNodeData } from './nodes/BaseNode';
import { CodeGenerationModal } from './CodeGenerationModal';

const nodeTypes: NodeTypes = {
  baseNode: BaseNode as React.ComponentType<NodeProps>
};

interface FlowEditorProps {
  onNodeSelect: (node: Node<BaseNodeData> | null) => void;
  initialNodes?: Node<BaseNodeData>[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node<BaseNodeData>[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
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
  onEdgesChange: externalOnEdgesChange
}: FlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node<BaseNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const reactFlowInstance = useReactFlow();

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
    },
    [reactFlowInstance, nodes, externalOnNodesChange]
  );
  
  const handleNodeClick = (event: React.MouseEvent, node: Node<BaseNodeData>) => {
    onNodeSelect(node);
  };
  
  const handlePaneClick = () => {
    onNodeSelect(null);
  };
  
  const handleGenerateCode = () => {
    setCodeModalOpen(true);
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
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-primary" />
            <span className="text-xs">Drag nodes from sidebar to build your agent</span>
          </div>
        </Panel>
        
        <Panel position="bottom-right" className="glass rounded-md p-2 m-4">
          <Button 
            onClick={handleGenerateCode} 
            className="flex items-center gap-2"
            variant="secondary"
          >
            <Code className="w-4 h-4" />
            <span>Generate Code</span>
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
      />
    </div>
  );
}
