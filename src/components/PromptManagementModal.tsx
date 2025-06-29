import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { Textarea } from '@/components/ui/textarea.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { 
  Copy, 
  Plus, 
  Star, 
  StarIcon,
  Trash2, 
  Edit,
  History,
  Clock,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  FileText,
  Sparkles,
  Code,
  Settings
} from 'lucide-react';
import { toast } from '@/hooks/use-toast.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { PromptService, Prompt, CreatePromptData, UpdatePromptData } from '@/services/promptService';
import { PromptVersionService, PromptVersion, CreatePromptVersionData } from '@/services/promptVersionService';
import { getCurrentProject } from '@/services/projectService';

interface PromptManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PromptHighlighter: React.FC<{ content: string }> = ({ content }) => {
  return (
    <SyntaxHighlighter
      language="markdown"
      style={vscDarkPlus}
      showLineNumbers
      customStyle={{
        fontSize: '12px',
        borderRadius: '8px',
        maxHeight: '400px',
        margin: 0,
        padding: '12px',
        backgroundColor: '#1E1E1E',
        border: 'none',
        overflow: 'auto'
      }}
      lineProps={{ style: { wordBreak: 'break-word', whiteSpace: 'pre-wrap' } }}
      wrapLines={true}
    >
      {content}
    </SyntaxHighlighter>
  );
};

export const PromptManagementModal: React.FC<PromptManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('create');
  
  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    content: '',
    variables: '{}',
    metadata: '{}',
  });

  // Load prompts on modal open
  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    }
  }, [isOpen]);

  // Load prompt versions when a prompt is selected
  useEffect(() => {
    if (selectedPrompt) {
      loadPromptVersions(selectedPrompt.id);
    }
  }, [selectedPrompt]);

  const loadPrompts = async () => {
    try {
      setIsLoading(true);
      const currentProject = getCurrentProject();
      if (!currentProject) {
        toast({
          title: "Error",
          description: "No project selected. Please select a project first.",
          variant: "destructive",
        });
        return;
      }

      const projectPrompts = await PromptService.getProjectPrompts(currentProject.id);
      setPrompts(projectPrompts);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      toast({
        title: "Error",
        description: "Failed to load prompts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPromptVersions = async (promptId: string) => {
    try {
      const versions = await PromptVersionService.getPromptVersions(promptId);
      setPromptVersions(versions);
    } catch (error) {
      console.error('Failed to load prompt versions:', error);
      toast({
        title: "Error",
        description: "Failed to load prompt versions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreatePrompt = async () => {
    try {
      const currentProject = getCurrentProject();
      if (!currentProject) {
        toast({
          title: "Error",
          description: "No project selected. Please select a project first.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "Please enter a prompt name.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.content.trim()) {
        toast({
          title: "Error",
          description: "Please enter prompt content.",
          variant: "destructive",
        });
        return;
      }

      const promptData: CreatePromptData = {
        project_id: currentProject.id,
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
      };

      const newPrompt = await PromptService.createPrompt(promptData);

      // Parse variables and metadata
      let variables: Record<string, any> | undefined;
      let metadata: Record<string, any> | undefined;

      try {
        variables = formData.variables.trim() ? JSON.parse(formData.variables) : undefined;
      } catch (e) {
        console.warn('Invalid variables JSON, using empty object');
        variables = {};
      }

      try {
        metadata = formData.metadata.trim() ? JSON.parse(formData.metadata) : undefined;
      } catch (e) {
        console.warn('Invalid metadata JSON, using empty object');
        metadata = {};
      }

      // Create initial version
      const versionData: CreatePromptVersionData = {
        prompt_id: newPrompt.id,
        content: formData.content,
        variables,
        metadata,
      };

      await PromptVersionService.createPromptVersion(versionData);

      // Reset form and reload
      setFormData({
        name: '',
        description: '',
        category: '',
        content: '',
        variables: '{}',
        metadata: '{}',
      });
      setIsCreating(false);
      await loadPrompts();

      toast({
        title: "Success",
        description: "Prompt created successfully!",
      });

      // Switch to prompts tab to show the created prompt
      setActiveTab('prompts');
    } catch (error) {
      console.error('Failed to create prompt:', error);
      toast({
        title: "Error",
        description: "Failed to create prompt. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePrompt = async () => {
    if (!selectedPrompt) return;

    try {
      const updateData: UpdatePromptData = {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
      };

      await PromptService.updatePrompt(selectedPrompt.id, updateData);

      // If content changed, create a new version
      if (formData.content.trim()) {
        let variables: Record<string, any> | undefined;
        let metadata: Record<string, any> | undefined;

        try {
          variables = formData.variables.trim() ? JSON.parse(formData.variables) : undefined;
        } catch (e) {
          variables = {};
        }

        try {
          metadata = formData.metadata.trim() ? JSON.parse(formData.metadata) : undefined;
        } catch (e) {
          metadata = {};
        }

        const versionData: CreatePromptVersionData = {
          prompt_id: selectedPrompt.id,
          content: formData.content,
          variables,
          metadata,
        };

        await PromptVersionService.createPromptVersion(versionData);
        await loadPromptVersions(selectedPrompt.id);
      }

      setIsEditing(false);
      await loadPrompts();

      toast({
        title: "Success",
        description: "Prompt updated successfully!",
      });
    } catch (error) {
      console.error('Failed to update prompt:', error);
      toast({
        title: "Error",
        description: "Failed to update prompt. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    try {
      await PromptService.deletePrompt(promptId);
      await loadPrompts();
      if (selectedPrompt?.id === promptId) {
        setSelectedPrompt(null);
        setPromptVersions([]);
      }

      toast({
        title: "Success",
        description: "Prompt deleted successfully!",
      });
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      toast({
        title: "Error",
        description: "Failed to delete prompt. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStar = async (promptId: string) => {
    try {
      await PromptService.togglePromptStar(promptId);
      await loadPrompts();
    } catch (error) {
      console.error('Failed to toggle star:', error);
      toast({
        title: "Error",
        description: "Failed to update star status.",
        variant: "destructive",
      });
    }
  };

  const handleRestoreVersion = async (promptId: string, versionNumber: number) => {
    try {
      await PromptVersionService.restoreVersion(promptId, versionNumber);
      await loadPromptVersions(promptId);

      toast({
        title: "Success",
        description: `Version ${versionNumber} restored successfully!`,
      });
    } catch (error) {
      console.error('Failed to restore version:', error);
      toast({
        title: "Error",
        description: "Failed to restore version. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard.",
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const toggleVersionExpansion = (versionId: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(versionId)) {
        newSet.delete(versionId);
      } else {
        newSet.add(versionId);
      }
      return newSet;
    });
  };

  const startEditing = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description || '',
      category: prompt.category || '',
      content: '',
      variables: '{}',
      metadata: '{}',
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsCreating(false);
    setFormData({
      name: '',
      description: '',
      category: '',
      content: '',
      variables: '{}',
      metadata: '{}',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-zinc-300/5 via-purple-400/10 to-transparent backdrop-blur-xl">
        <DialogHeader className="border-b border-white/20 pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-zinc-700 to-purple-600 bg-clip-text text-transparent">
            <div className="p-2 rounded-lg bg-gradient-to-br from-zinc-400/20 via-purple-400/30 to-transparent border-[2px] border-white/10 shadow-2xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            Prompt Management Studio
          </DialogTitle>
          <DialogDescription className="text-zinc-600 mt-2">
            Create, manage, and version your AI prompts with powerful editing tools
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden mt-4">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl border-[2px] border-white/10 rounded-xl shadow-2xl">
            <TabsTrigger 
              value="prompts" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-tr data-[state=active]:from-zinc-300/20 data-[state=active]:via-purple-400/30 data-[state=active]:to-transparent data-[state=active]:text-white data-[state=active]:shadow-2xl transition-all duration-300 hover:border-purple-400/30"
            >
              <FileText className="h-4 w-4" />
              My Prompts
            </TabsTrigger>
            <TabsTrigger 
              value="create"
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-tr data-[state=active]:from-zinc-300/20 data-[state=active]:via-purple-400/30 data-[state=active]:to-transparent data-[state=active]:text-white data-[state=active]:shadow-2xl transition-all duration-300 hover:border-purple-400/30"
            >
              <Sparkles className="h-4 w-4" />
              Create New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prompts" className="flex-1 overflow-y-auto mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              {/* Prompts List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl rounded-xl border-[2px] border-white/10 p-4 shadow-2xl hover:border-purple-400/30 transition-all duration-300">
                  <div>
                    <h3 className="text-lg font-bold text-white">Your Prompts</h3>
                    <p className="text-sm text-zinc-300">Manage and organize your AI prompts</p>
                  </div>
                  <Button
                    onClick={() => {
                      setIsCreating(true);
                      setActiveTab('create');
                    }}
                    className="bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent border-[2px] border-white/10 hover:border-purple-400/30 text-white hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent shadow-2xl transition-all duration-300 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Prompt
                  </Button>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center gap-3 text-zinc-300">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
                      Loading prompts...
                    </div>
                  </div>
                ) : prompts.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl rounded-xl border-[2px] border-white/10 shadow-2xl">
                    <FileText className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-white mb-2">No prompts yet</h4>
                    <p className="text-zinc-300 mb-4">Create your first prompt to get started.</p>
                    <Button
                      onClick={() => setActiveTab('create')}
                      className="bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent border-[2px] border-white/10 hover:border-purple-400/30 text-white hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent shadow-2xl transition-all duration-300"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Prompt
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {prompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        className={`group p-5 rounded-xl cursor-pointer transition-all duration-300 border-2 hover:shadow-2xl ${
                          selectedPrompt?.id === prompt.id
                            ? 'border-purple-400/50 bg-gradient-to-br from-zinc-300/20 via-purple-400/30 to-transparent backdrop-blur-xl shadow-2xl transform scale-[1.02]'
                            : 'border-white/20 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl hover:border-purple-400/30 hover:bg-gradient-to-tr hover:from-zinc-300/15 hover:via-purple-400/15 hover:to-transparent'
                        }`}
                        onClick={() => setSelectedPrompt(prompt)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-white text-lg">{prompt.name}</h4>
                              {prompt.starred && (
                                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                              )}
                            </div>
                            {prompt.description && (
                              <p className="text-sm text-zinc-300 mb-3 line-clamp-2">
                                {prompt.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              {prompt.category && (
                                <span className="inline-block px-3 py-1 bg-gradient-to-r from-zinc-300/20 to-purple-400/30 text-purple-200 text-xs font-medium rounded-full border border-purple-400/30">
                                  {prompt.category}
                                </span>
                              )}
                              <span className="text-xs text-zinc-400">
                                {new Date(prompt.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-yellow-400/20 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStar(prompt.id);
                              }}
                            >
                              {prompt.starred ? (
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              ) : (
                                <StarIcon className="h-4 w-4 text-zinc-400 hover:text-yellow-400" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-purple-400/20 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(prompt);
                              }}
                            >
                              <Edit className="h-4 w-4 text-zinc-400 hover:text-purple-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-400/20 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePrompt(prompt.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-400" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Version History */}
              <div className="space-y-6">
                <div className="bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl rounded-xl border-[2px] border-white/10 p-4 shadow-2xl hover:border-purple-400/30 transition-all duration-300">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-zinc-300/20 via-purple-400/30 to-transparent border-[2px] border-white/10 shadow-2xl">
                      <History className="h-4 w-4 text-white" />
                    </div>
                    Version History
                  </h3>
                  <p className="text-sm text-zinc-300 mt-1">Track changes and restore previous versions</p>
                </div>

                {!selectedPrompt ? (
                  <div className="text-center py-12 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl rounded-xl border-[2px] border-white/10 shadow-2xl">
                    <History className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-white mb-2">No Prompt Selected</h4>
                    <p className="text-zinc-300">Select a prompt from the left to view its version history</p>
                  </div>
                ) : promptVersions.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl rounded-xl border-[2px] border-white/10 shadow-2xl">
                    <Clock className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-white mb-2">No Versions Yet</h4>
                    <p className="text-zinc-300">This prompt doesn't have any versions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {promptVersions.map((version) => (
                      <div
                        key={version.id}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="font-medium">
                              Version {version.version}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(version.created_at).toLocaleString()}
                            </div>
                            {version.is_active && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleVersionExpansion(version.id)}
                            >
                              {expandedVersions.has(version.id) ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(version.content)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreVersion(selectedPrompt.id, version.version)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {expandedVersions.has(version.id) && (
                          <div className="space-y-3">
                            <div>
                              <h5 className="font-medium mb-2">Content:</h5>
                              <PromptHighlighter content={version.content} />
                            </div>
                            
                            {version.variables && Object.keys(version.variables).length > 0 && (
                              <div>
                                <h5 className="font-medium mb-2">Variables:</h5>
                                <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                                  {JSON.stringify(version.variables, null, 2)}
                                </pre>
                              </div>
                            )}

                            {version.metadata && Object.keys(version.metadata).length > 0 && (
                              <div>
                                <h5 className="font-medium mb-2">Metadata:</h5>
                                <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                                  {JSON.stringify(version.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="create" className="flex-1 overflow-y-auto mt-6">
            <div className="space-y-8">
              <div className="bg-gradient-to-tr from-zinc-300/10 via-purple-400/20 to-transparent backdrop-blur-xl rounded-xl border-[2px] border-white/10 p-6 shadow-2xl hover:border-purple-400/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-zinc-300/20 via-purple-400/30 to-transparent border-[2px] border-white/10 shadow-2xl">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                      {isEditing ? 'Edit Prompt' : 'Create New Prompt'}
                    </h3>
                    <p className="text-zinc-300 mt-2">
                      {isEditing ? 'Update your prompt and create a new version' : 'Design your AI prompt with variables and metadata'}
                    </p>
                  </div>
                  {(isCreating || isEditing) && (
                    <Button 
                      variant="outline" 
                      onClick={cancelEditing}
                      className="border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl rounded-xl border-[2px] border-white/10 p-6 shadow-2xl hover:border-purple-400/30 transition-all duration-300">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-400" />
                      Basic Information
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name" className="text-sm font-semibold text-zinc-200">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Customer Service Assistant"
                          className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-zinc-400 focus:border-purple-400 focus:ring-purple-400/30 backdrop-blur-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description" className="text-sm font-semibold text-zinc-200">Description</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Brief description of what this prompt does"
                          className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-zinc-400 focus:border-purple-400 focus:ring-purple-400/30 backdrop-blur-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor="category" className="text-sm font-semibold text-zinc-200">Category</Label>
                        <Input
                          id="category"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          placeholder="e.g., agent, system, user, creative"
                          className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-zinc-400 focus:border-purple-400 focus:ring-purple-400/30 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl rounded-xl border-[2px] border-white/10 p-6 shadow-2xl hover:border-purple-400/30 transition-all duration-300">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                      <Edit className="h-5 w-5 text-purple-400" />
                      Prompt Content *
                    </h4>
                    
                    <div>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="You are a helpful AI assistant. Please help the user with their question about {topic}. Be concise and accurate in your response.

Use variables like {variable_name} that you can define in the Variables section."
                        rows={8}
                        className="min-h-[200px] bg-white/10 border-white/20 text-white placeholder:text-zinc-400 focus:border-purple-400 focus:ring-purple-400/30 backdrop-blur-sm"
                      />
                      <div className="mt-3 p-3 bg-purple-400/20 border border-purple-400/30 rounded-lg backdrop-blur-sm">
                        <p className="text-sm text-purple-200 font-medium">💡 Pro Tip:</p>
                        <p className="text-sm text-purple-300 mt-1">
                          Use curly braces like {"{variable_name}"} to create dynamic variables that can be customized later.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl rounded-xl border-[2px] border-white/10 p-6 shadow-2xl hover:border-purple-400/30 transition-all duration-300">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                      <Code className="h-5 w-5 text-purple-400" />
                      Variables (Optional)
                    </h4>
                    
                    <div>
                      <Textarea
                        id="variables"
                        value={formData.variables}
                        onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                        placeholder='{"topic": "machine learning", "tone": "professional", "max_length": "200 words"}'
                        rows={4}
                        className="bg-white/10 border-white/20 text-white placeholder:text-zinc-400 focus:border-purple-400 focus:ring-purple-400/30 backdrop-blur-sm font-mono text-sm"
                      />
                      <div className="mt-3 p-3 bg-purple-400/20 border border-purple-400/30 rounded-lg backdrop-blur-sm">
                        <p className="text-sm text-purple-200 font-medium">📝 Variables Help:</p>
                        <p className="text-sm text-purple-300 mt-1">
                          Define default values for variables used in your prompt. Use valid JSON format.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl rounded-xl border-[2px] border-white/10 p-6 shadow-2xl hover:border-purple-400/30 transition-all duration-300">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                      <Settings className="h-5 w-5 text-purple-400" />
                      Metadata (Optional)
                    </h4>
                    
                    <div>
                      <Textarea
                        id="metadata"
                        value={formData.metadata}
                        onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                        placeholder='{"model": "gpt-4", "temperature": 0.7, "max_tokens": 500, "system_prompt": "You are a helpful assistant"}'
                        rows={4}
                        className="bg-white/10 border-white/20 text-white placeholder:text-zinc-400 focus:border-purple-400 focus:ring-purple-400/30 backdrop-blur-sm font-mono text-sm"
                      />
                      <div className="mt-3 p-3 bg-purple-400/20 border border-purple-400/30 rounded-lg backdrop-blur-sm">
                        <p className="text-sm text-purple-200 font-medium">⚙️ Metadata Help:</p>
                        <p className="text-sm text-purple-300 mt-1">
                          Store model settings, configuration, and other technical details in JSON format.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-tr from-zinc-300/10 via-purple-400/20 to-transparent backdrop-blur-xl rounded-xl border-[2px] border-white/10 p-6 shadow-2xl hover:border-purple-400/30 transition-all duration-300">
                    <Button
                      onClick={isEditing ? handleUpdatePrompt : handleCreatePrompt}
                      className="w-full h-12 bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent border-[2px] border-white/10 hover:border-purple-400/30 text-white hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent font-semibold text-lg shadow-2xl hover:shadow-xl transition-all duration-300"
                    >
                      <Save className="h-5 w-5 mr-3" />
                      {isEditing ? 'Update Prompt & Create Version' : 'Create Prompt'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-white/20 pt-4 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-zinc-300">
              💡 Tip: Use the version history to track changes and restore previous versions
            </p>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent border-[2px] border-white/10 hover:border-purple-400/30 text-white hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent backdrop-blur-sm"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};