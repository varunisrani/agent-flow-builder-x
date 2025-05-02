
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
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PlusCircle, Zap, Code, Save, ArrowLeft, Download, Share, Play, FlaskConical, Grid, Layers, X } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import BaseNode from './nodes/BaseNode';
import type { BaseNodeData } from './nodes/BaseNode';
import { CodeGenerationModal } from './CodeGenerationModal';
import { saveProjectNodesAndEdges } from '@/services/projectService';

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

// Toolbar buttons configuration
const toolbarButtons = [
  { icon: <Save />, label: "Save", action: "save" },
  { icon: <Code />, label: "Generate Code", action: "generate" },
  { icon: <Share />, label: "Share", action: "share" },
  { icon: <Download />, label: "Export", action: "export" },
  { icon: <Play />, label: "Run", action: "run" },
  { icon: <FlaskConical />, label: "Test", action: "test" },
];

// Define proper PanelPosition type to match what ReactFlow expects
type PanelPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

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
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
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

  const handleToolbarAction = (action: string) => {
    switch (action) {
      case 'save':
        handleSaveWorkflow();
        break;
      case 'generate':
        handleGenerateCode();
        break;
      case 'share':
        toast({
          title: "Share feature",
          description: "Coming soon! You'll be able to share your workflows with others.",
        });
        break;
      case 'export':
        const jsonData = JSON.stringify({ nodes, edges }, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'agent-flow.json';
        link.href = url;
        link.click();
        toast({
          title: "Exported successfully",
          description: "Your workflow has been exported as JSON.",
        });
        break;
      case 'run':
        toast({
          title: "Run feature",
          description: "Coming soon! You'll be able to run your agent directly from the editor.",
        });
        break;
      case 'test':
        toast({
          title: "Test feature",
          description: "Coming soon! You'll be able to test your agent with sample inputs.",
        });
        break;
      default:
        break;
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
    <div className="h-full relative" ref={reactFlowWrapper}>
      {/* Floating particles in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-premium-light rounded-full"
            style={{ 
              left: `${Math.random() * 100}%`, 
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.3,
              animation: `float ${Math.random() * 10 + 20}s infinite alternate ease-in-out`
            }}
          />
        ))}
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick as any} // This cast is needed to fix type issues
        onPaneClick={handlePaneClick}
        fitView
        className="flow-canvas"
      >
        <Controls className="premium-glass !bg-transparent" />
        <MiniMap className="premium-glass !bg-transparent" />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="rgba(155, 135, 245, 0.2)" />
        
        {/* Back button */}
        <Panel position="top-left" className="premium-glass rounded-md p-2 m-4">
          <Button 
            className="flex items-center gap-2 bg-transparent hover:bg-white/10"
            variant="ghost"
            onClick={handleBackToProjects}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Projects</span>
          </Button>
        </Panel>
        
        {/* Main toolbar */}
        <Panel position="top-center" className="m-4 flex justify-center">
          <motion.div 
            className="premium-glass rounded-full backdrop-blur-lg flex items-center px-2 border border-white/10"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full p-2 hover:bg-white/10 ${toolbarExpanded ? 'bg-white/10' : ''}`}
              onClick={() => setToolbarExpanded(!toolbarExpanded)}
            >
              {toolbarExpanded ? <X className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
            </Button>
            
            <AnimatePresence>
              {toolbarExpanded && (
                <motion.div 
                  className="flex items-center"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                >
                  {toolbarButtons.map((btn, index) => (
                    <motion.div
                      key={btn.action}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 mx-1 hover:bg-white/10"
                        onClick={() => handleToolbarAction(btn.action)}
                      >
                        {btn.icon}
                        <span className="text-xs">{btn.label}</span>
                      </Button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </Panel>
      
        <Panel position="bottom-left" className="premium-glass rounded-md p-2 m-4">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-full bg-premium/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-premium-light" />
            </div>
            <span className="text-xs">Use natural language builder for quick setup</span>
          </div>
        </Panel>
        
        {/* Node palette */}
        <Panel position="top-right" className="m-4">
          <motion.div 
            className="premium-glass rounded-lg p-4 border border-white/10 flex flex-col items-center gap-4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-xs font-medium mb-1">Add Nodes</div>
            {[
              { type: 'agent', label: 'Agent', color: 'bg-premium-light/20 text-premium-light' },
              { type: 'tool', label: 'Tool', color: 'bg-futuristic-blue/20 text-futuristic-blue' },
              { type: 'model', label: 'Model', color: 'bg-green-500/20 text-green-500' },
              { type: 'input', label: 'Input', color: 'bg-yellow-500/20 text-yellow-500' },
              { type: 'output', label: 'Output', color: 'bg-red-500/20 text-red-500' }
            ].map((nodeType) => (
              <div
                key={nodeType.type}
                className={`p-2 ${nodeType.color} rounded-md cursor-grab w-24 text-center text-sm hover:shadow-premium transition-all`}
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/reactflow', nodeType.type);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                draggable
              >
                {nodeType.label}
              </div>
            ))}
          </motion.div>
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
