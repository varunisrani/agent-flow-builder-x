import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js';
import { Button } from '@/components/ui/button.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.js';
import { Badge } from '@/components/ui/badge.js';
import { BaseNodeData } from './nodes/BaseNode.js';
import { Copy, Loader2, Code, Sparkles, History, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Import unified system
import { codeGenerationEngine, type GenerationMethod, type GenerationMode, type GenerationResult, type GenerationProgress } from '@/lib/unified/CodeGenerationEngine';
import { CodeVersionService, CodeVersion } from '@/services/codeVersionService';
import { getCurrentProject } from '@/services/projectService';

// Legacy imports for backward compatibility
import { MCPConfig } from '@/lib/codeGeneration';

interface CodeGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
  mcpConfig?: MCPConfig[]; // Legacy prop for backward compatibility
}

const CodeHighlighter: React.FC<{ code: string }> = ({ code }) => {
  return (
    <SyntaxHighlighter
      language="python"
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
      lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap' } }}
      wrapLines={true}
    >
      {code}
    </SyntaxHighlighter>
  );
};

const ProgressIndicator: React.FC<{ progress: GenerationProgress | null }> = ({ progress }) => {
  if (!progress) return null;

  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-blue-800">{progress.message}</span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress.progress}%` }}
        ></div>
      </div>
      <div className="mt-1 text-xs text-blue-600">
        Step: {progress.step} ({Math.round(progress.progress)}%)
      </div>
    </div>
  );
};

const ValidationResults: React.FC<{ 
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recommendedMethod: GenerationMethod;
    recommendedMode: GenerationMode;
  } | null 
}> = ({ validation }) => {
  if (!validation) return null;

  return (
    <div className="mb-4 space-y-2">
      <div className={`flex items-center gap-2 p-2 rounded ${
        validation.isValid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      }`}>
        {validation.isValid ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          Flow {validation.isValid ? 'Valid' : 'Invalid'}
        </span>
      </div>

      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-2">
          <div className="text-sm font-medium text-red-800 mb-1">Errors:</div>
          <ul className="text-xs text-red-700 space-y-1">
            {validation.errors.map((error, idx) => (
              <li key={idx}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
          <div className="text-sm font-medium text-yellow-800 mb-1">Warnings:</div>
          <ul className="text-xs text-yellow-700 space-y-1">
            {validation.warnings.map((warning, idx) => (
              <li key={idx}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 text-xs">
        <Badge variant="outline">
          Recommended: {validation.recommendedMethod}
        </Badge>
        <Badge variant="outline">
          Mode: {validation.recommendedMode}
        </Badge>
      </div>
    </div>
  );
};

export function CodeGenerationModal({
  open,
  onOpenChange,
  nodes,
  edges,
  mcpConfig: _ // Legacy prop - ignored in unified system
}: CodeGenerationModalProps) {
  // Core state
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [generationMethod, setGenerationMethod] = useState<GenerationMethod>('auto');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [activeTab, setActiveTab] = useState('generate');

  // Validation state
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recommendedMethod: GenerationMethod;
    recommendedMode: GenerationMode;
  } | null>(null);

  // Available modes with metadata
  const [availableModes, setAvailableModes] = useState<{
    mode: GenerationMode;
    available: boolean;
    recommended: boolean;
    description: string;
    requiredFeatures: string[];
  }[]>([]);
  
  // Track if user has manually selected a mode (using ref to avoid re-renders)
  const userHasManuallySelectedMode = useRef(false);

  // Code history
  const [codeVersions, setCodeVersions] = useState<CodeVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);

  const validateFlow = useCallback(async () => {
    try {
      const result = await codeGenerationEngine.validateFlow(nodes, edges);
      setValidation(result);
      
      // Set recommended method only if user hasn't chosen
      if (generationMethod === 'auto') {
        setGenerationMethod(result.recommendedMethod);
      }
      
      // Only auto-set mode if user hasn't manually selected one
      if (!userHasManuallySelectedMode.current) {
        setGenerationMode(result.recommendedMode);
      }

    } catch (error) {
      console.error('Flow validation failed:', error);
      setValidation({
        isValid: false,
        errors: ['Flow validation failed'],
        warnings: [],
        recommendedMethod: 'template',
        recommendedMode: 'standard'
      });
    }
  }, [nodes, edges, generationMethod]);

  const updateAvailableModes = useCallback(() => {
    const modes = codeGenerationEngine.getAvailableModes(nodes);
    setAvailableModes(modes);
    
    // All modes are always available now, so no need to reset user's selection
    // The mode checking logic is removed to prevent auto-switching
  }, [nodes]);

  // Handler for manual mode selection
  const handleModeChange = useCallback((value: GenerationMode) => {
    // Set the flag first to prevent any race conditions
    userHasManuallySelectedMode.current = true;
    setGenerationMode(value);
  }, []);

  const loadCodeVersions = useCallback(async () => {
    try {
      const project = getCurrentProject();
      if (project) {
        const versions = await CodeVersionService.getProjectVersions(project.id);
        setCodeVersions(versions);
      }
    } catch (error) {
      console.warn('Failed to load code versions:', error);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!validation?.isValid) {
      toast({
        title: "Invalid Flow",
        description: "Please fix the errors in your flow before generating code.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(null);
    setGenerationResult(null);

    try {
      const result = await codeGenerationEngine.generateCode({
        nodes,
        edges,
        method: generationMethod,
        mode: generationMode,
        options: {
          enableVerification: true,
          onProgress: setGenerationProgress,
        }
      });

      setGenerationResult(result);
      setGeneratedCode(result.code);
      setActiveTab('code');

      // Save to version history
      const project = getCurrentProject();
      if (project) {
        await CodeVersionService.createCodeVersion({
          project_id: project.id,
          code_content: result.code,
          generation_method: result.method === 'auto' ? 'ai' : result.method,
          metadata: {
            mode: result.mode,
            features: result.metadata.features,
            verification: result.verification
          }
        });
        await loadCodeVersions();
      }

      toast({
        title: "Code Generated Successfully",
        description: `Generated using ${result.method} method in ${result.mode} mode`,
      });

    } catch (error) {
      console.error('Code generation failed:', error);
      
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  }, [validation, nodes, edges, generationMethod, generationMode, loadCodeVersions]);

  const handleCopyCode = useCallback(() => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast({
        title: "Code Copied",
        description: "Code copied to clipboard",
      });
    }
  }, [generatedCode]);

  const handleLoadVersion = useCallback(async (versionId: string) => {
    try {
      const version = codeVersions.find(v => v.id === versionId);
      if (version) {
        setGeneratedCode(version.code_content);
        setSelectedVersion(versionId);
        setActiveTab('code');
        
        toast({
          title: "Version Loaded",
          description: `Loaded version from ${new Date(version.created_at).toLocaleString()}`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Load Version",
        description: "Could not load the selected version",
        variant: "destructive",
      });
    }
  }, [codeVersions]);

  // Reset manual selection when modal opens
  useEffect(() => {
    if (open) {
      userHasManuallySelectedMode.current = false;
      if (nodes.length > 0) {
        validateFlow();
        updateAvailableModes();
        loadCodeVersions();
      }
    }
  }, [open, nodes, edges, validateFlow, updateAvailableModes, loadCodeVersions]);

  const renderGenerationTab = () => (
    <div className="space-y-4">
      <ValidationResults validation={validation} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Generation Method</label>
          <Select
            value={generationMethod}
            onValueChange={(value: GenerationMethod) => setGenerationMethod(value)}
            disabled={isGenerating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (Recommended)</SelectItem>
              <SelectItem value="ai">AI Generation</SelectItem>
              <SelectItem value="template">Template Based</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Generation Mode</label>
          <Select
            value={generationMode}
            onValueChange={handleModeChange}
            disabled={isGenerating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModes.map(({ mode, recommended, description }) => (
                <SelectItem key={mode} value={mode}>
                  <div className="flex items-center gap-2">
                    <span>
                      {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')}
                    </span>
                    {recommended && (
                      <Badge variant="secondary" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 leading-tight">
                    {description}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Mode info for selected mode */}
          {availableModes.find(m => m.mode === generationMode) && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-blue-800">
                  {generationMode.charAt(0).toUpperCase() + generationMode.slice(1).replace('-', ' ')}
                </span>
                {availableModes.find(m => m.mode === generationMode)?.recommended && (
                  <Badge variant="secondary" className="text-xs">
                    Recommended
                  </Badge>
                )}
              </div>
              <div className="text-blue-700">
                {availableModes.find(m => m.mode === generationMode)?.description}
              </div>
              {availableModes.find(m => m.mode === generationMode)?.requiredFeatures?.length > 0 && (
                <div className="text-blue-600 mt-1">
                  Requires: {availableModes.find(m => m.mode === generationMode)?.requiredFeatures?.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAdvanced && (
        <div className="border rounded p-3 bg-gray-50">
          <div className="text-sm font-medium mb-2">Advanced Options</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              <strong>Generation method:</strong> {generationMethod === 'auto' ? validation?.recommendedMethod || 'auto' : generationMethod}
            </div>
            <div>
              <strong>User selection:</strong> {userHasManuallySelectedMode.current ? 'Manual' : 'Auto-recommended'}
            </div>
            <div>
              <strong>Available modes:</strong> {availableModes.length} total 
              ({availableModes.filter(m => m.recommended).length} recommended)
            </div>
            <div>
              <strong>Flow validation:</strong> {validation?.isValid ? 'Valid' : 'Invalid'}
            </div>
            {validation && validation.warnings.length > 0 && (
              <div>
                <strong>Warnings:</strong> {validation.warnings.length}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </Button>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !validation?.isValid}
          className="flex items-center gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isGenerating ? 'Generating...' : 'Generate Code'}
        </Button>
      </div>

      {generationProgress && <ProgressIndicator progress={generationProgress} />}

      {generationResult && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Generation Completed</span>
          </div>
          <div className="text-xs text-green-700 space-y-1">
            <div>Method: {generationResult.method}</div>
            <div>Mode: {generationResult.mode}</div>
            <div>Features: {generationResult.metadata.features.join(', ')}</div>
            <div>Generation time: {Math.round(generationResult.metadata.performance.generationTime)}ms</div>
            {generationResult.verification && (
              <div>Verification: {generationResult.verification.isValid ? 'Passed' : 'Failed'}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderCodeTab = () => (
    <div className="space-y-4">
      {generatedCode ? (
        <>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {generationResult ? `Generated using ${generationResult.method} (${generationResult.mode})` : 'Generated code'}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyCode}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Code
            </Button>
          </div>

          <div className="border rounded overflow-hidden">
            <CodeHighlighter code={generatedCode} />
          </div>

          {generationResult?.verification && !generationResult.verification.isValid && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="text-sm font-medium text-yellow-800 mb-2">
                Code Verification Issues
              </div>
              <div className="text-xs text-yellow-700">
                {generationResult.verification.errors.length} error(s) found and automatically fixed
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No code generated yet</p>
          <p className="text-sm">Use the Generate tab to create your agent code</p>
        </div>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-4">
      {codeVersions.length > 0 ? (
        <div className="space-y-2">
          {codeVersions.map((version) => (
            <div
              key={version.id}
              className={`border rounded p-3 cursor-pointer transition-colors ${
                selectedVersion === version.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleLoadVersion(version.id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-medium">
                    {version.generation_method || 'Unknown'} (v{version.version})
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(version.created_at).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {version.metadata?.mode ? `Mode: ${version.metadata.mode}` : 'No metadata'}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {version.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No code history yet</p>
          <p className="text-sm">Generated code will appear here</p>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Agent Code Generation
          </DialogTitle>
          <DialogDescription>
            Generate Google ADK agent code from your visual flow
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-4">
              <TabsContent value="generate" className="h-full">
                {renderGenerationTab()}
              </TabsContent>

              <TabsContent value="code" className="h-full">
                {renderCodeTab()}
              </TabsContent>

              <TabsContent value="history" className="h-full">
                {renderHistoryTab()}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}