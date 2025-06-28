import { useState, useCallback, useEffect } from 'react';
import { ReactFlowProvider, Node, Edge } from '@xyflow/react';
import { Bot, MessageSquare, PanelLeft, ArrowLeft, Sparkles, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.js';
import { useNavigate } from 'react-router-dom';

import { Navbar } from '@/components/Navbar.js';
import { Sidebar } from '@/components/Sidebar.js';
import { FlowEditor } from '@/components/FlowEditor.js';
import { PropertiesPanel } from '@/components/PropertiesPanel.js';
import { NaturalLanguageInput } from '@/components/NaturalLanguageInput.js';
import { TestPanel } from '@/components/TestPanel.js';
import { WelcomeModal } from '@/components/WelcomeModal.js';
import { OnboardingOverlay } from '@/components/OnboardingOverlay.js';
import { InteractiveOnboarding } from '@/components/InteractiveOnboarding.js';
import { TemplateLibrary } from '@/components/TemplateLibrary.js';
import { QuickStartWizard } from '@/components/QuickStartWizard.js';
import { InlineAnalytics } from '@/components/InlineAnalytics.js';
import { ComponentErrorBoundary } from '@/components/ErrorBoundary.js';
import { RecoveryDialog, useRecoveryCheck } from '@/components/RecoveryDialog.js';
import { Button } from '@/components/ui/button.js';
import { BaseNodeData } from '@/components/nodes/BaseNode.js';
import { getCurrentProject, saveProjectNodesAndEdges, Project } from '@/services/projectService.js';
import { useAutoSave } from '@/hooks/useAutoSave.js';
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showInteractiveOnboarding, setShowInteractiveOnboarding] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showQuickStartWizard, setShowQuickStartWizard] = useState(false);
  const [historyControls, setHistoryControls] = useState<{
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
    historyLength: number;
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Recovery functionality
  const { hasRecovery, showDialog: showRecoveryDialog, setShowDialog: setShowRecoveryDialog } = useRecoveryCheck(currentProject?.id || '');
  
  // Auto-save functionality
  const autoSave = useAutoSave(
    currentProject?.id || '',
    nodes,
    edges,
    mcpConfig,
    async (projectId, nodes, edges) => {
      await saveProjectNodesAndEdges(projectId, transformNodes(nodes), edges);
    },
    {
      debounceMs: 2000,
      enableRecovery: true,
      onSaveSuccess: () => {
        // Optional: show subtle save indicator
      },
      onSaveError: (error) => {
        toast({
          title: "Auto-save failed",
          description: "Your changes may not be saved. Please save manually.",
          variant: "destructive",
        });
      }
    }
  );
  
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

    // Check if this is a new user and show interactive onboarding
    const hasSeenOnboarding = localStorage.getItem('cogentx-onboarding-complete');
    if (!hasSeenOnboarding && project.nodes.length === 0) {
      setShowInteractiveOnboarding(true);
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

  const handleTemplateSelect = (
    templateNodes: Node<BaseNodeData>[],
    templateEdges: Edge[],
    templateMcpConfig?: MCPConfig[]
  ) => {
    setNodes(templateNodes);
    setEdges(templateEdges);
    setMcpConfig(templateMcpConfig);
    
    // Save to the current project
    if (currentProject?.id) {
      saveProjectNodesAndEdges(currentProject.id, transformNodes(templateNodes), templateEdges);
    }
    
    toast({
      title: "Template Applied Successfully",
      description: "Your agent flow has been created from the template",
      duration: 3000,
    });
  };

  const handleQuickStartComplete = (
    wizardNodes: Node<BaseNodeData>[],
    wizardEdges: Edge[],
    wizardMcpConfig?: MCPConfig[]
  ) => {
    setNodes(wizardNodes);
    setEdges(wizardEdges);
    setMcpConfig(wizardMcpConfig);
    
    // Save to the current project
    if (currentProject?.id) {
      saveProjectNodesAndEdges(currentProject.id, transformNodes(wizardNodes), wizardEdges);
    }
    
    toast({
      title: "Agent Created Successfully",
      description: "Your AI agent is ready to use!",
      duration: 3000,
    });
  };

  const handleInteractiveOnboardingNodeCreate = (type: string, position: { x: number; y: number }) => {
    // Create a new node for the interactive tutorial
    const newNode: Node<BaseNodeData> = {
      id: `${type}-${Date.now()}`,
      type: 'baseNode',
      position,
      data: {
        id: `${type}-${Date.now()}`,
        type: type as any,
        label: type === 'agent' ? 'My First Agent' : type === 'input' ? 'User Input' : type.charAt(0).toUpperCase() + type.slice(1),
        description: type === 'agent' ? 'A helpful AI assistant' : type === 'input' ? 'Input from user' : `${type} component`
      }
    };

    setNodes(prevNodes => [...prevNodes, newNode]);
    
    // Save to the current project
    if (currentProject?.id) {
      const updatedNodes = [...nodes, newNode];
      saveProjectNodesAndEdges(currentProject.id, transformNodes(updatedNodes), edges);
    }
  };

  const handleInteractiveOnboardingNodeSelect = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
    }
  };

  const handleRecoveryRestore = (recoveredNodes: Node<BaseNodeData>[], recoveredEdges: Edge[], recoveredMcpConfig?: MCPConfig[]) => {
    setNodes(recoveredNodes);
    setEdges(recoveredEdges);
    if (recoveredMcpConfig) {
      setMcpConfig(recoveredMcpConfig);
    }
    
    toast({
      title: "Work Recovered Successfully",
      description: "Your previous work has been restored.",
      duration: 3000,
    });
  };

  const handleRecoveryDiscard = () => {
    toast({
      title: "Recovery Data Discarded",
      description: "Previous work data has been cleared.",
      duration: 3000,
    });
  };

  if (!currentProject) {
    return null; // Will redirect in the useEffect
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0b1e] text-white overflow-hidden">
      <Navbar 
        projectName={currentProject.name} 
        onSwitchProject={handleSwitchProject}
        canUndo={historyControls?.canUndo || false}
        canRedo={historyControls?.canRedo || false}
        onUndo={historyControls?.undo}
        onRedo={historyControls?.redo}
        historyLength={historyControls?.historyLength || 0}
      />
      
      <div className="flex-1 flex">
        <Sidebar 
          expanded={sidebarExpanded} 
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
        
        <div className="flex-1 relative">
          <ComponentErrorBoundary 
            componentName="FlowEditor"
            fallback={
              <div className="h-full flex items-center justify-center bg-gradient-to-br from-red-500/5 via-orange-500/5 to-transparent">
                <div className="text-center p-8">
                  <div className="text-red-400 mb-4">⚠️ Flow Editor Error</div>
                  <p className="text-gray-300 mb-4">The flow editor encountered an issue.</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors"
                  >
                    Reload Editor
                  </button>
                </div>
              </div>
            }
          >
            <ReactFlowProvider>
              <FlowEditor
                onNodeSelect={setSelectedNode}
                initialNodes={nodes}
                initialEdges={edges}
                onNodesChange={setNodes}
                onEdgesChange={setEdges}
                projectId={currentProject.id}
                mcpConfig={mcpConfig}
                onHistoryChange={setHistoryControls}
              />
            </ReactFlowProvider>
          </ComponentErrorBoundary>
          
          {/* Enhanced empty state with multiple options */}
          {nodes.length === 0 && !showOnboarding && !showInteractiveOnboarding && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center p-8 bg-gradient-to-br from-zinc-300/5 via-purple-400/10 to-transparent backdrop-blur-xl rounded-2xl border-[2px] border-white/10 shadow-2xl max-w-2xl pointer-events-auto">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-tr from-purple-400/20 via-orange-200/20 to-transparent border border-purple-400/30 rounded-2xl flex items-center justify-center">
                  <Bot className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-orange-200 mb-3">
                  Ready to build your first AI agent?
                </h3>
                <p className="text-gray-300 mb-8 leading-relaxed text-lg">
                  Choose how you'd like to get started with your agent creation journey
                </p>
                
                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Quick Start Wizard */}
                  <div 
                    onClick={() => setShowQuickStartWizard(true)}
                    className="p-4 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-transparent border border-purple-400/20 rounded-xl cursor-pointer hover:border-purple-400/40 hover:scale-105 transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent border border-purple-400/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Zap className="w-6 h-6 text-purple-400" />
                    </div>
                    <h4 className="font-semibold text-white mb-2">Quick Start</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      5-step wizard to create your first agent
                    </p>
                  </div>

                  {/* Template Library */}
                  <div 
                    onClick={() => setShowTemplateLibrary(true)}
                    className="p-4 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent border border-blue-400/20 rounded-xl cursor-pointer hover:border-blue-400/40 hover:scale-105 transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-transparent border border-blue-400/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="w-6 h-6 text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-white mb-2">Templates</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Pre-built agents for common use cases
                    </p>
                  </div>

                  {/* Natural Language */}
                  <div 
                    onClick={() => setNlInputExpanded(true)}
                    className="p-4 bg-gradient-to-br from-green-500/10 via-blue-500/10 to-transparent border border-green-400/20 rounded-xl cursor-pointer hover:border-green-400/40 hover:scale-105 transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-tr from-green-500/20 via-blue-500/20 to-transparent border border-green-400/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-6 h-6 text-green-400" />
                    </div>
                    <h4 className="font-semibold text-white mb-2">Describe</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Tell us what you want in plain English
                    </p>
                  </div>
                </div>

                {/* Secondary action */}
                <p className="text-gray-400 text-sm">
                  Or drag components from the sidebar to start building manually
                </p>
              </div>
            </div>
          )}
          
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
        
        <ComponentErrorBoundary 
          componentName="PropertiesPanel"
          fallback={
            <div className="fixed top-0 right-0 h-screen w-80 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-transparent backdrop-blur-xl border-l-[2px] border-red-500/20 flex items-center justify-center">
              <div className="text-center p-4">
                <div className="text-red-400 mb-2">⚠️ Properties Error</div>
                <p className="text-gray-300 text-sm mb-4">Properties panel failed to load.</p>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm hover:bg-red-500/30 transition-colors"
                >
                  Close Panel
                </button>
              </div>
            </div>
          }
        >
          <PropertiesPanel 
            selectedNode={selectedNode} 
            onClose={() => setSelectedNode(null)}
            onUpdateNode={handleUpdateNode}
          />
        </ComponentErrorBoundary>
        
        <TestPanel 
          visible={testPanelVisible}
          onClose={() => setTestPanelVisible(false)}
        />

        {/* Inline Analytics Widget */}
        <InlineAnalytics position="top-right" compact={nodes.length === 0} />
      </div>
      
      <NaturalLanguageInput
        expanded={nlInputExpanded}
        onToggle={() => setNlInputExpanded(!nlInputExpanded)}
        onGenerate={handleGenerateFromPrompt}
      />
      
      {showOnboarding && (
        <OnboardingOverlay onComplete={() => setShowOnboarding(false)} />
      )}
      
      {showInteractiveOnboarding && (
        <InteractiveOnboarding 
          onComplete={() => setShowInteractiveOnboarding(false)}
          onNodeCreate={handleInteractiveOnboardingNodeCreate}
          onNodeSelect={handleInteractiveOnboardingNodeSelect}
        />
      )}
      
      {showTemplateLibrary && (
        <TemplateLibrary 
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowTemplateLibrary(false)} 
        />
      )}
      
      {showQuickStartWizard && (
        <QuickStartWizard 
          onComplete={handleQuickStartComplete}
          onClose={() => setShowQuickStartWizard(false)} 
        />
      )}

      {/* Recovery Dialog */}
      {currentProject && (
        <RecoveryDialog
          projectId={currentProject.id}
          isOpen={showRecoveryDialog}
          onRecover={handleRecoveryRestore}
          onClose={() => setShowRecoveryDialog(false)}
          onDiscard={handleRecoveryDiscard}
        />
      )}
    </div>
  );
};

export default Index;
