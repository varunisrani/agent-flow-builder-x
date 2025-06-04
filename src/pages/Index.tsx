import { useState, useCallback, useEffect } from 'react';
import { ReactFlowProvider, Node, Edge } from '@xyflow/react';
import { Bot, MessageSquare, PanelLeft, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.js';
import { useNavigate } from 'react-router-dom';

import { Navbar } from '@/components/Navbar.js';
import { Sidebar } from '@/components/Sidebar.js';
import { FlowEditor } from '@/components/FlowEditor.js';
import { PropertiesPanel } from '@/components/PropertiesPanel.js';
import { NaturalLanguageInput } from '@/components/NaturalLanguageInput.js';
import { TestPanel } from '@/components/TestPanel.js';
import { WelcomeModal } from '@/components/WelcomeModal.js';
import { Button } from '@/components/ui/button.js';
import { BaseNodeData } from '@/components/nodes/BaseNode.js';
import { getCurrentProject, saveProjectNodesAndEdges, Project } from '@/services/projectService.js';
import { MCPConfig } from '@/lib/codeGeneration';

const transformNodes = (nodes: Node<BaseNodeData>[]) => {
  return nodes.map(node => ({
    ...node,
    data: { ...node.data, id: node.id }
  }));
};

const Index = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [nlInputExpanded, setNlInputExpanded] = useState(false);
  const [testPanelVisible, setTestPanelVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node<BaseNodeData> | null>(null);
  const [nodes, setNodes] = useState<Node<BaseNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mcpConfig, setMcpConfig] = useState<MCPConfig[] | undefined>(undefined);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Load the current project on mount
  useEffect(() => {
    const project = getCurrentProject();
    
    if (!project) {
      // If no project is selected, redirect to projects page
      navigate('/projects');
      return;
    }
    
    setCurrentProject(project);
    
    // Set nodes and edges from the project
    if (project.nodes && project.nodes.length > 0) {
      setNodes(project.nodes);
    }
    
    if (project.edges && project.edges.length > 0) {
      setEdges(project.edges);
    }
  }, [navigate]);
  
  // Save nodes and edges to the current project whenever they change
  useEffect(() => {
    if (currentProject?.id && (nodes.length > 0 || edges.length > 0)) {
      saveProjectNodesAndEdges(currentProject.id, transformNodes(nodes), edges);
    }
  }, [nodes, edges, currentProject]);
  
  const handleGenerateFromPrompt = (
    prompt: string,
    generatedNodes: Node<BaseNodeData>[],
    generatedEdges: Edge[],
    mcpConfigs?: MCPConfig[]
  ) => {
    // Update flow with generated nodes and edges
    setNodes(generatedNodes);
    setEdges(generatedEdges);
    setMcpConfig(mcpConfigs);
    
    // Save to the current project
    if (currentProject?.id) {
      saveProjectNodesAndEdges(currentProject.id, transformNodes(generatedNodes), generatedEdges);
    }
    
    // Close NL input after generation
    setNlInputExpanded(false);
    
    toast({
      title: "Flow Generated Successfully",
      description: `Created flow from: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
      duration: 3000,
    });
  };
  
  const handleUpdateNode = useCallback((id: string, data: Partial<BaseNodeData>) => {
    setSelectedNode(prevNode => {
      if (prevNode && prevNode.id === id) {
        return {
          ...prevNode,
          data: { ...prevNode.data, ...data }
        };
      }
      return prevNode;
    });
    
    // Also update the node in the nodes array
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === id 
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  }, []);

  const handleSwitchProject = () => {
    navigate('/projects');
  };

  if (!currentProject) {
    return null; // Will redirect in the useEffect
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Navbar projectName={currentProject.name} onSwitchProject={handleSwitchProject} />
      
      <div className="flex-1 flex">
        <Sidebar 
          expanded={sidebarExpanded} 
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
        
        <div className="flex-1 relative">
          <ReactFlowProvider>
            <FlowEditor
              onNodeSelect={setSelectedNode}
              initialNodes={nodes}
              initialEdges={edges}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
              projectId={currentProject.id}
              mcpConfig={mcpConfig}
            />
          </ReactFlowProvider>
          
          <div className="absolute top-4 right-4 flex space-x-2">
            <Button 
              className="glass-card p-2 hover:border-primary/50 transition-colors"
              onClick={() => setTestPanelVisible(!testPanelVisible)}
              title="Test Agent"
              variant="ghost"
              size="icon"
            >
              <MessageSquare className="w-5 h-5 text-primary" />
            </Button>
          </div>
        </div>
        
        <PropertiesPanel 
          selectedNode={selectedNode} 
          onClose={() => setSelectedNode(null)}
          onUpdateNode={handleUpdateNode}
        />
        
        <TestPanel 
          visible={testPanelVisible}
          onClose={() => setTestPanelVisible(false)}
        />
      </div>
      
      <NaturalLanguageInput
        expanded={nlInputExpanded}
        onToggle={() => setNlInputExpanded(!nlInputExpanded)}
        onGenerate={handleGenerateFromPrompt}
      />
    </div>
  );
};

export default Index;
