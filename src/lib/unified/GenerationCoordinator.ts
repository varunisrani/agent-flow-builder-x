import type { UnifiedConfiguration } from './ConfigurationExtractor';
import type { GenerationMode } from './CodeGenerationEngine';
import { generateCode } from '../codeGenerator';

/**
 * AI Generation Options
 */
export interface AIGenerationOptions {
  mode: GenerationMode;
  onProgress?: (progress: { progress: number; message: string }) => void;
  abortSignal?: AbortSignal;
}

/**
 * Generation Coordinator
 * Handles async operations, state management, and coordination between AI and template generation
 */
export class GenerationCoordinator {
  private activeRequests = new Map<string, AbortController>();
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  /**
   * Generate code using AI/LLM approach
   */
  async generateWithAI(
    configuration: UnifiedConfiguration,
    options: AIGenerationOptions
  ): Promise<string> {
    const requestId = this.generateRequestId();
    
    try {
      // Create abort controller for this request
      const abortController = new AbortController();
      this.activeRequests.set(requestId, abortController);

      // If external abort signal provided, link it
      if (options.abortSignal) {
        options.abortSignal.addEventListener('abort', () => {
          abortController.abort();
        });
      }

      // Convert configuration to nodes and edges format expected by codeGenerator
      // Ensure mode-specific nodes are included for AI generation
      const { nodes, edges } = this.configurationToFlow(configuration, options.mode);

      // Determine framework based on mode
      const framework = this.modeToFramework(options.mode);

      // Progress tracking
      options.onProgress?.({ progress: 0, message: 'Initializing AI generation...' });

      // Generate code using AI
      const generatedCode = await generateCode(
        nodes,
        edges,
        framework,
        {
          signal: abortController.signal,
          onProgress: (progress) => {
            options.onProgress?.({
              progress: progress * 100,
              message: `AI generating code... ${Math.round(progress * 100)}%`
            });
          }
        }
      );

      options.onProgress?.({ progress: 100, message: 'AI generation completed!' });

      return generatedCode;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Code generation was cancelled');
      }
      
      console.error('AI generation failed:', error);
      throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
    } finally {
      // Clean up
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Queue a generation request to prevent concurrent executions
   */
  async queueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.requestQueue.length > 0) {
        const request = this.requestQueue.shift();
        if (request) {
          await request();
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests(): void {
    this.activeRequests.forEach((controller) => {
      controller.abort();
    });
    this.activeRequests.clear();
    this.requestQueue.length = 0;
  }

  /**
   * Cancel a specific request
   */
  cancelRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Get active request count
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.requestQueue.length;
  }

  /**
   * Convert unified configuration to flow format expected by codeGenerator
   * Ensures mode-specific nodes are created for AI generation
   */
  private configurationToFlow(config: UnifiedConfiguration, mode?: GenerationMode): {
    nodes: any[];
    edges: any[];
  } {
    const nodes: any[] = [];
    const edges: any[] = [];

    // Create agent node
    nodes.push({
      id: 'agent-1',
      type: 'baseNode',
      data: {
        type: 'agent',
        label: config.agentName,
        description: config.agentDescription,
        instruction: config.agentInstruction,
        agentModel: config.agentModel,
        modelType: config.agentModel
      },
      position: { x: 100, y: 100 }
    });

    // Create model node if different from agent
    if (config.modelNodes.length > 0) {
      nodes.push({
        id: 'model-1',
        type: 'baseNode',
        data: {
          type: 'model',
          label: 'Model Configuration',
          modelType: config.agentModel,
          modelName: config.agentModel
        },
        position: { x: 300, y: 100 }
      });
      
      edges.push({
        id: 'agent-model',
        source: 'agent-1',
        target: 'model-1'
      });
    }

    // Create MCP nodes
    config.mcpConfigs.forEach((mcpConfig, index) => {
      nodes.push({
        id: `mcp-${index}`,
        type: 'baseNode',
        data: {
          type: 'mcp-client',
          label: `MCP Tool ${index + 1}`,
          smitheryMcp: mcpConfig.smitheryMcp,
          mcpCommand: mcpConfig.command,
          mcpArgs: mcpConfig.args,
          mcpEnvVars: mcpConfig.envVars,
          smitheryApiKey: mcpConfig.smitheryApiKey,
          profileId: mcpConfig.profileId,
          availableFunctions: mcpConfig.availableFunctions
        },
        position: { x: 100, y: 200 + (index * 100) }
      });

      edges.push({
        id: `agent-mcp-${index}`,
        source: 'agent-1',
        target: `mcp-${index}`
      });
    });

    // Create Langfuse node
    if (config.langfuseConfig) {
      nodes.push({
        id: 'langfuse-1',
        type: 'baseNode',
        data: {
          type: 'langfuse',
          label: 'Langfuse Analytics',
          langfuseEnabled: true,
          langfusePublicKey: config.langfuseConfig.publicKey,
          langfuseSecretKey: config.langfuseConfig.secretKey,
          langfuseHost: config.langfuseConfig.host,
          langfuseProjectName: config.langfuseConfig.projectName
        },
        position: { x: 500, y: 100 }
      });

      edges.push({
        id: 'agent-langfuse',
        source: 'agent-1',
        target: 'langfuse-1'
      });
    }

    // Create Memory node
    if (config.memoryConfig) {
      nodes.push({
        id: 'memory-1',
        type: 'baseNode',
        data: {
          type: 'memory',
          label: 'Mem0 Memory',
          memoryEnabled: true,
          memoryApiKey: config.memoryConfig.apiKey,
          memoryHost: config.memoryConfig.host,
          memoryUserId: config.memoryConfig.userId,
          memoryOrganization: config.memoryConfig.organization,
          memoryType: config.memoryConfig.memoryType,
          memoryRetention: config.memoryConfig.retentionDays
        },
        position: { x: 500, y: 200 }
      });

      edges.push({
        id: 'agent-memory',
        source: 'agent-1',
        target: 'memory-1'
      });
    }

    // Create Event Handling node
    if (config.eventHandlingConfig) {
      nodes.push({
        id: 'event-1',
        type: 'baseNode',
        data: {
          type: 'event-handling',
          label: 'Event Handling',
          eventHandlingEnabled: true,
          eventTypes: config.eventHandlingConfig.eventTypes,
          eventMiddleware: config.eventHandlingConfig.middleware,
          eventListeners: config.eventHandlingConfig.listeners,
          eventHistoryEnabled: config.eventHandlingConfig.historyEnabled,
          eventAnalyticsEnabled: config.eventHandlingConfig.analyticsEnabled
        },
        position: { x: 500, y: 300 }
      });

      edges.push({
        id: 'agent-event',
        source: 'agent-1',
        target: 'event-1'
      });
    }

    // Create tool nodes
    config.tools.forEach((tool, index) => {
      nodes.push({
        id: `tool-${index}`,
        type: 'baseNode',
        data: {
          type: 'tool',
          label: tool.name,
          description: tool.description,
          instruction: tool.configuration.instruction || '',
          prompt: tool.configuration.prompt || ''
        },
        position: { x: 300, y: 200 + (index * 100) }
      });

      edges.push({
        id: `agent-tool-${index}`,
        source: 'agent-1',
        target: `tool-${index}`
      });
    });

    // Create input/output nodes from flow metadata
    config.inputNodes.forEach((inputNode, index) => {
      nodes.push({
        id: `input-${index}`,
        type: 'baseNode',
        data: {
          ...inputNode,
          type: 'input'
        },
        position: { x: 0, y: 100 + (index * 50) }
      });

      edges.push({
        id: `input-agent-${index}`,
        source: `input-${index}`,
        target: 'agent-1'
      });
    });

    config.outputNodes.forEach((outputNode, index) => {
      nodes.push({
        id: `output-${index}`,
        type: 'baseNode',
        data: {
          ...outputNode,
          type: 'output'
        },
        position: { x: 700, y: 100 + (index * 50) }
      });

      edges.push({
        id: `agent-output-${index}`,
        source: 'agent-1',
        target: `output-${index}`
      });
    });

    // Ensure mode-specific nodes exist for AI generation guidance
    if (mode && mode !== 'standard') {
      const needsModeNode = this.ensureModeSpecificNodes(nodes, edges, mode, config);
      // If we added mode-specific nodes, ensure at least one edge exists for AI generation
      if (needsModeNode && edges.length === 0) {
        // Create a basic edge from agent to the first non-agent node
        const agentNode = nodes.find(n => n.data?.type === 'agent');
        const featureNode = nodes.find(n => n.data?.type !== 'agent');
        if (agentNode && featureNode) {
          edges.push({
            id: `agent-${featureNode.data.type}`,
            source: agentNode.id,
            target: featureNode.id
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Ensure mode-specific nodes exist in the flow for AI generation
   */
  private ensureModeSpecificNodes(nodes: any[], edges: any[], mode: GenerationMode, config: UnifiedConfiguration): boolean {
    let addedNodes = false;

    switch (mode) {
      case 'memory':
        if (!nodes.some(n => n.data?.type === 'memory')) {
          nodes.push({
            id: 'memory-ai-gen',
            type: 'baseNode',
            data: {
              type: 'memory',
              label: 'Mem0 Memory (AI Generated)',
              memoryEnabled: true,
              memoryApiKey: config.memoryConfig?.apiKey || 'MEM0_API_KEY',
              memoryHost: config.memoryConfig?.host || 'https://api.mem0.ai',
              memoryUserId: config.memoryConfig?.userId || 'default_user',
              memoryType: config.memoryConfig?.memoryType || 'all',
            },
            position: { x: 500, y: 200 }
          });
          addedNodes = true;
        }
        break;

      case 'langfuse':
        if (!nodes.some(n => n.data?.type === 'langfuse')) {
          nodes.push({
            id: 'langfuse-ai-gen',
            type: 'baseNode',
            data: {
              type: 'langfuse',
              label: 'Langfuse Analytics (AI Generated)',
              langfuseEnabled: true,
              langfusePublicKey: config.langfuseConfig?.publicKey || 'LANGFUSE_PUBLIC_KEY',
              langfuseSecretKey: config.langfuseConfig?.secretKey || 'LANGFUSE_SECRET_KEY',
              langfuseHost: config.langfuseConfig?.host || 'https://cloud.langfuse.com',
              langfuseProjectName: config.langfuseConfig?.projectName || 'ai_agent_project',
            },
            position: { x: 500, y: 100 }
          });
          addedNodes = true;
        }
        break;

      case 'mcp':
        if (!nodes.some(n => ['mcp-client', 'mcp-server', 'mcp-tool'].includes(n.data?.type))) {
          nodes.push({
            id: 'mcp-ai-gen',
            type: 'baseNode',
            data: {
              type: 'mcp-client',
              label: 'MCP Tool (AI Generated)',
              smitheryMcp: '@upstash/context7-mcp',
              mcpCommand: 'npx',
              mcpArgs: ['-y', '@smithery/cli@latest', 'run', '@upstash/context7-mcp', '--key', 'smithery_api_key'],
            },
            position: { x: 300, y: 100 }
          });
          addedNodes = true;
        }
        break;

      case 'event-handling':
        if (!nodes.some(n => n.data?.type === 'event-handling')) {
          nodes.push({
            id: 'event-ai-gen',
            type: 'baseNode',
            data: {
              type: 'event-handling',
              label: 'Event Handling (AI Generated)',
              eventHandlingEnabled: true,
              eventTypes: ['user_message', 'agent_response', 'tool_call', 'error'],
              eventMiddleware: ['logging_middleware'],
            },
            position: { x: 500, y: 300 }
          });
          addedNodes = true;
        }
        break;

      case 'combined':
        // For combined mode, ensure multiple feature types exist
        const modes: GenerationMode[] = ['memory', 'langfuse', 'mcp', 'event-handling'];
        for (const subMode of modes) {
          if (this.ensureModeSpecificNodes(nodes, edges, subMode, config)) {
            addedNodes = true;
          }
        }
        break;
    }

    return addedNodes;
  }

  /**
   * Convert generation mode to framework string
   */
  private modeToFramework(mode: GenerationMode): 'adk' | 'mcp' | 'langfuse' | 'memory' | 'event-handling' | 'combined' | 'standard' {
    switch (mode) {
      case 'mcp':
        return 'mcp';
      case 'langfuse':
        return 'langfuse';
      case 'memory':
        return 'memory';
      case 'event-handling':
        return 'event-handling';
      case 'combined':
        return 'combined';
      case 'standard':
        return 'standard';
      default:
        return 'adk';
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Estimate generation time based on configuration complexity
   */
  estimateGenerationTime(config: UnifiedConfiguration): number {
    let baseTime = 5000; // 5 seconds base

    // Add time for each feature
    if (config.mcpConfigs.length > 0) {
      baseTime += config.mcpConfigs.length * 2000; // 2s per MCP
    }

    if (config.langfuseConfig) baseTime += 1000;
    if (config.memoryConfig) baseTime += 1000;
    if (config.eventHandlingConfig) baseTime += 1000;

    // Add time for complexity
    switch (config.complexity) {
      case 'complex':
        baseTime *= 2;
        break;
      case 'medium':
        baseTime *= 1.5;
        break;
    }

    return Math.min(baseTime, 30000); // Cap at 30 seconds
  }

  /**
   * Check if AI generation is recommended for this configuration
   */
  isAIGenerationRecommended(config: UnifiedConfiguration): boolean {
    // AI generation is better for simple flows or when specific customization is needed
    return (
      config.complexity === 'simple' ||
      config.tools.length > 0 ||
      (config.mcpConfigs.length === 0 && !config.langfuseConfig && !config.memoryConfig)
    );
  }

  /**
   * Get generation statistics
   */
  getStatistics(): {
    activeRequests: number;
    queuedRequests: number;
    isProcessing: boolean;
  } {
    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.requestQueue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.cancelAllRequests();
    this.requestQueue.length = 0;
    this.isProcessing = false;
  }
}