import type { Node, Edge } from '@xyflow/react';
import type { BaseNodeData } from '@/components/nodes/BaseNode';

// Configuration interfaces - consolidating from multiple files
export interface MCPConfig {
  enabled: boolean;
  type: string;
  command: string;
  args: string[];
  envVars: { [key: string]: string };
  smitheryMcp?: string;
  smitheryApiKey?: string;
  profileId?: string;
  availableFunctions?: string;
}

export interface LangfuseConfig {
  enabled: boolean;
  publicKey: string;
  secretKey: string;
  host: string;
  projectName: string;
}

export interface MemoryConfig {
  enabled: boolean;
  apiKey: string;
  host: string;
  userId: string;
  organization?: string;
  memoryType: 'preferences' | 'conversation' | 'knowledge' | 'all';
  retentionDays: number;
}

export interface EventHandlingConfig {
  enabled: boolean;
  eventTypes: string[];
  middleware: string[];
  listeners: { [key: string]: boolean };
  historyEnabled: boolean;
  analyticsEnabled: boolean;
}

export interface ToolConfig {
  name: string;
  type: string;
  description: string;
  configuration: Record<string, unknown>;
}

export interface UnifiedConfiguration {
  // Validation
  isValid: boolean;
  errors: string[];
  warnings?: string[];

  // Core agent configuration
  agentName: string;
  agentDescription: string;
  agentInstruction: string;
  agentModel: string;

  // Tools and capabilities
  tools: ToolConfig[];
  mcpConfigs: MCPConfig[];

  // Feature configurations
  langfuseConfig: LangfuseConfig | null;
  memoryConfig: MemoryConfig | null;
  eventHandlingConfig: EventHandlingConfig | null;

  // Flow metadata
  nodeCount: number;
  edgeCount: number;
  features: string[];
  complexity: 'simple' | 'medium' | 'complex';
  
  // Flow structure
  inputNodes: BaseNodeData[];
  outputNodes: BaseNodeData[];
  modelNodes: BaseNodeData[];
}

/**
 * Unified Configuration Extractor
 * Single source of truth for extracting and validating node configurations
 */
export class ConfigurationExtractor {
  
  /**
   * Extract unified configuration from flow nodes and edges
   */
  async extractConfiguration(nodes: Node<BaseNodeData>[], edges: Edge[]): Promise<UnifiedConfiguration> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic validation
      if (!nodes || nodes.length === 0) {
        errors.push('Flow must contain at least one node');
      }

      // Extract core agent configuration
      const agentConfig = this.extractAgentConfiguration(nodes, errors);
      
      // Extract tools configuration
      const tools = this.extractToolsConfiguration(nodes);
      
      // Extract MCP configuration with deduplication
      const mcpConfigs = this.extractMCPConfiguration(nodes, warnings);
      
      // Extract feature configurations
      const langfuseConfig = this.extractLangfuseConfiguration(nodes);
      const memoryConfig = this.extractMemoryConfiguration(nodes);
      const eventHandlingConfig = this.extractEventHandlingConfiguration(nodes);

      // Extract flow metadata
      const metadata = this.extractFlowMetadata(nodes, edges);

      // Determine complexity
      const complexity = this.determineComplexity(nodes, mcpConfigs, langfuseConfig, memoryConfig, eventHandlingConfig);

      // Extract feature list
      const features = this.extractFeatureList(mcpConfigs, langfuseConfig, memoryConfig, eventHandlingConfig);

      // Validate configuration integrity
      this.validateConfigurationIntegrity(
        agentConfig,
        mcpConfigs,
        langfuseConfig,
        memoryConfig,
        eventHandlingConfig,
        errors,
        warnings
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        
        ...agentConfig,
        tools,
        mcpConfigs,
        
        langfuseConfig,
        memoryConfig,
        eventHandlingConfig,
        
        ...metadata,
        complexity,
        features
      };

    } catch (error) {
      errors.push(`Configuration extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Return a safe default configuration
      return this.createDefaultConfiguration(errors);
    }
  }

  /**
   * Extract core agent configuration
   */
  private extractAgentConfiguration(nodes: Node<BaseNodeData>[], errors: string[]) {
    const agentNode = nodes.find(n => n.data.type === 'agent');
    
    if (!agentNode) {
      errors.push('Flow must contain an agent node');
      return {
        agentName: 'DefaultAgent',
        agentDescription: 'Default agent configuration',
        agentInstruction: 'You are a helpful assistant.',
        agentModel: 'gemini-2.0-flash'
      };
    }

    // Extract and validate agent properties
    const agentName = this.sanitizeName(agentNode.data.label || 'FlowAgent');
    const agentDescription = agentNode.data.description || 'AI agent generated from flow diagram';
    const agentInstruction = agentNode.data.instruction || agentNode.data.prompt || 'You are a helpful assistant.';
    
    // Model configuration with fallback chain
    const modelNode = nodes.find(n => n.data.type === 'model');
    const agentModel = 
      modelNode?.data.modelType || 
      modelNode?.data.modelName ||
      agentNode.data.modelType || 
      agentNode.data.agentModel ||
      'gemini-2.0-flash';

    // Validation
    if (!agentName || agentName.length < 2) {
      errors.push('Agent name must be at least 2 characters long');
    }
    
    if (!agentInstruction || agentInstruction.length < 10) {
      errors.push('Agent instruction must be at least 10 characters long');
    }

    return {
      agentName,
      agentDescription,
      agentInstruction,
      agentModel
    };
  }

  /**
   * Extract tools configuration
   */
  private extractToolsConfiguration(nodes: Node<BaseNodeData>[]): ToolConfig[] {
    const toolNodes = nodes.filter(n => n.data.type === 'tool');
    
    return toolNodes.map(node => ({
      name: this.sanitizeName(node.data.label || 'tool'),
      type: node.data.type,
      description: node.data.description || 'Custom tool',
      configuration: {
        instruction: node.data.instruction,
        prompt: node.data.prompt,
        ...this.extractNodeProperties(node.data)
      }
    }));
  }

  /**
   * Extract MCP configuration with enhanced validation and deduplication
   */
  private extractMCPConfiguration(nodes: Node<BaseNodeData>[], warnings: string[]): MCPConfig[] {
    const mcpNodes = nodes.filter(n => 
      ['mcp-client', 'mcp-server', 'mcp-tool'].includes(n.data.type || '')
    );

    const configs: MCPConfig[] = mcpNodes.map(node => {
      const mcpPackage = node.data.smitheryMcp as string || '';
      const mcpCommand = node.data.mcpCommand as string || node.data.command as string || 'npx';
      
      // Handle args - can be array or string
      let mcpArgs: string[];
      if (Array.isArray(node.data.mcpArgs)) {
        mcpArgs = node.data.mcpArgs as string[];
      } else if (Array.isArray(node.data.args)) {
        mcpArgs = node.data.args as string[];
      } else {
        const argsString = (node.data.mcpArgs || node.data.args || '') as string;
        mcpArgs = argsString.split(' ').filter(Boolean);
      }

      // Create default args if none provided
      if (mcpArgs.length === 0 && mcpPackage) {
        mcpArgs = ['-y', '@smithery/cli@latest', 'run', mcpPackage];
      }

      // Ensure API key parameter is included
      if (mcpPackage && !mcpArgs.includes('--key')) {
        mcpArgs.push('--key', 'smithery_api_key');
      }

      return {
        enabled: true,
        type: 'smithery',
        command: mcpCommand,
        args: mcpArgs,
        envVars: this.extractEnvVars(node.data),
        smitheryMcp: mcpPackage,
        smitheryApiKey: node.data.smitheryApiKey as string,
        profileId: node.data.profileId as string,
        availableFunctions: node.data.availableFunctions as string || node.data.description || 'operations'
      };
    });

    // Deduplicate configurations
    return this.deduplicateMCPConfigs(configs, warnings);
  }

  /**
   * Deduplicate MCP configurations
   */
  private deduplicateMCPConfigs(configs: MCPConfig[], warnings: string[]): MCPConfig[] {
    const seen = new Set<string>();
    const unique: MCPConfig[] = [];
    
    configs.forEach(cfg => {
      const pkg = cfg.smitheryMcp || cfg.args.find(a => a.startsWith('@')) || '';
      const command = cfg.command || '';
      const key = `${pkg}|${command}`;
      
      if (!seen.has(key) && pkg) {
        seen.add(key);
        unique.push(cfg);
      } else if (seen.has(key)) {
        warnings.push(`Duplicate MCP configuration detected for ${pkg}, skipping duplicate`);
      }
    });
    
    if (configs.length !== unique.length) {
      warnings.push(`Deduplicated ${configs.length - unique.length} duplicate MCP configurations`);
    }
    
    return unique;
  }

  /**
   * Extract Langfuse configuration
   */
  private extractLangfuseConfiguration(nodes: Node<BaseNodeData>[]): LangfuseConfig | null {
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
   * Extract Memory configuration
   */
  private extractMemoryConfiguration(nodes: Node<BaseNodeData>[]): MemoryConfig | null {
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
   * Extract Event Handling configuration
   */
  private extractEventHandlingConfiguration(nodes: Node<BaseNodeData>[]): EventHandlingConfig | null {
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
   * Extract flow metadata
   */
  private extractFlowMetadata(nodes: Node<BaseNodeData>[], edges: Edge[]) {
    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      inputNodes: nodes.filter(n => n.data.type === 'input').map(n => n.data),
      outputNodes: nodes.filter(n => n.data.type === 'output').map(n => n.data),
      modelNodes: nodes.filter(n => n.data.type === 'model').map(n => n.data)
    };
  }

  /**
   * Determine configuration complexity
   */
  private determineComplexity(
    nodes: Node<BaseNodeData>[],
    mcpConfigs: MCPConfig[],
    langfuseConfig: LangfuseConfig | null,
    memoryConfig: MemoryConfig | null,
    eventHandlingConfig: EventHandlingConfig | null
  ): 'simple' | 'medium' | 'complex' {
    let complexity = 0;
    
    // Node count factor
    if (nodes.length > 10) complexity += 2;
    else if (nodes.length > 5) complexity += 1;
    
    // Feature factor
    if (mcpConfigs.length > 0) complexity += 1;
    if (langfuseConfig) complexity += 1;
    if (memoryConfig) complexity += 1;
    if (eventHandlingConfig) complexity += 1;
    
    // Multiple MCP configs
    if (mcpConfigs.length > 2) complexity += 1;
    
    // Tool complexity
    const toolNodes = nodes.filter(n => n.data.type === 'tool');
    if (toolNodes.length > 3) complexity += 1;
    
    if (complexity >= 4) return 'complex';
    if (complexity >= 2) return 'medium';
    return 'simple';
  }

  /**
   * Extract feature list
   */
  private extractFeatureList(
    mcpConfigs: MCPConfig[],
    langfuseConfig: LangfuseConfig | null,
    memoryConfig: MemoryConfig | null,
    eventHandlingConfig: EventHandlingConfig | null
  ): string[] {
    const features = ['Google ADK'];
    
    if (mcpConfigs.length > 0) {
      features.push('MCP Protocol');
      mcpConfigs.forEach(config => {
        if (config.smitheryMcp) {
          features.push(`Smithery: ${config.smitheryMcp}`);
        }
      });
    }
    
    if (langfuseConfig) features.push('Langfuse Analytics');
    if (memoryConfig) features.push('Mem0 Memory');
    if (eventHandlingConfig) features.push('Event Handling');
    
    return features;
  }

  /**
   * Validate configuration integrity
   */
  private validateConfigurationIntegrity(
    agentConfig: any,
    mcpConfigs: MCPConfig[],
    langfuseConfig: LangfuseConfig | null,
    memoryConfig: MemoryConfig | null,
    eventHandlingConfig: EventHandlingConfig | null,
    errors: string[],
    warnings: string[]
  ): void {
    // Validate MCP configurations
    mcpConfigs.forEach((config, index) => {
      if (!config.smitheryMcp) {
        errors.push(`MCP configuration ${index + 1} is missing smitheryMcp package`);
      }
      if (!config.args || config.args.length === 0) {
        warnings.push(`MCP configuration ${index + 1} has no arguments specified`);
      }
    });

    // Validate Langfuse config
    if (langfuseConfig && (!langfuseConfig.publicKey || !langfuseConfig.secretKey)) {
      warnings.push('Langfuse configuration is incomplete - missing API keys');
    }

    // Validate Memory config
    if (memoryConfig && !memoryConfig.apiKey) {
      warnings.push('Memory configuration is incomplete - missing API key');
    }

    // Check for conflicting configurations
    if (langfuseConfig && eventHandlingConfig && eventHandlingConfig.analyticsEnabled) {
      warnings.push('Both Langfuse and Event Handling analytics are enabled - this may cause conflicts');
    }
  }

  /**
   * Extract environment variables from node data
   */
  private extractEnvVars(nodeData: BaseNodeData): { [key: string]: string } {
    const envVars: { [key: string]: string } = {
      'NODE_OPTIONS': '--no-warnings --experimental-fetch'
    };

    // Extract custom env vars if provided
    if (typeof nodeData.mcpEnvVars === 'object' && nodeData.mcpEnvVars) {
      Object.assign(envVars, nodeData.mcpEnvVars);
    }

    return envVars;
  }

  /**
   * Extract additional properties from node data
   */
  private extractNodeProperties(nodeData: BaseNodeData): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const excludeKeys = ['label', 'type', 'description', 'instruction', 'prompt'];
    
    Object.entries(nodeData).forEach(([key, value]) => {
      if (!excludeKeys.includes(key) && value !== undefined && value !== null) {
        properties[key] = value;
      }
    });
    
    return properties;
  }

  /**
   * Sanitize names for Python identifiers
   */
  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase() || 'agent';
  }

  /**
   * Create a safe default configuration for error cases
   */
  private createDefaultConfiguration(errors: string[]): UnifiedConfiguration {
    return {
      isValid: false,
      errors,
      warnings: [],
      
      agentName: 'DefaultAgent',
      agentDescription: 'Default agent configuration',
      agentInstruction: 'You are a helpful assistant.',
      agentModel: 'gemini-2.0-flash',
      
      tools: [],
      mcpConfigs: [],
      
      langfuseConfig: null,
      memoryConfig: null,
      eventHandlingConfig: null,
      
      nodeCount: 0,
      edgeCount: 0,
      features: ['Google ADK'],
      complexity: 'simple',
      
      inputNodes: [],
      outputNodes: [],
      modelNodes: []
    };
  }
}