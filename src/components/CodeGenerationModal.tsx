import React, { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { BaseNodeData } from './nodes/BaseNode.js';
import { Copy, AlertCircle, Loader2, Play, Code, Sparkles, History, Clock, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { generateMCPCode, MCPConfig, dedupeConfigs, generateCodeWithAI } from '@/lib/codeGeneration';
import { VerificationProgress as VerificationProgressType } from '@/lib/codeVerification';
import { extractNodeData } from '@/lib/nodeDataExtraction';
import { generateTemplateFromNodeData } from '@/lib/templateGeneration';
import { CodeVersionService, CodeVersion } from '@/services/codeVersionService';
import { SupabaseProjectService } from '@/services/supabaseProjectService';
import { getCurrentProject } from '@/services/projectService';
import type { VerificationResult as AdvancedVerificationResult, VerificationError } from '@/lib/verification/types';
import { AdvancedCodeVerifier } from '@/lib/verification/AdvancedCodeVerifier';

// Type definition for generation methods
type GenerationMethod = 'ai' | 'template';

// OpenRouter configuration - Use environment variable for API key
// SECURITY NOTE: Never hardcode API keys in source code
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_BASE = import.meta.env.VITE_OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';

// Define proper type for code parameter
const CodeHighlighter: React.FC<{ code: string }> = ({ code }) => {
  return (
    <SyntaxHighlighter
      language="python"
      style={vscDarkPlus}
      showLineNumbers
      customStyle={{
        fontSize: '12px',
        borderRadius: '8px',
        maxHeight: '100%',
        height: '100%',
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

// Helper function to extract URLs from text
const extractUrls = (text: string): string[] => {
  // Match both localhost URLs and regular http/https URLs
  const urlRegex = /(https?:\/\/[^\s]+)|(localhost:[0-9]+[^\s]*)/g;
  return (text.match(urlRegex) || []).map(url => {
    // Ensure localhost URLs have http:// prefix
    if (url.startsWith('localhost')) {
      return `http://${url}`;
    }
    return url;
  });
};

// Component for verification progress display
const VerificationProgressComponent: React.FC<{ progress: VerificationProgressType | null }> = ({ progress }) => {
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
      {progress.errors && progress.errors.length > 0 && (
        <div className="mt-2 text-xs text-blue-700">
          Found and fixed {progress.errors.length} error(s)
        </div>
      )}
    </div>
  );
};

// Component for advanced verification results display
const AdvancedVerificationDisplay: React.FC<{ 
  result: AdvancedVerificationResult | null; 
  show: boolean; 
  onToggle: () => void 
}> = ({ result, show, onToggle }) => {
  if (!result) return null;

  const errorsByCategory = result.errors.reduce((acc, error) => {
    if (!acc[error.category]) acc[error.category] = [];
    acc[error.category].push(error);
    return acc;
  }, {} as Record<string, VerificationError[]>);

  const langfuseErrors = errorsByCategory.langfuse || [];
  const mcpErrors = errorsByCategory.mcp || [];
  const eventHandlingErrors = errorsByCategory['event-handling'] || [];
  const memoryErrors = errorsByCategory.memory || [];
  const otherErrors = Object.entries(errorsByCategory).filter(([cat]) => !['langfuse', 'mcp', 'event-handling', 'memory'].includes(cat));

  const getErrorIcon = (severity: string) => {
    switch (severity) {
      case 'error': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${result.isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              Advanced Verification {result.isValid ? 'Passed' : 'Found Issues'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>🛠️ {result.metadata.fixesApplied} fixes applied</span>
            <span>⏱️ {result.metadata.verificationTime.toFixed(0)}ms</span>
            <span className={getConfidenceColor(result.metadata.confidence)}>
              📊 {result.metadata.confidence}% confidence
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onToggle}
          className="text-xs"
        >
          {show ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
          {show ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>

      {show && (
        <div className="p-4 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{result.errors.length}</div>
              <div className="text-xs text-gray-600">Total Issues</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{result.errors.filter(e => e.fixed).length}</div>
              <div className="text-xs text-gray-600">Fixed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{langfuseErrors.length}</div>
              <div className="text-xs text-gray-600">Langfuse</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">{eventHandlingErrors.length}</div>
              <div className="text-xs text-gray-600">Event Handling</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-teal-600">{memoryErrors.length}</div>
              <div className="text-xs text-gray-600">Memory</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{result.metadata.verificationMethod}</div>
              <div className="text-xs text-gray-600">Method</div>
            </div>
          </div>

          {/* Langfuse Errors Section */}
          {langfuseErrors.length > 0 && (
            <div className="border border-purple-200 rounded-lg p-3 bg-purple-50">
              <h4 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
                🔮 Langfuse Compatibility Issues ({langfuseErrors.length})
              </h4>
              <div className="space-y-2">
                {langfuseErrors.map((error, index) => (
                  <div key={index} className="bg-white p-2 rounded border border-purple-200">
                    <div className="flex items-start gap-2">
                      <span className="text-xs mt-0.5">{getErrorIcon(error.severity)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-purple-800">{error.type.replace(/-/g, ' ')}</div>
                        <div className="text-xs text-purple-600 mt-1">{error.message}</div>
                        {error.fixed && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-green-600">✅ Fixed</span>
                            {error.confidenceScore && (
                              <span className="text-xs text-gray-500">({error.confidenceScore}% confidence)</span>
                            )}
                          </div>
                        )}
                        {error.fixDescription && (
                          <div className="text-xs text-gray-600 mt-1 italic">{error.fixDescription}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MCP Errors Section */}
          {mcpErrors.length > 0 && (
            <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
              <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                🔗 MCP Integration Issues ({mcpErrors.length})
              </h4>
              <div className="space-y-2">
                {mcpErrors.map((error, index) => (
                  <div key={index} className="bg-white p-2 rounded border border-blue-200">
                    <div className="flex items-start gap-2">
                      <span className="text-xs mt-0.5">{getErrorIcon(error.severity)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-blue-800">{error.type.replace(/-/g, ' ')}</div>
                        <div className="text-xs text-blue-600 mt-1">{error.message}</div>
                        {error.fixed && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-green-600">✅ Fixed</span>
                            {error.confidenceScore && (
                              <span className="text-xs text-gray-500">({error.confidenceScore}% confidence)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Handling Errors Section */}
          {eventHandlingErrors.length > 0 && (
            <div className="border border-orange-200 rounded-lg p-3 bg-orange-50">
              <h4 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                ⚡ Event Handling Issues ({eventHandlingErrors.length})
              </h4>
              <div className="space-y-2">
                {eventHandlingErrors.map((error, index) => (
                  <div key={index} className="bg-white p-2 rounded border border-orange-200">
                    <div className="flex items-start gap-2">
                      <span className="text-xs mt-0.5">{getErrorIcon(error.severity)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-orange-800">{error.type.replace(/-/g, ' ')}</div>
                        <div className="text-xs text-orange-600 mt-1">{error.message}</div>
                        {error.fixed && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-green-600">✅ Fixed</span>
                            {error.confidenceScore && (
                              <span className="text-xs text-gray-500">({error.confidenceScore}% confidence)</span>
                            )}
                          </div>
                        )}
                        {error.fixDescription && (
                          <div className="text-xs text-gray-600 mt-1 italic">{error.fixDescription}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Memory Errors Section */}
          {memoryErrors.length > 0 && (
            <div className="border border-teal-200 rounded-lg p-3 bg-teal-50">
              <h4 className="text-sm font-medium text-teal-800 mb-2 flex items-center gap-2">
                🧠 Memory Integration Issues ({memoryErrors.length})
              </h4>
              <div className="space-y-2">
                {memoryErrors.map((error, index) => (
                  <div key={index} className="bg-white p-2 rounded border border-teal-200">
                    <div className="flex items-start gap-2">
                      <span className="text-xs mt-0.5">{getErrorIcon(error.severity)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-teal-800">{error.type.replace(/-/g, ' ')}</div>
                        <div className="text-xs text-teal-600 mt-1">{error.message}</div>
                        {error.fixed && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-green-600">✅ Fixed</span>
                            {error.confidenceScore && (
                              <span className="text-xs text-gray-500">({error.confidenceScore}% confidence)</span>
                            )}
                          </div>
                        )}
                        {error.fixDescription && (
                          <div className="text-xs text-gray-600 mt-1 italic">{error.fixDescription}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Errors Section */}
          {otherErrors.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                🔧 Other Issues
              </h4>
              <div className="space-y-2">
                {otherErrors.map(([category, errors]) => (
                  <div key={category} className="bg-white p-2 rounded border border-gray-200">
                    <div className="text-xs font-medium text-gray-700 capitalize mb-1">{category} ({errors.length})</div>
                    <div className="space-y-1">
                      {errors.map((error, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-xs mt-0.5">{getErrorIcon(error.severity)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-600">{error.message}</div>
                            {error.fixed && (
                              <span className="text-xs text-green-600">✅ Fixed</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions Section */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
              <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
                💡 Recommendations
              </h4>
              <ul className="space-y-1">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-xs text-yellow-700 flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Component for sandbox output display
const SandboxOutput: React.FC<{ output: string }> = ({ output }) => {
  if (!output) return null;
  
  // Extract URLs from output
  const urls = extractUrls(output);
  
  return (
    <div className="mt-4 font-mono text-sm">
      <div className="bg-gray-900 rounded-md p-4 overflow-auto max-h-[200px]">
        <pre className="text-gray-200 whitespace-pre-wrap">{output}</pre>
        
        {urls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-700 pt-3">
            <span className="text-gray-400">Detected URLs:</span>
            {urls.map((url, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                onClick={() => window.open(url, '_blank')}
              >
                <span className="mr-1">Open UI</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                  className="h-3 w-3">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface CodeGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
  mcpConfig?: MCPConfig[];
}

// Helper function to get a unique key for the flow
function getFlowKey(nodes: Node<BaseNodeData>[], edges: Edge[]): string {
  const flowData = {
    nodes: nodes.map(n => ({ id: n.id, type: n.data.type, label: n.data.label })),
    edges: edges.map(e => ({ source: e.source, target: e.target }))
  };
  return btoa(JSON.stringify(flowData));
}

// Helper functions for localStorage
function getStoredCode(flowKey: string, framework: string): string | null {
  const key = `flow_code_${flowKey}_${framework}`;
  return localStorage.getItem(key);
}

function storeCode(flowKey: string, framework: string, code: string): void {
  const key = `flow_code_${flowKey}_${framework}`;
  localStorage.setItem(key, code);
}

// Helper function to generate default search agent code
const generateDefaultSearchAgentCode = (): string => {
  return `from google.adk.agents import Agent
from google.adk.tools import google_search

# FIXED: Use correct parameter order for Agent constructor
root_agent = Agent(
    name="search_agent",
    model="gemini-2.0-flash",
    description="An agent that uses Google Search to find and provide information.",
    instruction="Use Google Search to find accurate and up-to-date information. Always cite your sources and provide context from search results.",
    tools=[google_search]
)

__all__ = ["root_agent"]`;
};

// Helper function to format the code for display
function formatCodeForDisplay(code: string): string {
  return code.replace(/```python\n/g, '').replace(/```\n?/g, '').trim();
}

// Helper function to make OpenRouter API calls
async function callOpenRouter(messages: Array<{ role: string; content: string }>) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
      method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Agent Flow Builder'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages,
      temperature: 0.2,
      max_tokens: 3000
    })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

  const result = await response.json();
  return result.choices[0]?.message?.content || '';
}

// Function to extract MCP configuration from nodes
function extractMcpConfigFromNodes(nodes: Node<BaseNodeData>[]): MCPConfig[] {
  // Find MCP-related nodes
  const mcpNodes = nodes.filter(n =>
    n.data.type === 'mcp-client' ||
    n.data.type === 'mcp-server' ||
    n.data.type === 'mcp-tool'
  );

  if (mcpNodes.length === 0) {
    return [createDefaultMcpConfig()];
  }

  return mcpNodes.map(node => {
    const nodeData = node.data;

  // Extract MCP command and args
  const mcpCommand = (nodeData.mcpCommand as string) || 'npx';

  // Parse MCP args - could be string or array
  let mcpArgs: string[];
  if (nodeData.mcpArgs) {
    if (typeof nodeData.mcpArgs === 'string') {
      mcpArgs = nodeData.mcpArgs.split(' ').filter(Boolean);
    } else if (Array.isArray(nodeData.mcpArgs)) {
      mcpArgs = nodeData.mcpArgs;
    } else {
      mcpArgs = ['-y', '@smithery/cli@latest', 'run', '@smithery/mcp-example', '--key', 'smithery_api_key'];
    }
  } else {
    mcpArgs = ['-y', '@smithery/cli@latest', 'run', '@smithery/mcp-example', '--key', 'smithery_api_key'];
  }

  // Parse environment variables
  let envVars: { [key: string]: string };
  if (nodeData.mcpEnvVars) {
    if (typeof nodeData.mcpEnvVars === 'string') {
      try {
        envVars = JSON.parse(nodeData.mcpEnvVars);
      } catch {
        envVars = { 'NODE_OPTIONS': '--no-warnings --experimental-fetch' };
      }
    } else if (typeof nodeData.mcpEnvVars === 'object') {
      envVars = nodeData.mcpEnvVars as { [key: string]: string };
    } else {
      envVars = { 'NODE_OPTIONS': '--no-warnings --experimental-fetch' };
    }
  } else {
    envVars = { 'NODE_OPTIONS': '--no-warnings --experimental-fetch' };
  }

  // Extract MCP tool ID or package name - prioritize smitheryMcp over mcpToolId
  const smitheryMcp = (nodeData.smitheryMcp as string) || '';
  const mcpToolId = (nodeData.mcpToolId as string) || '';
  const mcpPackage = smitheryMcp || mcpToolId || '@smithery/mcp-example';

  // Extract Smithery API key
  const smitheryApiKey = (nodeData.smitheryApiKey as string) || '';

  // Update args to use the correct package name and API key
  if (mcpArgs.includes('@smithery/mcp-example') && mcpPackage !== '@smithery/mcp-example') {
    mcpArgs = mcpArgs.map(arg => arg === '@smithery/mcp-example' ? mcpPackage : arg);
  }

  // Ensure --key parameter is included in MCP args
  if (!mcpArgs.includes('--key')) {
    mcpArgs.push('--key', 'smithery_api_key');
  }

  // Fix CLI arguments to avoid "too many arguments" error
  // Remove duplicate --key parameters and ensure clean args
  const cleanedArgs: string[] = [];
  let skipNext = false;
  for (let i = 0; i < mcpArgs.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (mcpArgs[i] === '--key') {
      // Skip duplicate --key entries
      if (cleanedArgs.includes('--key')) {
        skipNext = true; // Skip the next argument (the key value)
        continue;
      }
    }
    cleanedArgs.push(mcpArgs[i]);
  }
  mcpArgs = cleanedArgs;

  // Ensure API key is in args if provided
  if (smitheryApiKey && !mcpArgs.includes(smitheryApiKey)) {
    // Replace 'smithery_api_key' placeholder with actual key
    mcpArgs = mcpArgs.map(arg => arg === 'smithery_api_key' ? smitheryApiKey : arg);
  }

    console.log('Extracted MCP config from nodes:', {
    command: mcpCommand,
    args: mcpArgs,
    envVars,
    mcpPackage,
    mcpToolId,
    smitheryMcp,
    smitheryApiKey: smitheryApiKey ? '***' : 'not provided'
  });

    return {
      enabled: true,
      type: 'smithery',
      command: mcpCommand,
      args: mcpArgs,
      envVars,
      smitheryMcp: mcpPackage,
      smitheryApiKey: smitheryApiKey,
      profileId: (nodeData.profileId as string) || ''
    };
  });
}

// Enhanced fallback function for robust local code generation
function fallbackToLocalGeneration(
  nodes: Node<BaseNodeData>[],
  mcpEnabled: boolean,
  mcpConfig?: MCPConfig[]
): string {
  console.log('Falling back to local generation, MCP enabled:', mcpEnabled);

  try {
    let fallbackCode: string;
    
    if (mcpEnabled) {
      // Extract actual MCP config from nodes if not provided
      const validConfig = mcpConfig || extractMcpConfigFromNodes(nodes);
      const deduped = dedupeConfigs(validConfig);
      console.log('Generating MCP code with config:', validConfig);
      fallbackCode = generateMCPCode(nodes, deduped);
    } else {
      console.log('Generating default search agent code');
      fallbackCode = generateDefaultSearchAgentCode();
    }

    // Verify the fallback code is valid
    if (!fallbackCode || fallbackCode.length < 50) {
      console.error('Fallback generation failed, using emergency template');
      return generateEmergencyTemplate(nodes);
    }

    // Quick validation
    if (!fallbackCode.includes('from google.adk.agents import LlmAgent') || 
        !fallbackCode.includes('root_agent =')) {
      console.error('Fallback code is malformed, using emergency template');
      return generateEmergencyTemplate(nodes);
    }

    return fallbackCode;
  } catch (error) {
    console.error('Error in fallback generation:', error);
    return generateEmergencyTemplate(nodes);
  }
}

// Emergency template that always works
function generateEmergencyTemplate(nodes: Node<BaseNodeData>[]): string {
  const agentNode = nodes.find(n => n.data.type === 'agent');
  const agentName = agentNode?.data.label?.toLowerCase().replace(/\s+/g, '_') || 'emergency_agent';
  
  return `"""Emergency Agent Template - Guaranteed Working Code"""
import os
import asyncio
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Load environment variables
load_dotenv()

# Check for required API keys
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

# Create agent with CORRECT parameter order
root_agent = LlmAgent(
    name="${agentName}",
    model="gemini-2.0-flash",
    description="Emergency fallback agent with guaranteed working configuration",
    instruction="You are a helpful assistant that can provide information and assistance.",
    tools=[]
)

async def main():
    """Run the agent with proper async pattern."""
    session_service = InMemorySessionService()
    runner = Runner(
        agent=root_agent,
        session_service=session_service,
        app_name="${agentName}"
    )
    
    try:
        # Create session with correct async pattern
        session = await session_service.create_session(
            app_name="${agentName}",
            user_id="user"
        )
        
        # Test message
        message = types.Content(
            role='user',
            parts=[types.Part(text="Hello! How can you help me?")]
        )
        
        async for event in runner.run_async(
            user_id=session.user_id,
            session_id=session.id,
            new_message=message
        ):
            print(event)
    except Exception as e:
        print(f"Error running agent: {e}")

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent"]`;
}

// Create a default MCP config
function createDefaultMcpConfig(): MCPConfig {
  return {
    enabled: true,
    type: 'smithery',
    command: 'npx',
    args: ['-y', '@smithery/cli@latest', 'run', '@smithery/mcp-example', '--key', 'smithery_api_key'],
    envVars: { 'NODE_OPTIONS': '--no-warnings --experimental-fetch', 'SMITHERY_API_KEY': 'smithery_api_key' }
  };
}

export function CodeGenerationModal({
  open,
  onOpenChange,
  nodes,
  edges,
  mcpConfig,
}: CodeGenerationModalProps) {
  const [activeTab, setActiveTab] = useState<string>('adk');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mcpEnabled, setMcpEnabled] = useState(true);
  const [isFirstGeneration, setIsFirstGeneration] = useState(true);
  const [sandboxOutput, setSandboxOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState<VerificationProgressType | null>(null);
  const [advancedVerificationResult, setAdvancedVerificationResult] = useState<AdvancedVerificationResult | null>(null);
  const [showVerificationDetails, setShowVerificationDetails] = useState(false);
  const [generationMethod, setGenerationMethod] = useState<GenerationMethod>('template');
  
  // Error checking state
  const [isCheckingErrors, setIsCheckingErrors] = useState(false);
  const [errorCheckResult, setErrorCheckResult] = useState<AdvancedVerificationResult | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [pendingErrorFixes, setPendingErrorFixes] = useState<{ errorId: string; shouldFix: boolean }[]>([]);
  
  // Version management state
  const [codeVersions, setCodeVersions] = useState<CodeVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<CodeVersion | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionLoading, setVersionLoading] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  // Helper function to toggle version code expansion
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

  // Helper function to copy version code
  const copyVersionCode = async (code: string, versionNumber: number) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Code copied",
        description: `Version v${versionNumber} code copied to clipboard`,
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy code to clipboard",
        variant: "destructive",
      });
    }
  };

  // Helper function to get or create Supabase project for current local project
  const getOrCreateSupabaseProject = async (localProject: any) => {
    try {
      // Check if we already have a mapping stored
      const mappingKey = `supabase-project-${localProject.id}`;
      const existingSupabaseId = localStorage.getItem(mappingKey);
      
      if (existingSupabaseId) {
        // Verify the project still exists
        const existing = await SupabaseProjectService.getProjectById(existingSupabaseId);
        if (existing) {
          return existing;
        } else {
          // Cleanup invalid mapping
          localStorage.removeItem(mappingKey);
        }
      }

      // Create new Supabase project
      console.log('Creating Supabase project for local project:', localProject.name);
      const supabaseProject = await SupabaseProjectService.createProject({
        name: localProject.name || 'Untitled Project',
        description: localProject.description || 'Project created from Agent Flow Builder',
        nodes: localProject.nodes || [],
        edges: localProject.edges || []
      });

      // Store the mapping for future use
      localStorage.setItem(mappingKey, supabaseProject.id);
      console.log('Created Supabase project:', supabaseProject.id);
      
      return supabaseProject;
    } catch (error) {
      console.error('Failed to get/create Supabase project:', error);
      throw error;
    }
  };

  // Helper function to save code version
  const saveCodeVersion = async (code: string, method: GenerationMethod) => {
    try {
      const currentProject = getCurrentProject();
      if (!currentProject?.id) {
        console.warn('No current project found, skipping version save');
        toast({
          title: "Version save skipped",
          description: "No project selected. Versions will be saved when you have an active project.",
          variant: "default",
        });
        return;
      }

      // Get or create corresponding Supabase project
      const supabaseProject = await getOrCreateSupabaseProject(currentProject);

      // Detect integrations for metadata
      const integrations = [];
      if (hasLangfuseNodes) integrations.push('langfuse');
      if (hasMemoryNodes) integrations.push('mem0');
      if (hasMcpNodes) integrations.push('mcp');
      if (hasEventHandlingNodes) integrations.push('event-handling');

      const metadata = {
        integrations,
        template_type: activeTab,
        generation_framework: activeTab,
        mcp_enabled: mcpEnabled,
        has_specialized_features: hasSpecializedFeatures,
        local_project_id: currentProject.id // Store reference to local project
      };

      console.log('Saving code version...', { project_id: supabaseProject.id, method, integrations });

      const version = await CodeVersionService.createCodeVersion({
        project_id: supabaseProject.id,
        code_content: code,
        generation_method: method,
        flow_snapshot: { nodes, edges },
        metadata
      });

      setCurrentVersion(version);
      
      // Refresh version list
      await loadVersionHistory();

      console.log('Code version saved successfully:', version);
      
      toast({
        title: "Version saved",
        description: `Code version v${version.version} saved successfully with ${method === 'ai' ? 'AI generation' : 'template'}.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to save code version:', error);
      toast({
        title: "Version save failed",
        description: `Failed to save code version: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Load version history
  const loadVersionHistory = async () => {
    try {
      const currentProject = getCurrentProject();
      if (!currentProject?.id) {
        console.log('No current project found, skipping version history load');
        setCodeVersions([]);
        return;
      }

      setVersionLoading(true);
      console.log('Loading version history for local project:', currentProject.id);
      
      // Check if we have a mapped Supabase project
      const mappingKey = `supabase-project-${currentProject.id}`;
      const supabaseProjectId = localStorage.getItem(mappingKey);
      
      if (!supabaseProjectId) {
        console.log('No Supabase project mapping found, no versions available yet');
        setCodeVersions([]);
        setVersionLoading(false);
        return;
      }

      console.log('Loading version history for Supabase project:', supabaseProjectId);
      const versions = await CodeVersionService.getProjectVersions(supabaseProjectId);
      setCodeVersions(versions);
      
      console.log(`Loaded ${versions.length} versions`);
      
      // Set current version to the latest if none selected
      if (!currentVersion && versions.length > 0) {
        setCurrentVersion(versions[0]); // versions are ordered by version desc
      }
    } catch (error) {
      console.error('Failed to load version history:', error);
      toast({
        title: "Failed to load versions",
        description: `Could not load version history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      setCodeVersions([]);
    } finally {
      setVersionLoading(false);
    }
  };

  // Restore a specific version
  const restoreVersion = async (version: CodeVersion) => {
    try {
      console.log('Restoring version:', version.version);
      
      setGeneratedCode(version.code_content);
      setCurrentVersion(version);
      
      // Store in localStorage for consistency
      const flowKey = getFlowKey(nodes, edges);
      storeCode(flowKey, activeTab, version.code_content);

      toast({
        title: "Version Restored",
        description: `Successfully restored to version v${version.version} (${version.generation_method === 'ai' ? 'AI generated' : 'Template'})`,
      });
    } catch (error) {
      console.error('Failed to restore version:', error);
      toast({
        title: "Restore Failed",
        description: `Failed to restore version v${version.version}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  // Check if there are MCP nodes in the diagram or if MCP is explicitly enabled
  const hasMcpNodes = nodes.some(node => 
    node.data.type === 'mcp-client' || 
    node.data.type === 'mcp-server' || 
    node.data.type === 'mcp-tool' ||
    node.data.label?.toLowerCase().includes('mcp') ||
    node.data.description?.toLowerCase().includes('mcp') ||
    node.data.description?.toLowerCase().includes('smithery')
  );

  // Enhanced detection functions - synced with backend extraction logic
  const hasLangfuseNodes = nodes.some(node => 
    node.data.type === 'langfuse' && node.data.langfuseEnabled
  );

  const hasMemoryNodes = nodes.some(node => 
    node.data.type === 'memory' && node.data.memoryEnabled
  );

  const hasEventHandlingNodes = nodes.some(node => 
    node.data.type === 'event-handling' && node.data.eventHandlingEnabled
  );

  // Check if specialized features are detected
  const hasSpecializedFeatures = hasLangfuseNodes || hasMemoryNodes || hasEventHandlingNodes;

  // Smart generation method recommendation
  const getRecommendedMethod = (): GenerationMethod => {
    return hasSpecializedFeatures ? 'template' : 'ai';
  };

  // Update generation method when features are detected
  useEffect(() => {
    const recommended = getRecommendedMethod();
    setGenerationMethod(recommended);
  }, [hasSpecializedFeatures]);

  // Load version history when modal opens
  useEffect(() => {
    if (open) {
      loadVersionHistory();
    }
  }, [open]);

  // Debug logging for integrations detection
  console.log('Integrations detection:', {
    hasLangfuseNodes,
    hasMemoryNodes,
    hasEventHandlingNodes,
    langfuseNodeCount: nodes.filter(n => n.data.type === 'langfuse').length,
    memoryNodeCount: nodes.filter(n => n.data.type === 'memory').length,
    eventHandlingNodeCount: nodes.filter(n => n.data.type === 'event-handling').length,
    enabledLangfuseNodes: nodes.filter(n => n.data.langfuseEnabled).length,
    enabledMemoryNodes: nodes.filter(n => n.data.memoryEnabled).length,
    enabledEventHandlingNodes: nodes.filter(n => n.data.eventHandlingEnabled).length,
    nodeDetails: nodes.map(n => ({
      id: n.id,
      type: n.data.type,
      label: n.data.label,
      langfuseEnabled: n.data.langfuseEnabled,
      memoryEnabled: n.data.memoryEnabled,
      eventHandlingEnabled: n.data.eventHandlingEnabled,
      description: n.data.description
    }))
  });

  // Get unique key for current flow
  const flowKey = getFlowKey(nodes, edges);

  // When the modal opens or when nodes/edges change, auto-set MCP toggle based on nodes
  useEffect(() => {
    console.log('MCP detection:', { hasMcpNodes, nodes: nodes.map(n => ({ type: n.data.type, label: n.data.label, description: n.data.description })) });
    if (hasMcpNodes) {
      console.log('MCP nodes detected, enabling MCP');
      setMcpEnabled(true);
    }
  }, [hasMcpNodes, open, nodes]);

  // Check localStorage when modal opens or framework changes
  useEffect(() => {
    if (!open) return;

    const storedCode = getStoredCode(flowKey, activeTab);
    if (storedCode) {
      setGeneratedCode(storedCode);
      setIsFirstGeneration(false);
      return;
    }

    // If no stored code, generate new code
    if (isFirstGeneration) {
      generateInitialCode();
    }
  }, [open, activeTab, flowKey]);

  // Function to generate initial code with verification
  const generateInitialCode = async (method?: GenerationMethod) => {
    const actualMethod = method || generationMethod;
    console.log('Generating initial code with method:', actualMethod);
    setLoading(true);
    setError(null);
    setVerificationProgress(null);
    setAdvancedVerificationResult(null);
    setShowVerificationDetails(false);

    try {
      let generatedCode: string;
      
      if (activeTab === 'adk') {
        console.log('Generating initial ADK code with:', { 
          method: actualMethod,
          mcpEnabled, 
          hasMcpNodes, 
          hasLangfuseNodes, 
          hasMemoryNodes, 
          hasEventHandlingNodes 
        });
        
        if (actualMethod === 'ai') {
          // Use OpenRouter AI for code generation
          if (!OPENROUTER_API_KEY) {
            throw new Error('OpenRouter API key is required for AI generation. Please configure VITE_OPENROUTER_API_KEY in your environment.');
          }
          
          console.log('Using OpenRouter AI for initial code generation (includes automatic verification)');
          generatedCode = await generateCodeWithAI(nodes, edges, mcpEnabled, OPENROUTER_API_KEY, mcpConfig);
        } else {
          // Use template code generation with node data
          console.log('Using template code generation with extracted node data');
          const extractedData = extractNodeData(nodes, edges);
          console.log('Extracted node data:', extractedData);
          generatedCode = generateTemplateFromNodeData(extractedData);
        }
      } else {
        console.log('Generating default search agent code for non-ADK tab');
        generatedCode = generateDefaultSearchAgentCode();
      }

      const formattedCode = formatCodeForDisplay(generatedCode);
      
      // Run advanced verification and error fixing
      if (OPENROUTER_API_KEY && activeTab === 'adk') {
        setVerificationProgress({
          step: 'verification',
          progress: 50,
          message: 'Running advanced verification and error fixing...'
        });
        
        try {
          const { AdvancedCodeVerifier } = await import('@/lib/verification/AdvancedCodeVerifier');
          const verifier = new AdvancedCodeVerifier(OPENROUTER_API_KEY);
          
          // Get verification options based on detected features for initial generation
          const getInitialVerificationOptions = () => {
            const hasMultipleFeatures = [hasLangfuseNodes, hasMcpNodes, hasEventHandlingNodes, hasMemoryNodes].filter(Boolean).length > 1;
            if (hasMultipleFeatures) {
              return {
                enableLangfuseChecks: hasLangfuseNodes,
                enableMcpChecks: hasMcpNodes,
                enableEventHandlingChecks: hasEventHandlingNodes,
                enableMemoryChecks: hasMemoryNodes
              };
            }
            // For single features or no features, enable all for comprehensive initial check
            return {
              enableLangfuseChecks: true,
              enableMcpChecks: true,
              enableEventHandlingChecks: true,
              enableMemoryChecks: true
            };
          };

          const initialVerificationOptions = getInitialVerificationOptions();
          const verificationResult = await verifier.verifyAndFix(formattedCode, {
            ...initialVerificationOptions,
            enableAIFixes: true,
            enablePatternFixes: true,
            maxAIRetries: 2,
            confidenceThreshold: 70,
            onProgress: (progress) => {
              setVerificationProgress({
                step: 'verification',
                progress: 50 + (progress.progress * 0.4),
                message: progress.message
              });
            },
            openRouterApiKey: OPENROUTER_API_KEY
          });
          
          setAdvancedVerificationResult(verificationResult);
          
          // Use fixed code if verification applied fixes
          if (verificationResult.fixedCode && verificationResult.metadata.fixesApplied > 0) {
            const finalCode = verificationResult.fixedCode;
            setGeneratedCode(finalCode);
            storeCode(flowKey, activeTab, finalCode);
            
            // Show verification details if errors were found and fixed
            if (verificationResult.errors.length > 0) {
              setShowVerificationDetails(true);
            }
            
            // Save version with verification metadata
            await saveCodeVersion(finalCode, actualMethod);
            
            toast({
              title: "Code Generated & Verified",
              description: `Generated code with ${verificationResult.metadata.fixesApplied} automatic fixes applied. ${
                verificationResult.errors.filter(e => e.category === 'langfuse').length > 0 
                  ? 'Langfuse compatibility issues resolved.' 
                  : ''
              }`,
              variant: "default"
            });
          } else {
            setGeneratedCode(formattedCode);
            storeCode(flowKey, activeTab, formattedCode);
            await saveCodeVersion(formattedCode, actualMethod);
          }
          
        } catch (verificationError) {
          console.warn('Advanced verification failed, using original code:', verificationError);
          setGeneratedCode(formattedCode);
          storeCode(flowKey, activeTab, formattedCode);
          await saveCodeVersion(formattedCode, actualMethod);
        }
      } else {
        setGeneratedCode(formattedCode);
        storeCode(flowKey, activeTab, formattedCode);
        await saveCodeVersion(formattedCode, actualMethod);
      }
      
      setIsFirstGeneration(false);
      setVerificationProgress(null);
      
      console.log('Initial code generation completed successfully');
    } catch (error) {
      console.error('Error generating initial code:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred generating code';
      setError(errorMessage);

      toast({
        title: "Code Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setVerificationProgress(null);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Code copied!",
      description: "The generated code has been copied to your clipboard.",
    });
  };

  // Update the regenerate button click handler with verification
  const handleRegenerate = async (method?: GenerationMethod) => {
    const actualMethod = method || generationMethod;
    console.log('Regenerating code with method:', actualMethod);
    setLoading(true);
    setError(null);
    setSandboxOutput('');
    setVerificationProgress(null);
    setAdvancedVerificationResult(null);
    setShowVerificationDetails(false);
    
    try {
      let generatedCode: string;
      
      if (activeTab === 'adk') {
        console.log('Regenerating ADK code with:', { 
          method: actualMethod,
          mcpEnabled, 
          hasMcpNodes, 
          hasLangfuseNodes, 
          hasMemoryNodes, 
          hasEventHandlingNodes 
        });
        
        // If we have MCP components, enable MCP mode
        if (hasMcpNodes && !mcpEnabled) {
          setMcpEnabled(true);
        }
        
        if (actualMethod === 'ai') {
          // Use OpenRouter AI for code generation
          if (!OPENROUTER_API_KEY) {
            throw new Error('OpenRouter API key is required for AI generation. Please configure VITE_OPENROUTER_API_KEY in your environment.');
          }
          
          console.log('Using OpenRouter AI for code regeneration (includes automatic verification)');
          generatedCode = await generateCodeWithAI(nodes, edges, mcpEnabled, OPENROUTER_API_KEY, mcpConfig);
        } else {
          // Use template code generation with node data
          console.log('Using template code generation with extracted node data');
          const extractedData = extractNodeData(nodes, edges);
          console.log('Extracted node data for regeneration:', extractedData);
          generatedCode = generateTemplateFromNodeData(extractedData);
        }
      } else {
        console.log('Generating default search agent code for non-ADK tab');
        generatedCode = generateDefaultSearchAgentCode();
      }

      const formattedCode = formatCodeForDisplay(generatedCode);
      
      // Run advanced verification and error fixing
      if (OPENROUTER_API_KEY && activeTab === 'adk') {
        setVerificationProgress({
          step: 'verification',
          progress: 50,
          message: 'Running advanced verification and error fixing...'
        });
        
        try {
          const { AdvancedCodeVerifier } = await import('@/lib/verification/AdvancedCodeVerifier');
          const verifier = new AdvancedCodeVerifier(OPENROUTER_API_KEY);
          
          // Get verification options based on detected features for regeneration
          const getRegenerateVerificationOptions = () => {
            const hasMultipleFeatures = [hasLangfuseNodes, hasMcpNodes, hasEventHandlingNodes, hasMemoryNodes].filter(Boolean).length > 1;
            if (hasMultipleFeatures) {
              return {
                enableLangfuseChecks: hasLangfuseNodes,
                enableMcpChecks: hasMcpNodes,
                enableEventHandlingChecks: hasEventHandlingNodes,
                enableMemoryChecks: hasMemoryNodes
              };
            }
            // For single features or no features, enable all for comprehensive check
            return {
              enableLangfuseChecks: true,
              enableMcpChecks: true,
              enableEventHandlingChecks: true,
              enableMemoryChecks: true
            };
          };

          const regenerateVerificationOptions = getRegenerateVerificationOptions();
          const verificationResult = await verifier.verifyAndFix(formattedCode, {
            ...regenerateVerificationOptions,
            enableAIFixes: true,
            enablePatternFixes: true,
            maxAIRetries: 2,
            confidenceThreshold: 70,
            onProgress: (progress) => {
              setVerificationProgress({
                step: 'verification',
                progress: 50 + (progress.progress * 0.4),
                message: progress.message
              });
            },
            openRouterApiKey: OPENROUTER_API_KEY
          });
          
          setAdvancedVerificationResult(verificationResult);
          
          // Use fixed code if verification applied fixes
          if (verificationResult.fixedCode && verificationResult.metadata.fixesApplied > 0) {
            const finalCode = verificationResult.fixedCode;
            setGeneratedCode(finalCode);
            storeCode(flowKey, activeTab, finalCode);
            
            // Show verification details if errors were found and fixed
            if (verificationResult.errors.length > 0) {
              setShowVerificationDetails(true);
            }
            
            // Save version with verification metadata
            await saveCodeVersion(finalCode, actualMethod);
          } else {
            setGeneratedCode(formattedCode);
            storeCode(flowKey, activeTab, formattedCode);
            await saveCodeVersion(formattedCode, actualMethod);
          }
          
        } catch (verificationError) {
          console.warn('Advanced verification failed, using original code:', verificationError);
          setGeneratedCode(formattedCode);
          storeCode(flowKey, activeTab, formattedCode);
          await saveCodeVersion(formattedCode, actualMethod);
        }
      } else {
        setGeneratedCode(formattedCode);
        storeCode(flowKey, activeTab, formattedCode);
        await saveCodeVersion(formattedCode, actualMethod);
      }
      
      setVerificationProgress(null);
      
      const features = [];
      if (mcpEnabled) features.push('MCP tools');
      if (hasEventHandlingNodes) features.push('event handling');
      if (hasLangfuseNodes) features.push('Langfuse analytics');
      if (hasMemoryNodes) features.push('Mem0 memory');
      
      // Enhanced toast message with verification info
      const verificationInfo = advancedVerificationResult && advancedVerificationResult.metadata.fixesApplied > 0
        ? ` (${advancedVerificationResult.metadata.fixesApplied} fixes applied)`
        : '';
      
      toast({
        title: "Code regenerated",
        description: `The code has been regenerated successfully${features.length > 0 ? ` with ${features.join(', ')}` : ''} using ${actualMethod} method${verificationInfo}.`
      });
      
      console.log('Code regeneration completed successfully');
    } catch (error) {
      console.error('Error regenerating code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate code';
      setError(errorMessage);
      
      toast({
        title: "Code Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setVerificationProgress(null);
    }
  };

  const executeInSandbox = async (code: string) => {
    const startTime = performance.now();
    setIsExecuting(true);
    setSandboxOutput('');

    try {
      if (!code.trim()) {
        throw new Error('No code provided to execute');
      }

      // Split the code into agent.py and __init__.py
      const agentCode = code;
      const initCode = `from .agent import root_agent

__all__ = ["root_agent"]`;

      // Call our API endpoint with both files
      const response = await fetch('https://agent-flow-builder-api.onrender.com/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'agent.py': agentCode,
            '__init__.py': initCode
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Check if result contains a URL in output or as a dedicated field
      let urlInfo = '';
      if (result.url) {
        urlInfo = `\n🌐 Service URL: ${result.url}`;
      } else if (result.serviceUrl) {
        urlInfo = `\n🌐 Service URL: ${result.serviceUrl}`;
      }
      
      // Format and display the output
      const executionTime = performance.now() - startTime;
      const formattedOutput = [
        `✨ Execution completed in ${executionTime.toFixed(2)}ms`,
        '📤 Output:',
        result.output || 'No output generated',
        result.error ? `\n❌ Error:\n${result.error}` : '',
        urlInfo,
        '\n📊 Execution Details:',
        `• Status: ${result.executionDetails?.status || 'unknown'}`,
        `• Exit Code: ${result.executionDetails?.exitCode}`,
        `• Memory Usage: ${result.memoryUsage?.toFixed(2)}MB`,
      ].join('\n');

      setSandboxOutput(formattedOutput);
    } catch (error) {
      console.error('Error executing code:', error);
      setSandboxOutput(`❌ Error executing code: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle manual error checking
  const handleCheckForErrors = async () => {
    if (!generatedCode.trim()) {
      toast({
        title: "No code to check",
        description: "Please generate some code first before checking for errors.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingErrors(true);
    setErrorCheckResult(null);

    try {
      // Determine current mode based on detected features
      const getVerificationOptionsForCurrentMode = () => {
        const hasMultipleFeatures = [hasLangfuseNodes, hasMcpNodes, hasEventHandlingNodes, hasMemoryNodes].filter(Boolean).length > 1;
        
        if (hasMultipleFeatures) {
          // Combined mode - enable all relevant checks
          return {
            enableLangfuseChecks: hasLangfuseNodes,
            enableMcpChecks: hasMcpNodes,
            enableEventHandlingChecks: hasEventHandlingNodes,
            enableMemoryChecks: hasMemoryNodes
          };
        }
        
        // Single feature mode - only enable relevant check
        if (hasEventHandlingNodes) {
          return {
            enableLangfuseChecks: false,
            enableMcpChecks: false,
            enableEventHandlingChecks: true,
            enableMemoryChecks: false
          };
        }
        
        if (hasLangfuseNodes) {
          return {
            enableLangfuseChecks: true,
            enableMcpChecks: false,
            enableEventHandlingChecks: false,
            enableMemoryChecks: false
          };
        }
        
        if (hasMemoryNodes) {
          return {
            enableLangfuseChecks: false,
            enableMcpChecks: false,
            enableEventHandlingChecks: false,
            enableMemoryChecks: true
          };
        }
        
        if (hasMcpNodes) {
          return {
            enableLangfuseChecks: false,
            enableMcpChecks: true,
            enableEventHandlingChecks: false,
            enableMemoryChecks: false
          };
        }
        
        // Default: no specific error checks for standard modes
        return {
          enableLangfuseChecks: false,
          enableMcpChecks: false,
          enableEventHandlingChecks: false,
          enableMemoryChecks: false
        };
      };

      const verifier = new AdvancedCodeVerifier(OPENROUTER_API_KEY);
      const modeVerificationOptions = getVerificationOptionsForCurrentMode();
      
      // Only detect errors, don't fix them yet
      const result = await verifier.verifyAndFix(generatedCode, {
        ...modeVerificationOptions,
        enableAIFixes: false, // Don't auto-fix, let user decide
        enablePatternFixes: false, // Don't auto-fix, let user decide
        maxAIRetries: 0, // Skip AI detection for now, just use pattern detection
        onProgress: (progress) => {
          console.log('Error checking progress:', progress);
        }
      });

      console.log('Context-aware error detection result:', {
        detectedFeatures: {
          langfuse: hasLangfuseNodes,
          mcp: hasMcpNodes,
          eventHandling: hasEventHandlingNodes,
          memory: hasMemoryNodes
        },
        appliedChecks: modeVerificationOptions,
        result
      });
      setErrorCheckResult(result);
      
      if (result.errors.length === 0) {
        toast({
          title: "No errors found! ✅",
          description: "Your code looks good! No issues were detected.",
          variant: "default",
        });
      } else {
        const autoFixableCount = result.errors.filter(error => error.autoFixable).length;
        const langfuseErrors = result.errors.filter(error => error.category === 'langfuse').length;
        
        toast({
          title: `Found ${result.errors.length} issue(s) 🔍`,
          description: `${autoFixableCount} can be auto-fixed. ${langfuseErrors} Langfuse compatibility issues detected.`,
          variant: "default",
        });
        
        setShowErrorDialog(true);
        // Initialize all auto-fixable errors as selected by default
        const initialPendingFixes = result.errors
          .filter(error => error.autoFixable)
          .map(error => ({ errorId: error.id, shouldFix: true })); // Auto-select for user convenience
        setPendingErrorFixes(initialPendingFixes);
      }
    } catch (error) {
      console.error('Error checking failed:', error);
      toast({
        title: "Error checking failed",
        description: `Failed to check code for errors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsCheckingErrors(false);
    }
  };

  // Handle applying error fixes based on user decisions
  const handleApplyErrorFixes = async () => {
    if (!errorCheckResult || pendingErrorFixes.length === 0) {
      setShowErrorDialog(false);
      return;
    }

    const fixesToApply = pendingErrorFixes.filter(fix => fix.shouldFix);
    
    if (fixesToApply.length === 0) {
      setShowErrorDialog(false);
      toast({
        title: "No fixes selected",
        description: "No errors were selected for fixing.",
        variant: "default",
      });
      return;
    }

    setIsCheckingErrors(true);
    
    try {
      // Get only the errors user wants to fix
      const selectedErrors = errorCheckResult.errors.filter(error => 
        fixesToApply.some(fix => fix.errorId === error.id)
      );

      console.log('Selected errors for fixing:', selectedErrors);

      // Use AI to fix the code with the specific errors
      if (!OPENROUTER_API_KEY) {
        toast({
          title: "OpenRouter API Key Missing",
          description: "OpenRouter API key is required for AI-powered error fixing. Please check your environment variables.",
          variant: "destructive",
        });
        return;
      }

      // Create a detailed fixing prompt
      const errorDescriptions = selectedErrors.map(error => 
        `- ${error.type}: ${error.message}${error.line ? ` (Line ${error.line})` : ''}`
      ).join('\n');

      const fixingPrompt = `Fix the following errors in this Python Google ADK agent code:

ERRORS TO FIX:
${errorDescriptions}

ORIGINAL CODE:
\`\`\`python
${generatedCode}
\`\`\`

REQUIREMENTS:
1. Fix only the specified errors
2. Maintain all existing functionality
3. Keep the code structure intact
4. Ensure Langfuse 3.0+ compatibility
5. Use proper error handling

Please return ONLY the fixed Python code without any explanations or markdown formatting.`;

      console.log('Sending AI fixing request...');

      const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://localhost',
          'X-Title': 'Agent Flow Builder - Error Fixing'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert Python developer specializing in Google ADK agents and error fixing. Your task is to fix specific errors while preserving all functionality. Return ONLY the corrected code without explanations.'
            },
            {
              role: 'user',
              content: fixingPrompt
            }
          ],
          temperature: 0.1,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const fixedCode = result.choices?.[0]?.message?.content;

      if (!fixedCode) {
        throw new Error('No fixed code received from AI');
      }

      console.log('AI fixed code received');

      // Clean up the code (remove any potential markdown formatting)
      const cleanedCode = fixedCode
        .replace(/```python\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Verify the fix worked by checking if it's actually different
      if (cleanedCode === generatedCode) {
        toast({
          title: "No changes needed",
          description: "AI determined that no changes were needed for the selected errors.",
          variant: "default",
        });
      } else {
        setGeneratedCode(cleanedCode);
        
        // Save the fixed version
        await saveCodeVersion(cleanedCode, 'template');
        
        toast({
          title: "Errors fixed successfully!",
          description: `AI has fixed ${selectedErrors.length} error(s) in your code. The code has been updated and saved.`,
          variant: "default",
        });

        console.log('Code successfully fixed and updated');
      }

    } catch (error) {
      console.error('Error fixing failed:', error);
      toast({
        title: "Error fixing failed",
        description: `Failed to fix errors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsCheckingErrors(false);
      setShowErrorDialog(false);
      setPendingErrorFixes([]);
    }
  };

  // Error Check Dialog Component
  const ErrorCheckDialog = () => {
    if (!errorCheckResult || !showErrorDialog) return null;

    const getErrorIcon = (severity: string) => {
      switch (severity) {
        case 'error': return '🔴';
        case 'warning': return '🟡';
        case 'info': return '🔵';
        default: return '⚪';
      }
    };

    const getCategoryColor = (category: string) => {
      switch (category) {
        case 'langfuse': return 'border-purple-200 bg-purple-50';
        case 'mcp': return 'border-blue-200 bg-blue-50';
        case 'event-handling': return 'border-orange-200 bg-orange-50';
        case 'memory': return 'border-teal-200 bg-teal-50';
        case 'syntax': return 'border-red-200 bg-red-50';
        case 'security': return 'border-yellow-200 bg-yellow-50';
        default: return 'border-gray-200 bg-gray-50';
      }
    };

    const autoFixableErrors = errorCheckResult.errors.filter(error => error.autoFixable);

    return (
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Found {errorCheckResult.errors.length} Issue(s) in Your Code
            </DialogTitle>
            <DialogDescription>
              AI has detected some issues in your code. Review the errors below and select which ones you'd like AI to fix automatically. Issues are pre-selected for your convenience.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{errorCheckResult.errors.filter(e => e.severity === 'error').length}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{errorCheckResult.errors.filter(e => e.severity === 'warning').length}</div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{autoFixableErrors.length}</div>
                <div className="text-sm text-gray-600">Auto-fixable</div>
              </div>
            </div>

            {/* Error List */}
            <div className="space-y-3">
              {errorCheckResult.errors.map((error) => (
                <div key={error.id} className={`border rounded-lg p-4 ${getCategoryColor(error.category)}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <span className="text-lg">{getErrorIcon(error.severity)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{error.type.replace(/-/g, ' ').replace(/_/g, ' ')}</h4>
                          <p className="text-sm text-gray-600 mt-1">{error.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="capitalize">Category: {error.category}</span>
                            <span className="capitalize">Severity: {error.severity}</span>
                            {error.line && <span>Line: {error.line}</span>}
                          </div>
                        </div>
                        {error.autoFixable && (
                          <div className="flex items-center space-x-2 ml-4">
                            <Checkbox
                              id={`fix-${error.id}`}
                              checked={pendingErrorFixes.some(fix => fix.errorId === error.id && fix.shouldFix)}
                              onCheckedChange={(checked) => {
                                setPendingErrorFixes(prev => {
                                  const existing = prev.find(fix => fix.errorId === error.id);
                                  if (existing) {
                                    return prev.map(fix => 
                                      fix.errorId === error.id 
                                        ? { ...fix, shouldFix: checked as boolean }
                                        : fix
                                    );
                                  } else {
                                    return [...prev, { errorId: error.id, shouldFix: checked as boolean }];
                                  }
                                });
                              }}
                            />
                            <label htmlFor={`fix-${error.id}`} className="text-sm font-medium text-green-700 cursor-pointer">
                              Fix this error
                            </label>
                          </div>
                        )}
                      </div>
                      {error.fixDescription && (
                        <div className="mt-2 p-2 bg-white rounded border text-xs text-gray-600">
                          <strong>How it will be fixed:</strong> {error.fixDescription}
                        </div>
                      )}
                      {error.originalCode && (
                        <div className="mt-2 p-2 bg-gray-800 rounded text-xs">
                          <div className="text-gray-400 mb-1">Original code:</div>
                          <code className="text-green-400">{error.originalCode}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-600">
                {pendingErrorFixes.filter(fix => fix.shouldFix).length} of {autoFixableErrors.length} errors selected for fixing
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowErrorDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleApplyErrorFixes}
                  disabled={pendingErrorFixes.filter(fix => fix.shouldFix).length === 0 || isCheckingErrors}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isCheckingErrors ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI is fixing errors...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Apply AI Fixes ({pendingErrorFixes.filter(fix => fix.shouldFix).length})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-7xl h-[95vh] max-h-[95vh] sm:w-[95vw] sm:h-[90vh] sm:max-h-[90vh] lg:max-w-6xl bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent from-zinc-300/5 via-purple-400/10 backdrop-blur-xl border-[2px] border-white/10 shadow-2xl p-0 overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b-[2px] border-white/10 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-transparent from-purple-400/5 via-orange-200/5 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent from-purple-400/20 via-orange-200/20 border border-purple-500/30 border-purple-400/30">
              <Code className="w-5 h-5 text-purple-600 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 from-purple-300 to-orange-200">
                Generated Agent Code
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-gray-300 mt-1">
                <div className="space-y-2">
                  <p>Your visual workflow has been converted into production-ready code{
                    [
                      hasEventHandlingNodes && 'comprehensive event handling',
                      hasMemoryNodes && 'persistent memory',
                      hasLangfuseNodes && 'analytics and observability'
                    ].filter(Boolean).length > 0 
                      ? ' with ' + [
                          hasEventHandlingNodes && 'comprehensive event handling',
                          hasMemoryNodes && 'persistent memory',
                          hasLangfuseNodes && 'analytics and observability'
                        ].filter(Boolean).join(', ')
                      : ''
                  }. This code can be deployed and run anywhere.</p>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-700 text-green-400">No coding required</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-700 text-blue-400">Production ready</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-purple-700 text-purple-400">Instantly deployable</span>
                    </div>
                    {hasLangfuseNodes && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                        <span className="text-violet-700 text-violet-400">Analytics enabled</span>
                      </div>
                    )}
                    {hasMemoryNodes && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                        <span className="text-pink-700 text-pink-400">Memory enabled</span>
                      </div>
                    )}
                    {hasEventHandlingNodes && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span className="text-amber-700 text-amber-400">Event handling enabled</span>
                      </div>
                    )}
                  </div>
                  {!isFirstGeneration && (
                    <span className="text-sm text-gray-500 text-gray-400"> (Loaded from saved version)</span>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="adk" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="flex-shrink-0 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent from-zinc-300/10 via-gray-400/10 backdrop-blur-sm border-[2px] border-white/10 p-1 mx-6 mt-4">
            <TabsTrigger 
              value="adk" 
              className="data-[state=active]:bg-gradient-to-tr data-[state=active]:from-purple-500/20 data-[state=active]:via-pink-500/20 data-[state=active]:to-transparent data-[state=active]:from-purple-400/20 data-[state=active]:via-orange-200/20 data-[state=active]:text-purple-700 data-[state=active]:text-purple-300 data-[state=active]:border data-[state=active]:border-purple-500/30 data-[state=active]:border-purple-400/30"
            >
              Google ADK
            </TabsTrigger>
            <TabsTrigger 
              value="vertex"
              className="data-[state=active]:bg-gradient-to-tr data-[state=active]:from-purple-500/20 data-[state=active]:via-pink-500/20 data-[state=active]:to-transparent data-[state=active]:from-purple-400/20 data-[state=active]:via-orange-200/20 data-[state=active]:text-purple-700 data-[state=active]:text-purple-300 data-[state=active]:border data-[state=active]:border-purple-500/30 data-[state=active]:border-purple-400/30"
            >
              Vertex AI
            </TabsTrigger>
            <TabsTrigger 
              value="custom"
              className="data-[state=active]:bg-gradient-to-tr data-[state=active]:from-purple-500/20 data-[state=active]:via-pink-500/20 data-[state=active]:to-transparent data-[state=active]:from-purple-400/20 data-[state=active]:via-orange-200/20 data-[state=active]:text-purple-700 data-[state=active]:text-purple-300 data-[state=active]:border data-[state=active]:border-purple-500/30 data-[state=active]:border-purple-400/30"
            >
              Custom Agent
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 flex flex-col px-6 pb-6">
              {activeTab === 'adk' && (
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={mcpEnabled}
                      onChange={() => {
                        const newValue = !mcpEnabled;
                        setMcpEnabled(newValue);
                        if (newValue && !isFirstGeneration) {
                          toast({
                            title: "MCP Enabled",
                            description: "Regenerating code with MCP support...",
                            variant: "default"
                          });
                          setTimeout(() => handleRegenerate(), 500);
                        }
                      }}
                      disabled={hasMcpNodes}
                    />
                    <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-focus:ring-blue-800 bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-blue-600 ${hasMcpNodes ? 'opacity-60' : ''}`}></div>
                    <span className="ms-3 text-sm font-medium">Enable MCP Integration</span>
                  </label>
                  {hasMcpNodes && (
                    <span className="text-xs text-yellow-500">
                      (MCP nodes detected in diagram)
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => generateInitialCode('ai')}
                    disabled={loading || isExecuting}
                    variant={generationMethod === 'ai' ? 'default' : 'outline'}
                    size="sm"
                    className={hasSpecializedFeatures ? 'opacity-60' : ''}
                  >
                    {loading && generationMethod === 'ai' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    AI Generation
                  </Button>
                  <Button
                    onClick={() => generateInitialCode('template')}
                    disabled={loading || isExecuting}
                    variant={generationMethod === 'template' ? 'default' : 'outline'}
                    size="sm"
                    className={hasSpecializedFeatures ? 'ring-2 ring-blue-500' : ''}
                  >
                    {loading && generationMethod === 'template' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Code className="mr-2 h-4 w-4" />
                    )}
                    Template Code
                    {hasSpecializedFeatures && (
                      <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">Recommended</span>
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            <div className="flex flex-col space-y-4">
              {error && (
                <div className="mb-4 p-3 bg-red-50 bg-red-950/30 border border-red-200 border-red-800 rounded-lg text-red-800 text-red-300 text-sm flex items-center gap-2 flex-shrink-0">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Verification Progress Display */}
              <div className="flex-shrink-0">
                <VerificationProgressComponent progress={verificationProgress} />
              </div>

              {/* Advanced Verification Results Display */}
              <div className="flex-shrink-0">
                <AdvancedVerificationDisplay 
                  result={advancedVerificationResult}
                  show={showVerificationDetails}
                  onToggle={() => setShowVerificationDetails(!showVerificationDetails)}
                />
              </div>

              {/* Detection Status Display */}
              {hasSpecializedFeatures && (
                <div className="mb-4 p-3 bg-blue-50/50 border border-blue-200 rounded-lg flex-shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-800">Specialized Features Detected</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {hasLangfuseNodes && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Langfuse Analytics</span>
                    )}
                    {hasMemoryNodes && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Mem0 Memory</span>
                    )}
                    {hasEventHandlingNodes && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Event Handling</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-blue-600">
                    💡 Template Code is recommended for specialized features to ensure proper implementation.
                  </div>
                </div>
              )}

              {/* Version Management Section - Always Visible */}
              <div className="flex-shrink-0 mb-4">
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-medium text-gray-200">Version History</span>
                    </div>
                    {codeVersions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-medium">
                          {codeVersions.length} version{codeVersions.length !== 1 ? 's' : ''}
                        </span>
                        {currentVersion && (
                          <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                            Current: v{currentVersion.version}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-purple-200"
                    onClick={() => setShowVersionHistory(!showVersionHistory)}
                    disabled={versionLoading}
                  >
                    {showVersionHistory ? 'Hide History' : 'Show History'}
                  </Button>
                </div>

                {/* Version History Panel */}
                {showVersionHistory && (
                  <div className="mt-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-400" />
                        Code Versions
                      </h3>
                      {versionLoading && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                          <span className="text-xs text-gray-400">Loading...</span>
                        </div>
                      )}
                    </div>
                    
                    {!versionLoading && codeVersions.length === 0 ? (
                      <div className="text-center py-6 text-sm text-gray-400">
                        <div className="mb-2">No versions saved yet</div>
                        <div className="text-xs text-gray-500">Generate code to create your first version automatically</div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {codeVersions.map((version) => {
                          const isExpanded = expandedVersions.has(version.id);
                          const isActive = currentVersion?.id === version.id;
                          
                          return (
                            <div
                              key={version.id}
                              className={`rounded border transition-all ${
                                isActive
                                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-sm'
                                  : 'bg-gray-700/50 border-gray-600 text-gray-300'
                              }`}
                            >
                              {/* Version Header */}
                              <div className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono bg-gray-600 px-2 py-1 rounded">
                                      v{version.version}
                                    </span>
                                    <span className="text-xs">
                                      {version.generation_method === 'ai' ? '🤖 AI Generated' : '📋 Template'}
                                    </span>
                                    {version.metadata?.integrations && version.metadata.integrations.length > 0 && (
                                      <div className="flex gap-1">
                                        {version.metadata.integrations.map((integration: string) => (
                                          <span key={integration} className="text-xs bg-blue-500/20 text-blue-300 px-1 rounded">
                                            {integration}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    {new Date(version.created_at).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                </div>
                                
                                {isActive && (
                                  <div className="mt-1 text-xs text-purple-300 flex items-center gap-1">
                                    <span className="w-1 h-1 bg-purple-400 rounded-full"></span>
                                    Currently active
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      restoreVersion(version);
                                    }}
                                    className="h-7 px-2 text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30"
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    Restore
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyVersionCode(version.code_content, version.version);
                                    }}
                                    className="h-7 px-2 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleVersionExpansion(version.id);
                                    }}
                                    className="h-7 px-2 text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <EyeOff className="h-3 w-3 mr-1" />
                                        Hide Code
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="h-3 w-3 mr-1" />
                                        View Code
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>

                              {/* Expandable Code Section */}
                              {isExpanded && (
                                <div className="border-t border-gray-600 bg-gray-800/30">
                                  <div className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-400">Code Preview</span>
                                      <span className="text-xs text-gray-500">
                                        {version.code_content.split('\n').length} lines
                                      </span>
                                    </div>
                                    <div className="relative rounded-lg border border-gray-600 overflow-hidden">
                                      <div className="max-h-60 overflow-y-auto">
                                        <SyntaxHighlighter
                                          language="python"
                                          style={vscDarkPlus}
                                          showLineNumbers={true}
                                          customStyle={{
                                            fontSize: '11px',
                                            margin: 0,
                                            padding: '12px',
                                            backgroundColor: '#1a1a1a',
                                            border: 'none'
                                          }}
                                          lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap' } }}
                                          wrapLines={true}
                                        >
                                          {version.code_content}
                                        </SyntaxHighlighter>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-3 bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-xl text-gray-200 h-[400px]">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                  <div className="text-center">
                    <div className="text-sm font-medium">{verificationProgress ? verificationProgress.message : "Generating your agent code..."}</div>
                    <div className="text-xs text-gray-400 mt-1">This may take a few moments</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="relative rounded-xl border border-gray-700 h-[500px]">
                    <div className="h-full overflow-hidden">
                      <CodeHighlighter code={generatedCode} />
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-gray-800/90 hover:bg-gray-700/90 flex items-center gap-2 text-xs"
                        onClick={() => executeInSandbox(generatedCode)}
                        disabled={loading || isExecuting}
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin text-gray-200" />
                            <span className="text-gray-200">Running...</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 text-green-400" />
                            <span className="text-gray-200">Test Run</span>
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-gray-800/90 hover:bg-gray-700/90 flex items-center gap-2 text-xs"
                        onClick={handleCopyCode}
                        disabled={loading}
                      >
                        <Copy className="h-3 w-3 text-blue-400" />
                        <span className="text-gray-200">Copy Code</span>
                      </Button>
                    </div>
                  </div>
                  
                  {sandboxOutput && (
                    <div className="flex-shrink-0 mt-4">
                      <SandboxOutput output={sandboxOutput} />
                    </div>
                  )}

                </div>
              )}
            </div>
            
            <div className="flex-shrink-0 mt-4 p-3 rounded-lg bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/20 from-blue-950/20 via-purple-950/20 to-pink-950/20 border border-blue-200/50 border-blue-800/50">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-blue-500/20 border border-blue-500/30 flex-shrink-0">
                  <Sparkles className="w-3 h-3 text-blue-600 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-blue-800 text-blue-300 mb-1">
                    🚀 What you get:
                  </h4>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-blue-700 text-blue-400">
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      <span>Production-ready code</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      <span>Error handling built-in</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      <span>Cloud deployable</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      <span>No coding needed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0 flex justify-between items-center border-t border-white/10 bg-gradient-to-r from-purple-500/2 via-pink-500/2 to-transparent from-purple-400/2 via-orange-200/2 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="text-xs text-muted-foreground">
              {isFirstGeneration ? '✨ Fresh generation' : '💾 Saved version'}
            </div>
            {hasSpecializedFeatures && (
              <div className="flex items-center gap-2 text-xs text-blue-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Specialized features detected</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Ready to deploy</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
              Close
            </Button>
            <Button
              onClick={handleCheckForErrors}
              disabled={loading || isExecuting || isCheckingErrors || !generatedCode.trim()}
              variant="outline"
              size="sm"
              className="relative"
            >
              {isCheckingErrors ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <AlertCircle className="mr-2 h-3 w-3" />
              )}
              {isCheckingErrors ? 'Checking...' : 'Check for Errors'}
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => handleRegenerate('ai')}
                disabled={loading || isExecuting}
                variant={generationMethod === 'ai' ? 'default' : 'outline'}
                size="sm"
                className={hasSpecializedFeatures ? 'opacity-60' : ''}
              >
                {loading && generationMethod === 'ai' ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-3 w-3" />
                )}
                AI Generation
              </Button>
              <span className="relative inline-block overflow-hidden rounded-lg p-[1px]">
                <span className={`absolute inset-[-1000%] animate-[spin_2s_linear_infinite] ${hasSpecializedFeatures ? 'bg-[conic-gradient(from_90deg_at_50%_50%,#3B82F6_0%,#1D4ED8_50%,#3B82F6_100%)]' : 'bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]'}`} />
                <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-lg bg-gray-950 backdrop-blur-3xl">
                  <Button
                    onClick={() => handleRegenerate('template')}
                    disabled={loading || isExecuting}
                    size="sm"
                    className={`${hasSpecializedFeatures ? 'bg-gradient-to-tr from-blue-400/20 via-blue-600/30 to-transparent border-0 hover:scale-105' : 'bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent from-zinc-300/5 via-purple-400/20 border-0 hover:scale-105'}`}
                  >
                    {loading && generationMethod === 'template' ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    ) : (
                      <Code className="h-3 w-3 mr-2" />
                    )}
                    Template Code
                    {hasSpecializedFeatures && (
                      <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">★</span>
                    )}
                  </Button>
                </div>
              </span>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ErrorCheckDialog />
    </>
  );
}