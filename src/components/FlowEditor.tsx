
import { useCallback, useState, useRef } from 'react';
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
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PlusCircle, Zap } from 'lucide-react';

import { BaseNode, BaseNodeData } from './nodes/BaseNode';

const nodeTypes: NodeTypes = {
  baseNode: BaseNode
};

interface FlowEditorProps {
  onNodeSelect: (node: Node<BaseNodeData> | null) => void;
}

const initialNodes: Node<BaseNodeData>[] = [
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

const initialEdges: Edge[] = [];

export function FlowEditor({ onNodeSelect }: FlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowInstance = useReactFlow();
  
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
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

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      const newNode = {
        id: `node_${Date.now()}`,
        type: 'baseNode',
        position,
        draggable: true,
        data: {
          label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          type: type as BaseNodeData['type'],
          description: ''
        },
      } as Node<BaseNodeData>;

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes]
  );
  
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    onNodeSelect(node as Node<BaseNodeData>);
  };
  
  const handlePaneClick = () => {
    onNodeSelect(null);
  };

  const handleUpdateNode = useCallback(
    (id: string, data: Partial<BaseNodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, ...data } as BaseNodeData };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  return (
    <div className="h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        draggable={true}
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
        
        <Panel position="bottom-left" className="glass rounded-md p-2 m-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs">Use natural language builder for quick setup</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
