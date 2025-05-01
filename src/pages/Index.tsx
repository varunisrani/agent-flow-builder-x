import { useState, useCallback } from 'react';
import { ReactFlowProvider, Node, Edge } from '@xyflow/react';
import { Bot, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { FlowEditor } from '@/components/FlowEditor';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { NaturalLanguageInput } from '@/components/NaturalLanguageInput';
import { TestPanel } from '@/components/TestPanel';
import { WelcomeModal } from '@/components/WelcomeModal';
import { BaseNodeData } from '@/components/nodes/BaseNode';

const Index = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [nlInputExpanded, setNlInputExpanded] = useState(false);
  const [testPanelVisible, setTestPanelVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node<BaseNodeData> | null>(null);
  const [nodes, setNodes] = useState<Node<BaseNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const { toast } = useToast();
  
  const handleGenerateFromPrompt = (prompt: string, generatedNodes: Node<BaseNodeData>[], generatedEdges: Edge[]) => {
    // Update flow with generated nodes and edges
    setNodes(generatedNodes);
    setEdges(generatedEdges);
    
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

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Navbar />
      
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
            />
          </ReactFlowProvider>
          
          <div className="absolute top-4 right-4 flex space-x-2">
            <button 
              className="glass-card p-2 hover:border-primary/50 transition-colors"
              onClick={() => setTestPanelVisible(!testPanelVisible)}
              title="Test Agent"
            >
              <MessageSquare className="w-5 h-5 text-primary" />
            </button>
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
      
      <WelcomeModal />
    </div>
  );
};

export default Index;
