import type { UnifiedConfiguration } from './ConfigurationExtractor';
import type { GenerationMethod, GenerationMode } from './CodeGenerationEngine';
import { verifyAndFixCode, type VerificationResult, type VerificationProgress } from '../codeVerification';
import { generateInitPy } from '../codeVerification';

/**
 * Enhanced Verification Result for Unified System
 */
export interface UnifiedVerificationResult {
  isValid: boolean;
  errors: Array<{
    type: string;
    message: string;
    line?: number;
    severity: 'error' | 'warning' | 'info';
    fixed: boolean;
    originalCode?: string;
    fixedCode?: string;
  }>;
  warnings: string[];
  fixedCode: string;
  metadata: {
    method: GenerationMethod;
    mode: GenerationMode;
    verificationTime: number;
    fixesApplied: number;
    codeQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  additionalFiles?: {
    '__init__.py': string;
    'requirements.txt'?: string;
    '.env.example'?: string;
  };
}

/**
 * Unified Verification Options
 */
export interface UnifiedVerificationOptions {
  enableCodeFixes?: boolean;
  enableQualityChecks?: boolean;
  generateSupportFiles?: boolean;
  onProgress?: (progress: VerificationProgress) => void;
  abortSignal?: AbortSignal;
}

/**
 * Unified Verification System
 * Provides comprehensive code verification for both AI and template generation
 */
export class UnifiedVerification {

  /**
   * Verify generated code with unified checks
   */
  async verifyCode(
    code: string,
    configuration: UnifiedConfiguration,
    method: GenerationMethod,
    mode: GenerationMode,
    options: UnifiedVerificationOptions = {}
  ): Promise<UnifiedVerificationResult> {
    const startTime = performance.now();
    
    try {
      // Step 1: Basic code verification using existing system
      options.onProgress?.({
        step: 'basic_verification',
        progress: 10,
        message: 'Running basic code verification...'
      });

      const nodeData = {
        mcpPackage: configuration.mcpConfigs.map(cfg => cfg.smitheryMcp).filter(Boolean),
        agentName: configuration.agentName,
        agentDescription: configuration.agentDescription,
        agentInstruction: configuration.agentInstruction
      };

      const basicResult = await verifyAndFixCode(
        code,
        (progress) => {
          options.onProgress?.({
            step: 'basic_verification',
            progress: 10 + (progress.progress * 0.6),
            message: progress.message
          });
        },
        nodeData
      );

      // Step 2: Unified system specific checks
      options.onProgress?.({
        step: 'unified_checks',
        progress: 70,
        message: 'Running unified system checks...'
      });

      const unifiedErrors = await this.runUnifiedChecks(
        basicResult.fixedCode,
        configuration,
        method,
        mode
      );

      // Step 3: Code quality assessment
      options.onProgress?.({
        step: 'quality_assessment',
        progress: 80,
        message: 'Assessing code quality...'
      });

      const codeQuality = this.assessCodeQuality(
        basicResult.fixedCode,
        configuration,
        unifiedErrors.length
      );

      // Step 4: Generate additional files if requested
      let additionalFiles: UnifiedVerificationResult['additionalFiles'] = undefined;
      
      if (options.generateSupportFiles !== false) {
        options.onProgress?.({
          step: 'support_files',
          progress: 90,
          message: 'Generating support files...'
        });

        additionalFiles = this.generateSupportFiles(configuration, mode);
      }

      // Step 5: Final validation
      options.onProgress?.({
        step: 'final_validation',
        progress: 100,
        message: 'Verification complete!'
      });

      const endTime = performance.now();
      const verificationTime = endTime - startTime;

      // Combine results
      const allErrors = [
        ...basicResult.errors.map(err => ({
          type: err.type,
          message: err.message,
          line: err.line,
          severity: 'error' as const,
          fixed: err.fixed,
          originalCode: err.originalCode,
          fixedCode: err.fixedCode
        })),
        ...unifiedErrors
      ];

      const allWarnings = [
        ...basicResult.warnings,
        ...this.generateMethodSpecificWarnings(method, mode, configuration)
      ];

      return {
        isValid: allErrors.filter(e => e.severity === 'error' && !e.fixed).length === 0,
        errors: allErrors,
        warnings: allWarnings,
        fixedCode: basicResult.fixedCode,
        metadata: {
          method,
          mode,
          verificationTime,
          fixesApplied: allErrors.filter(e => e.fixed).length,
          codeQuality
        },
        additionalFiles
      };

    } catch (error) {
      options.onProgress?.({
        step: 'error',
        progress: 0,
        message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      return {
        isValid: false,
        errors: [{
          type: 'VERIFICATION_FAILED',
          message: `Verification system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          fixed: false
        }],
        warnings: [],
        fixedCode: code,
        metadata: {
          method,
          mode,
          verificationTime: performance.now() - startTime,
          fixesApplied: 0,
          codeQuality: 'poor'
        }
      };
    }
  }

  /**
   * Run unified system specific checks
   */
  private async runUnifiedChecks(
    code: string,
    configuration: UnifiedConfiguration,
    method: GenerationMethod,
    mode: GenerationMode
  ): Promise<Array<{
    type: string;
    message: string;
    line?: number;
    severity: 'error' | 'warning' | 'info';
    fixed: boolean;
  }>> {
    const errors: Array<{
      type: string;
      message: string;
      line?: number;
      severity: 'error' | 'warning' | 'info';
      fixed: boolean;
    }> = [];

    // Check 1: Method-specific validation
    if (method === 'ai') {
      if (!code.includes('LlmAgent')) {
        errors.push({
          type: 'AI_GENERATION_MISSING_AGENT',
          message: 'AI-generated code missing LlmAgent class',
          severity: 'error',
          fixed: false
        });
      }
    }

    // Check 2: Mode-specific validation
    switch (mode) {
      case 'mcp':
        if (configuration.mcpConfigs.length > 0 && !code.includes('MCPToolset')) {
          errors.push({
            type: 'MCP_MODE_MISSING_TOOLSET',
            message: 'MCP mode requires MCPToolset configuration',
            severity: 'error',
            fixed: false
          });
        }
        break;

      case 'langfuse':
        if (configuration.langfuseConfig && !code.includes('langfuse')) {
          errors.push({
            type: 'LANGFUSE_MODE_MISSING_IMPORT',
            message: 'Langfuse mode missing langfuse import',
            severity: 'warning',
            fixed: false
          });
        }
        break;

      case 'memory':
        if (configuration.memoryConfig && !code.includes('mem0')) {
          errors.push({
            type: 'MEMORY_MODE_MISSING_IMPORT',
            message: 'Memory mode missing mem0 import',
            severity: 'warning',
            fixed: false
          });
        }
        break;

      case 'combined':
        // Check that multiple features are actually implemented
        const features = [];
        if (code.includes('MCPToolset')) features.push('mcp');
        if (code.includes('langfuse')) features.push('langfuse');
        if (code.includes('mem0')) features.push('memory');
        
        if (features.length < 2) {
          errors.push({
            type: 'COMBINED_MODE_INSUFFICIENT_FEATURES',
            message: 'Combined mode should implement multiple features',
            severity: 'warning',
            fixed: false
          });
        }
        break;
    }

    // Check 3: Configuration completeness
    if (!code.includes(configuration.agentName)) {
      errors.push({
        type: 'AGENT_NAME_NOT_FOUND',
        message: `Agent name "${configuration.agentName}" not found in code`,
        severity: 'warning',
        fixed: false
      });
    }

    // Check 4: Required imports check
    const requiredImports = this.getRequiredImports(configuration, mode);
    for (const importStatement of requiredImports) {
      if (!code.includes(importStatement)) {
        errors.push({
          type: 'MISSING_REQUIRED_IMPORT',
          message: `Missing required import: ${importStatement}`,
          severity: 'warning',
          fixed: false
        });
      }
    }

    // Check 5: Security checks
    if (code.includes('os.getenv') && !code.includes('load_dotenv')) {
      errors.push({
        type: 'SECURITY_MISSING_DOTENV',
        message: 'Using environment variables without loading .env file',
        severity: 'warning',
        fixed: false
      });
    }

    return errors;
  }

  /**
   * Assess code quality based on various metrics
   */
  private assessCodeQuality(
    code: string,
    configuration: UnifiedConfiguration,
    errorCount: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    let score = 100;

    // Deduct points for errors
    score -= errorCount * 10;

    // Deduct points for missing best practices
    if (!code.includes('load_dotenv')) score -= 5;
    if (!code.includes('__all__')) score -= 5;
    if (!code.includes('async def main')) score -= 10;
    if (!code.includes('if __name__ == "__main__"')) score -= 5;

    // Add points for good practices
    if (code.includes('try:') && code.includes('except:')) score += 5;
    if (code.includes('# ')) score += 5; // Has comments
    if (code.includes('"""') || code.includes("'''")) score += 5; // Has docstrings

    // Assess based on complexity handling
    if (configuration.complexity === 'complex' && code.length > 1000) score += 10;
    if (configuration.complexity === 'simple' && code.length < 500) score += 5;

    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  /**
   * Generate method-specific warnings
   */
  private generateMethodSpecificWarnings(
    method: GenerationMethod,
    mode: GenerationMode,
    configuration: UnifiedConfiguration
  ): string[] {
    const warnings: string[] = [];

    if (method === 'ai' && configuration.complexity === 'complex') {
      warnings.push('AI generation may be less reliable for complex configurations. Consider template generation.');
    }

    if (method === 'template' && configuration.tools.length > 0) {
      warnings.push('Template generation may not include custom tools. Consider AI generation for better tool support.');
    }

    if (mode === 'combined' && configuration.mcpConfigs.length > 3) {
      warnings.push('Large number of MCP configurations may impact performance.');
    }

    return warnings;
  }

  /**
   * Get required imports based on configuration
   */
  private getRequiredImports(configuration: UnifiedConfiguration, mode: GenerationMode): string[] {
    const imports = [
      'from google.adk.agents import LlmAgent',
      'from google.adk.runners import Runner',
      'from google.adk.sessions import InMemorySessionService'
    ];

    if (configuration.mcpConfigs.length > 0) {
      imports.push('from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset');
    }

    if (configuration.langfuseConfig) {
      imports.push('from langfuse import Langfuse');
    }

    if (configuration.memoryConfig) {
      imports.push('import mem0');
    }

    return imports;
  }

  /**
   * Generate support files for the agent
   */
  private generateSupportFiles(
    configuration: UnifiedConfiguration,
    mode: GenerationMode
  ): UnifiedVerificationResult['additionalFiles'] {
    const files: NonNullable<UnifiedVerificationResult['additionalFiles']> = {
      '__init__.py': generateInitPy()
    };

    // Generate requirements.txt
    const requirements = ['google-adk', 'python-dotenv'];
    
    if (configuration.mcpConfigs.length > 0) {
      requirements.push('mcp');
    }
    
    if (configuration.langfuseConfig) {
      requirements.push('langfuse');
    }
    
    if (configuration.memoryConfig) {
      requirements.push('mem0ai');
    }

    files['requirements.txt'] = requirements.join('\n');

    // Generate .env.example
    const envVars = ['GOOGLE_API_KEY=your_google_api_key_here'];
    
    if (configuration.mcpConfigs.length > 0) {
      envVars.push('SMITHERY_API_KEY=your_smithery_api_key_here');
    }
    
    if (configuration.langfuseConfig) {
      envVars.push(
        'LANGFUSE_PUBLIC_KEY=your_langfuse_public_key',
        'LANGFUSE_SECRET_KEY=your_langfuse_secret_key',
        'LANGFUSE_HOST=https://cloud.langfuse.com'
      );
    }
    
    if (configuration.memoryConfig) {
      envVars.push('MEM0_API_KEY=your_mem0_api_key_here');
    }

    files['.env.example'] = envVars.join('\n');

    return files;
  }

  /**
   * Quick validation for specific use cases
   */
  async quickValidate(
    code: string,
    configuration: UnifiedConfiguration
  ): Promise<{ isValid: boolean; criticalErrors: string[] }> {
    const criticalChecks = [
      { check: () => code.includes('LlmAgent'), error: 'Missing LlmAgent implementation' },
      { check: () => code.includes('__all__'), error: 'Missing module exports' },
      { check: () => code.length > 50, error: 'Code appears to be empty or too short' },
      { check: () => !code.includes('YOUR_API_KEY'), error: 'Code contains placeholder API keys' }
    ];

    const criticalErrors = criticalChecks
      .filter(check => !check.check())
      .map(check => check.error);

    return {
      isValid: criticalErrors.length === 0,
      criticalErrors
    };
  }
}