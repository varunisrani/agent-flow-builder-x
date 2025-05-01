
import { useState, useCallback } from 'react';
import { ReactFlowProvider, Node } from '@xyflow/react';
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
  const { toast } = useToast();
  
  const handleGenerateFromPrompt = (prompt: string) => {
    // In a real implementation, this would call an API to generate a flow
    toast({
      title: "Flow Generation Started",
      description: `Generating agent flow from: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
      duration: 5000,
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
            <FlowEditor onNodeSelect={setSelectedNode} />
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
