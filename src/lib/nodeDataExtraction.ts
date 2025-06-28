import type { Node, Edge } from '@xyflow/react';
import type { BaseNodeData } from '@/components/nodes/BaseNode';
import type { MCPConfig, LangfuseConfig, MemoryConfig, EventHandlingConfig } from './codeGeneration';

export interface ExtractedNodeData {
  // Agent configuration
  agentName: string;
  agentDescription: string;
  agentInstruction: string;
  agentModel: string;
  
  // Tool configuration
  tools: ToolConfig[];
  
  // MCP configuration
  mcpConfigs: MCPConfig[];
  
  // Feature configurations
  langfuseConfig: LangfuseConfig | null;
  memoryConfig: MemoryConfig | null;
  eventHandlingConfig: EventHandlingConfig | null;
  
  // Flow metadata
  inputNodes: BaseNodeData[];
  outputNodes: BaseNodeData[];
  modelNodes: BaseNodeData[];
}

export interface ToolConfig {
  name: string;
  type: string;
  description: string;
  configuration: Record<string, unknown>;
}

/**
 * Extract comprehensive node data from the flow diagram
 */
export function extractNodeData(nodes: Node<BaseNodeData>[], edges: Edge[]): ExtractedNodeData {
  // Find agent node (primary configuration source)
  const agentNode = nodes.find(n => n.data.type === 'agent');
  
  // Extract agent configuration
  const agentName = sanitizeName(agentNode?.data.label || 'FlowAgent');
  const agentDescription = agentNode?.data.description || 'AI agent generated from flow diagram';
  const agentInstruction = agentNode?.data.instruction || agentNode?.data.prompt || 'You are a helpful assistant.';
  
  // Extract model configuration
  const modelNode = nodes.find(n => n.data.type === 'model');
  const agentModel = modelNode?.data.modelType || agentNode?.data.modelType || 'gemini-2.0-flash';
  
  // Extract tool configurations
  const toolNodes = nodes.filter(n => n.data.type === 'tool');
  const tools: ToolConfig[] = toolNodes.map(node => ({
    name: sanitizeName(node.data.label || 'tool'),
    type: node.data.type,
    description: node.data.description || 'Custom tool',
    configuration: {
      instruction: node.data.instruction,
      prompt: node.data.prompt,
      ...extractNodeProperties(node.data)
    }
  }));
  
  // Extract MCP configurations
  const mcpNodes = nodes.filter(n => 
    n.data.type === 'mcp-client' || 
    n.data.type === 'mcp-server' || 
    n.data.type === 'mcp-tool'
  );
  
  const mcpConfigs: MCPConfig[] = mcpNodes.map(node => {
    const mcpPackage = node.data.smitheryMcp as string || '';
    const mcpCommand = node.data.mcpCommand as string || 'npx';
    const mcpArgs = Array.isArray(node.data.mcpArgs) 
      ? node.data.mcpArgs as string[]
      : (node.data.mcpArgs as string || '').split(' ').filter(Boolean);
    
    const defaultArgs = ['-y', '@smithery/cli@latest', 'run', mcpPackage];
    const finalArgs = mcpArgs.length > 0 ? mcpArgs : defaultArgs;
    
    return {
      enabled: true,
      type: 'smithery',
      command: mcpCommand,
      args: finalArgs,
      envVars: typeof node.data.mcpEnvVars === 'object' 
        ? node.data.mcpEnvVars as { [key: string]: string }
        : { 'NODE_OPTIONS': '--no-warnings --experimental-fetch' },
      smitheryMcp: mcpPackage,
      smitheryApiKey: node.data.smitheryApiKey as string,
      profileId: node.data.profileId as string,
      availableFunctions: node.data.description || 'operations'
    };
  });
  
  // Extract specialized feature configurations
  const langfuseConfig = extractLangfuseConfig(nodes);
  const memoryConfig = extractMemoryConfig(nodes);
  const eventHandlingConfig = extractEventHandlingConfig(nodes);
  
  // Extract other node types
  const inputNodes = nodes.filter(n => n.data.type === 'input').map(n => n.data);
  const outputNodes = nodes.filter(n => n.data.type === 'output').map(n => n.data);
  const modelNodes = nodes.filter(n => n.data.type === 'model').map(n => n.data);
  
  return {
    agentName,
    agentDescription,
    agentInstruction,
    agentModel,
    tools,
    mcpConfigs,
    langfuseConfig,
    memoryConfig,
    eventHandlingConfig,
    inputNodes,
    outputNodes,
    modelNodes
  };
}

/**
 * Extract Langfuse configuration from nodes
 */
function extractLangfuseConfig(nodes: Node<BaseNodeData>[]): LangfuseConfig | null {
  const langfuseNode = nodes.find(n => n.data.type === 'langfuse' && n.data.langfuseEnabled);
  
  if (!langfuseNode) {
    return null;
  }
  
  return {
    enabled: true,
    publicKey: langfuseNode.data.langfusePublicKey as string || '',
    secretKey: langfuseNode.data.langfuseSecretKey as string || '',
    host: langfuseNode.data.langfuseHost as string || 'https://cloud.langfuse.com',
    projectName: langfuseNode.data.langfuseProjectName as string || 'agent-project'
  };
}

/**
 * Extract Memory configuration from nodes
 */
function extractMemoryConfig(nodes: Node<BaseNodeData>[]): MemoryConfig | null {
  const memoryNode = nodes.find(n => n.data.type === 'memory' && n.data.memoryEnabled);
  
  if (!memoryNode) {
    return null;
  }
  
  return {
    enabled: true,
    apiKey: memoryNode.data.memoryApiKey as string || '',
    host: memoryNode.data.memoryHost as string || 'https://api.mem0.ai',
    userId: memoryNode.data.memoryUserId as string || 'default_user',
    organization: memoryNode.data.memoryOrganization as string,
    memoryType: (memoryNode.data.memoryType as 'preferences' | 'conversation' | 'knowledge' | 'all') || 'all',
    retentionDays: (memoryNode.data.memoryRetention as number) || 30
  };
}

/**
 * Extract Event Handling configuration from nodes
 */
function extractEventHandlingConfig(nodes: Node<BaseNodeData>[]): EventHandlingConfig | null {
  const eventNode = nodes.find(n => n.data.type === 'event-handling' && n.data.eventHandlingEnabled);
  
  if (!eventNode) {
    return null;
  }
  
  return {
    enabled: true,
    eventTypes: eventNode.data.eventTypes as string[] || ['user_message', 'agent_response', 'tool_call', 'error'],
    middleware: eventNode.data.eventMiddleware as string[] || ['logging_middleware'],
    listeners: eventNode.data.eventListeners as { [key: string]: boolean } || {
      'user_message': true,
      'agent_response': true,
      'tool_call': true,
      'error': true
    },
    historyEnabled: eventNode.data.eventHistoryEnabled as boolean ?? true,
    analyticsEnabled: eventNode.data.eventAnalyticsEnabled as boolean ?? false
  };
}

/**
 * Sanitize node names for Python identifiers
 */
function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'agent';
}

/**
 * Extract additional properties from node data
 */
function extractNodeProperties(nodeData: BaseNodeData): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  
  // Extract relevant properties, excluding known base properties
  const excludeKeys = ['label', 'type', 'description', 'instruction', 'prompt'];
  
  Object.entries(nodeData).forEach(([key, value]) => {
    if (!excludeKeys.includes(key) && value !== undefined && value !== null) {
      properties[key] = value;
    }
  });
  
  return properties;
}

/**
 * Get connected nodes via edges
 */
export function getConnectedNodes(
  nodeId: string, 
  nodes: Node<BaseNodeData>[], 
  edges: Edge[], 
  direction: 'incoming' | 'outgoing' | 'both' = 'both'
): Node<BaseNodeData>[] {
  const connectedNodeIds = new Set<string>();
  
  edges.forEach(edge => {
    if (direction === 'incoming' || direction === 'both') {
      if (edge.target === nodeId) {
        connectedNodeIds.add(edge.source);
      }
    }
    
    if (direction === 'outgoing' || direction === 'both') {
      if (edge.source === nodeId) {
        connectedNodeIds.add(edge.target);
      }
    }
  });
  
  return nodes.filter(node => connectedNodeIds.has(node.id));
}

/**
 * Check if flow has specific feature types
 */
export function hasFeatureType(nodes: Node<BaseNodeData>[], featureType: string): boolean {
  switch (featureType) {
    case 'mcp':
      return nodes.some(n => 
        n.data.type === 'mcp-client' || 
        n.data.type === 'mcp-server' || 
        n.data.type === 'mcp-tool'
      );
    case 'langfuse':
      return nodes.some(n => n.data.type === 'langfuse' && n.data.langfuseEnabled);
    case 'memory':
      return nodes.some(n => n.data.type === 'memory' && n.data.memoryEnabled);
    case 'event-handling':
      return nodes.some(n => n.data.type === 'event-handling' && n.data.eventHandlingEnabled);
    default:
      return false;
  }
}