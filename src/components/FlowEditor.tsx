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
import { PlusCircle, Zap, Code, Save, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from './ui/button.js';
import { toast } from '../hooks/use-toast.js';
import { useNavigate } from 'react-router-dom';

import BaseNode, { BaseNodeData } from './nodes/BaseNode.js';
import { CodeGenerationModal } from './CodeGenerationModal.js';
import { saveProjectNodesAndEdges } from '@/services/projectService.js';
import { generateADKCode, MCPConfig } from '@/lib/codeGeneration';

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
  mcpConfig?: MCPConfig[];
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
  projectId,
  mcpConfig
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
    const adkCode = generateADKCode(nodes, edges, mcpConfig);
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
    <div className="h-full relative bg-gradient-to-br from-zinc-300/5 via-purple-400/5 to-transparent dark:from-zinc-300/2 dark:via-purple-400/5" ref={reactFlowWrapper}>
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
        className="bg-gradient-to-br from-zinc-300/3 via-purple-400/3 to-transparent dark:from-zinc-300/1 dark:via-purple-400/3"
      >
        <Controls 
          className="bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-xl border-[2px] border-black/5 dark:border-white/10 rounded-xl shadow-2xl hover:border-purple-500/30 dark:hover:border-purple-400/30 transition-all duration-300"
          position="bottom-right"
          style={{ right: 120, bottom: 24 }}
        />
        <MiniMap 
          className="bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-xl border-[2px] border-black/5 dark:border-white/10 rounded-xl shadow-2xl !bottom-24 !right-4 hover:border-purple-500/30 dark:hover:border-purple-400/30 transition-all duration-300"
          nodeColor="#a855f7"
          nodeStrokeWidth={2}
          zoomable
          pannable
        />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1.5} 
          color="#a855f7"
          className="opacity-20 dark:opacity-30"
        />
        
        {/* Back to Projects Panel */}
        <Panel position="top-left" className="m-4">
          <div className="bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-xl rounded-xl border-[2px] border-black/5 dark:border-white/10 p-3 shadow-2xl hover:border-purple-500/30 dark:hover:border-purple-400/30 transition-all duration-300 group">
            <Button 
              className="flex items-center gap-2 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 border-[2px] border-black/5 dark:border-white/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 text-gray-900 dark:text-white hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300"
              variant="outline"
              onClick={handleBackToProjects}
            >
              <ArrowLeft className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
              <span>Back to Projects</span>
            </Button>
          </div>
        </Panel>
        
        {/* Save Workflow Panel */}
        <Panel position="top-right" className="m-4">
          <div className="bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-xl rounded-xl border-[2px] border-black/5 dark:border-white/10 p-3 shadow-2xl hover:border-purple-500/30 dark:hover:border-purple-400/30 transition-all duration-300 group">
            <Button 
              className="flex items-center gap-2 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 border-[2px] border-black/5 dark:border-white/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 text-gray-900 dark:text-white hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300"
              variant="outline"
              onClick={handleSaveWorkflow}
            >
              <Save className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
              <span>Save Workflow</span>
            </Button>
          </div>
        </Panel>
        
        {/* Generate Code Panel */}
        <Panel position="bottom-right" className="m-4" style={{ bottom: 100 }}>
          <div className="bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-xl rounded-xl border-[2px] border-black/5 dark:border-white/10 p-3 shadow-2xl hover:border-purple-500/30 dark:hover:border-purple-400/30 transition-all duration-300 group">
            <span className="relative inline-block overflow-hidden rounded-xl p-[1px]">
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] group-hover:animate-[spin_1s_linear_infinite]" />
              <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-white dark:bg-gray-950 backdrop-blur-3xl">
                <Button
                  onClick={handleGenerateCode}
                  className="inline-flex rounded-xl text-center group items-center justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-0 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all duration-300 px-6 py-2.5 text-sm font-medium gap-2 hover:scale-105"
                >
                  <Code className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Generate Google ADK Code</span>
                </Button>
              </div>
            </span>
          </div>
        </Panel>
        
        {/* AI Assistant Tip Panel */}
        <Panel position="bottom-left" className="m-4">
          <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent dark:from-blue-400/10 dark:via-purple-400/10 backdrop-blur-xl rounded-xl border-[2px] border-blue-500/20 dark:border-blue-400/20 p-4 shadow-2xl hover:border-blue-500/40 dark:hover:border-blue-400/40 transition-all duration-300 group max-w-xs">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-transparent dark:from-blue-400/20 dark:via-purple-400/20 border border-blue-500/30 dark:border-blue-400/30 flex-shrink-0">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">AI Assistant Tip</p>
                <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed">
                  Use natural language builder for quick setup and intelligent suggestions
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
      
      <CodeGenerationModal
        open={codeModalOpen}
        onOpenChange={setCodeModalOpen}
        nodes={nodes}
        edges={edges}
        mcpConfig={mcpConfig}
      />
    </div>
  );
}
