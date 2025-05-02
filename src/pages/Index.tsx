
import { useState, useCallback, useEffect } from 'react';
import { ReactFlowProvider, Node, Edge } from '@xyflow/react';
import { Bot, MessageSquare, PanelLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { FlowEditor } from '@/components/FlowEditor';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { NaturalLanguageInput } from '@/components/NaturalLanguageInput';
import { TestPanel } from '@/components/TestPanel';
import { WelcomeModal } from '@/components/WelcomeModal';
import { Button } from '@/components/ui/button';
import { BaseNodeData } from '@/components/nodes/BaseNode';
import { getCurrentProject, saveProjectNodesAndEdges } from '@/services/projectService';

const Index = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [nlInputExpanded, setNlInputExpanded] = useState(false);
  const [testPanelVisible, setTestPanelVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node<BaseNodeData> | null>(null);
  const [nodes, setNodes] = useState<Node<BaseNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [currentProject, setCurrentProject] = useState<any>(null);
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
      saveProjectNodesAndEdges(currentProject.id, nodes, edges);
    }
  }, [nodes, edges, currentProject]);
  
  const handleGenerateFromPrompt = (prompt: string, generatedNodes: Node<BaseNodeData>[], generatedEdges: Edge[]) => {
    // Update flow with generated nodes and edges
    setNodes(generatedNodes);
    setEdges(generatedEdges);
    
    // Save to the current project
    if (currentProject?.id) {
      saveProjectNodesAndEdges(currentProject.id, generatedNodes, generatedEdges);
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
