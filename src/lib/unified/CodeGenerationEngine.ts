import type { Node, Edge } from '@xyflow/react';
import type { BaseNodeData } from '@/components/nodes/BaseNode';
import { ConfigurationExtractor } from './ConfigurationExtractor';
import { TemplateEngine } from './TemplateEngine';
import { GenerationCoordinator } from './GenerationCoordinator';
import { verifyAndFixCode, type VerificationProgress, type VerificationResult } from '../codeVerification';
import { UnifiedVerification, type UnifiedVerificationResult } from './UnifiedVerification';

// Main generation types
export type GenerationMethod = 'ai' | 'template' | 'auto';
export type GenerationMode = 'standard' | 'mcp' | 'langfuse' | 'memory' | 'event-handling' | 'combined';

export interface GenerationRequest {
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
  method?: GenerationMethod;
  mode?: GenerationMode;
  options?: GenerationOptions;
}

export interface GenerationOptions {
  enableVerification?: boolean;
  enableOptimization?: boolean;
  onProgress?: (progress: GenerationProgress) => void;
  abortSignal?: AbortSignal;
}

export interface GenerationProgress {
  step: string;
  progress: number;
  message: string;
  data?: any;
}

export interface GenerationResult {
  code: string;
  method: GenerationMethod;
  mode: GenerationMode;
  configuration: any;
  verification?: UnifiedVerificationResult;
  metadata: {
    generatedAt: Date;
    features: string[];
    performance: {
      generationTime: number;
      verificationTime?: number;
    };
  };
}

/**
 * Unified Code Generation Engine
 * Single entry point for all code generation in the application
 */
export class CodeGenerationEngine {
  private extractor: ConfigurationExtractor;
  private templateEngine: TemplateEngine;
  private coordinator: GenerationCoordinator;
  private verification: UnifiedVerification;

  constructor() {
    this.extractor = new ConfigurationExtractor();
    this.templateEngine = new TemplateEngine();
    this.coordinator = new GenerationCoordinator();
    this.verification = new UnifiedVerification();
  }

  /**
   * Main code generation method
   */
  async generateCode(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = performance.now();
    
    try {
      // Step 1: Extract and validate configuration
      this.reportProgress(request, 'extracting', 10, 'Extracting node configuration...');
      const configuration = await this.extractor.extractConfiguration(request.nodes, request.edges);
      
      if (!configuration.isValid) {
        throw new Error(`Invalid flow configuration: ${configuration.errors.join(', ')}`);
      }

      // Step 2: Determine generation method and mode
      this.reportProgress(request, 'analyzing', 20, 'Analyzing flow requirements...');
      const method = this.determineGenerationMethod(request.method, configuration);
      const mode = this.determineGenerationMode(request.mode, configuration);

      // Step 3: Generate code using appropriate method
      this.reportProgress(request, 'generating', 40, `Generating code using ${method} method...`);
      
      let generatedCode: string;
      
      if (method === 'ai') {
        generatedCode = await this.coordinator.generateWithAI(configuration, {
          mode,
          onProgress: (progress) => this.reportProgress(request, 'ai-generation', 40 + ((progress.progress || 0) * 0.4), progress.message),
          abortSignal: request.options?.abortSignal
        });
      } else {
        generatedCode = await this.templateEngine.generateFromTemplate(configuration, mode);
      }

      // Step 4: Verify and optimize code if enabled
      let verification: UnifiedVerificationResult | undefined;
      if (request.options?.enableVerification !== false) {
        this.reportProgress(request, 'verifying', 80, 'Verifying and fixing code...');
        
        verification = await this.verification.verifyCode(
          generatedCode,
          configuration,
          method,
          mode,
          {
            enableCodeFixes: true,
            enableQualityChecks: true,
            generateSupportFiles: true,
            onProgress: (progress: VerificationProgress) => {
              this.reportProgress(request, 'verification', 80 + (progress.progress * 0.15), progress.message);
            },
            abortSignal: request.options?.abortSignal
          }
        );
        
        if (verification.fixedCode) {
          generatedCode = verification.fixedCode;
        }
      }

      // Step 5: Prepare result
      this.reportProgress(request, 'finalizing', 95, 'Finalizing code generation...');
      
      const endTime = performance.now();
      const generationTime = endTime - startTime;
      
      const result: GenerationResult = {
        code: generatedCode,
        method,
        mode,
        configuration,
        verification,
        metadata: {
          generatedAt: new Date(),
          features: this.extractFeatures(configuration),
          performance: {
            generationTime,
            verificationTime: verification ? endTime - startTime : undefined
          }
        }
      };

      this.reportProgress(request, 'complete', 100, 'Code generation completed successfully!');
      
      return result;
      
    } catch (error) {
      // Enhanced error handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.reportProgress(request, 'error', 0, `Error: ${errorMessage}`);
      
      // Try to provide a fallback if possible
      if (request.method !== 'template') {
        console.warn('AI generation failed, falling back to template generation...');
        return this.generateCode({
          ...request,
          method: 'template',
          options: {
            ...request.options,
            enableVerification: false // Skip verification for fallback
          }
        });
      }
      
      throw error;
    }
  }

  /**
   * Determine the best generation method
   */
  private determineGenerationMethod(
    requestedMethod: GenerationMethod | undefined,
    configuration: any
  ): GenerationMethod {
    if (requestedMethod && requestedMethod !== 'auto') {
      return requestedMethod;
    }

    // Auto-determine based on configuration complexity
    const hasComplexFeatures = 
      configuration.mcpConfigs.length > 0 ||
      configuration.langfuseConfig ||
      configuration.memoryConfig ||
      configuration.eventHandlingConfig;

    // For complex flows, prefer templates for reliability
    // For simple flows, AI generation can be more flexible
    return hasComplexFeatures ? 'template' : 'ai';
  }

  /**
   * Determine the generation mode based on features
   * IMPORTANT: Only auto-determines when no explicit mode is provided
   */
  private determineGenerationMode(
    requestedMode: GenerationMode | undefined,
    configuration: any
  ): GenerationMode {
    // Always respect explicit user selections
    if (requestedMode && requestedMode !== 'auto') {
      return requestedMode;
    }

    // Auto-determine mode based on enabled features only when requestedMode is undefined or 'auto'
    const features = [];
    
    if (configuration.mcpConfigs.length > 0) features.push('mcp');
    if (configuration.langfuseConfig) features.push('langfuse');
    if (configuration.memoryConfig) features.push('memory');
    if (configuration.eventHandlingConfig) features.push('event-handling');

    // Auto-selection logic for recommendations
    if (features.length > 1) return 'combined';
    if (features.length === 1) return features[0] as GenerationMode;
    
    return 'standard';
  }

  /**
   * Extract feature list from configuration
   */
  private extractFeatures(configuration: any): string[] {
    const features = ['Google ADK'];
    
    if (configuration.mcpConfigs.length > 0) {
      features.push('MCP Protocol');
      configuration.mcpConfigs.forEach((config: any) => {
        if (config.smitheryMcp) {
          features.push(`Smithery: ${config.smitheryMcp}`);
        }
      });
    }
    
    if (configuration.langfuseConfig) features.push('Langfuse Analytics');
    if (configuration.memoryConfig) features.push('Mem0 Memory');
    if (configuration.eventHandlingConfig) features.push('Event Handling');
    
    return features;
  }

  /**
   * Report progress to the caller
   */
  private reportProgress(
    request: GenerationRequest,
    step: string,
    progress: number,
    message: string,
    data?: any
  ): void {
    if (request.options?.onProgress) {
      request.options.onProgress({
        step,
        progress,
        message,
        data
      });
    }
  }

  /**
   * Quick method to check if a flow can be generated
   */
  async validateFlow(nodes: Node<BaseNodeData>[], edges: Edge[]): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recommendedMethod: GenerationMethod;
    recommendedMode: GenerationMode;
  }> {
    try {
      const configuration = await this.extractor.extractConfiguration(nodes, edges);
      
      return {
        isValid: configuration.isValid,
        errors: configuration.errors,
        warnings: configuration.warnings || [],
        recommendedMethod: this.determineGenerationMethod('auto', configuration),
        recommendedMode: this.determineGenerationMode('standard', configuration)
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        warnings: [],
        recommendedMethod: 'template',
        recommendedMode: 'standard'
      };
    }
  }

  /**
   * Get available generation modes for a flow with metadata
   */
  getAvailableModes(nodes: Node<BaseNodeData>[]): {
    mode: GenerationMode;
    available: boolean;
    recommended: boolean;
    description: string;
    requiredFeatures: string[];
  }[] {
    // Check for available features
    const hasMcp = nodes.some(n => ['mcp-client', 'mcp-server', 'mcp-tool'].includes(n.data.type || ''));
    const hasLangfuse = nodes.some(n => n.data.type === 'langfuse' && n.data.langfuseEnabled);
    const hasMemory = nodes.some(n => n.data.type === 'memory' && n.data.memoryEnabled);
    const hasEventHandling = nodes.some(n => n.data.type === 'event-handling' && n.data.eventHandlingEnabled);
    
    const featureCount = [hasMcp, hasLangfuse, hasMemory, hasEventHandling].filter(Boolean).length;
    
    return [
      {
        mode: 'standard',
        available: true,
        recommended: featureCount === 0,
        description: 'Basic Google ADK agent with core functionality',
        requiredFeatures: []
      },
      {
        mode: 'mcp',
        available: true,
        recommended: hasMcp && featureCount === 1,
        description: 'Agent with MCP (Model Context Protocol) tool integration',
        requiredFeatures: ['MCP nodes']
      },
      {
        mode: 'langfuse',
        available: true,
        recommended: hasLangfuse && featureCount === 1,
        description: 'Agent with Langfuse analytics and conversation tracking',
        requiredFeatures: ['Langfuse nodes']
      },
      {
        mode: 'memory',
        available: true,
        recommended: hasMemory && featureCount === 1,
        description: 'Agent with Mem0 persistent memory capabilities',
        requiredFeatures: ['Memory nodes']
      },
      {
        mode: 'event-handling',
        available: true,
        recommended: hasEventHandling && featureCount === 1,
        description: 'Agent with comprehensive event logging and monitoring',
        requiredFeatures: ['Event handling nodes']
      },
      {
        mode: 'combined',
        available: true,
        recommended: featureCount > 1,
        description: 'Agent with all detected features integrated together',
        requiredFeatures: ['Multiple feature nodes']
      }
    ];
  }

  /**
   * Get simple list of available modes for backward compatibility
   */
  getAvailableModesList(nodes: Node<BaseNodeData>[]): GenerationMode[] {
    return this.getAvailableModes(nodes).map(m => m.mode);
  }
}

// Export a singleton instance for use throughout the application
export const codeGenerationEngine = new CodeGenerationEngine();