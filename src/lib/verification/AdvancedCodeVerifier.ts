import type { 
  VerificationError, 
  VerificationProgress, 
  VerificationResult, 
  VerificationOptions,
  CodeFixAttempt,
  AIFixRequest
} from './types';
import { LangfuseErrorCatalog } from './LangfuseErrorCatalog';
import { EventHandlingErrorCatalog } from './EventHandlingErrorCatalog';
import { MemoryErrorCatalog } from './MemoryErrorCatalog';
import { OpenRouterFixingService } from './OpenRouterFixingService';

/**
 * Advanced Code Verifier with AI-powered error detection and fixing
 * Integrates pattern-based and AI-based error detection and resolution
 */
export class AdvancedCodeVerifier {
  private openRouterService: OpenRouterFixingService | null = null;
  private fixAttempts: CodeFixAttempt[] = [];

  constructor(openRouterApiKey?: string) {
    if (openRouterApiKey) {
      this.openRouterService = new OpenRouterFixingService(openRouterApiKey);
    }
  }

  /**
   * Main verification method with comprehensive error detection and fixing
   */
  async verifyAndFix(
    code: string, 
    options: VerificationOptions = {}
  ): Promise<VerificationResult> {
    const startTime = performance.now();
    let currentCode = code;
    const allErrors: VerificationError[] = [];
    const appliedFixes: string[] = [];
    
    try {
      // Phase 1: Initial Analysis
      this.reportProgress(options, 'analyzing', 10, 'Analyzing code structure and imports...');
      
      const basicErrors = this.detectBasicErrors(currentCode);
      allErrors.push(...basicErrors);

      // Phase 2: Langfuse-specific Error Detection
      if (options.enableLangfuseChecks !== false) {
        this.reportProgress(options, 'detecting', 25, 'Detecting Langfuse compatibility issues...');
        
        const langfuseErrors = LangfuseErrorCatalog.detectErrors(currentCode);
        allErrors.push(...langfuseErrors);
        
        this.reportProgress(options, 'detecting', 35, `Found ${langfuseErrors.length} Langfuse-specific issues`);
      }

      // Phase 3: MCP Error Detection
      if (options.enableMcpChecks !== false) {
        this.reportProgress(options, 'detecting', 45, 'Checking MCP integration patterns...');
        
        const mcpErrors = this.detectMcpErrors(currentCode);
        allErrors.push(...mcpErrors);
      }

      // Phase 3.5: Event Handling Error Detection
      if (options.enableEventHandlingChecks !== false) {
        this.reportProgress(options, 'detecting', 50, 'Detecting event handling compatibility issues...');
        
        const eventHandlingErrors = EventHandlingErrorCatalog.detectErrors(currentCode);
        allErrors.push(...eventHandlingErrors);
        
        this.reportProgress(options, 'detecting', 55, `Found ${eventHandlingErrors.length} event handling issues`);
      }

      // Phase 3.6: Memory Error Detection
      if (options.enableMemoryChecks !== false) {
        this.reportProgress(options, 'detecting', 57, 'Detecting memory integration compatibility issues...');
        
        const memoryErrors = MemoryErrorCatalog.detectErrors(currentCode);
        allErrors.push(...memoryErrors);
        
        this.reportProgress(options, 'detecting', 60, `Found ${memoryErrors.length} memory integration issues`);
      }

      // Phase 4: Pattern-based Fixes
      if (options.enablePatternFixes !== false && allErrors.length > 0) {
        this.reportProgress(options, 'fixing', 65, 'Applying pattern-based fixes...');
        
        const patternFixResult = this.applyPatternFixes(currentCode, allErrors);
        if (patternFixResult.fixedCode !== currentCode) {
          currentCode = patternFixResult.fixedCode;
          appliedFixes.push(...patternFixResult.appliedFixes);
          
          this.reportProgress(options, 'fixing', 65, `Applied ${patternFixResult.appliedFixes.length} pattern-based fixes`);
        }
        
        // Update error statuses
        patternFixResult.fixedErrorIds.forEach(errorId => {
          const error = allErrors.find(e => e.id === errorId);
          if (error) {
            error.fixed = true;
            error.fixedCode = currentCode;
          }
        });
      }

      // Phase 5: AI-powered Fixes
      if (options.enableAIFixes !== false && this.openRouterService) {
        const unfixedErrors = allErrors.filter(e => !e.fixed && e.severity === 'error');
        
        if (unfixedErrors.length > 0) {
          this.reportProgress(options, 'fixing', 75, `Applying AI fixes for ${unfixedErrors.length} remaining errors...`);
          
          const aiFixResult = await this.applyAIFixes(currentCode, unfixedErrors, options);
          if (aiFixResult.success) {
            currentCode = aiFixResult.fixedCode;
            appliedFixes.push(...aiFixResult.appliedFixes.map(f => f.fix));
            
            // Update error statuses
            aiFixResult.appliedFixes.forEach(fix => {
              const error = allErrors.find(e => e.id === fix.errorId || e.type === fix.errorId);
              if (error) {
                error.fixed = true;
                error.fixedCode = currentCode;
                error.confidenceScore = fix.confidence;
              }
            });
          }
        }
      }

      // Phase 6: Final Validation
      this.reportProgress(options, 'validating', 90, 'Running final validation...');
      
      const finalErrors = this.detectBasicErrors(currentCode);
      const validationResult = this.validateFixedCode(code, currentCode, allErrors);
      

      // Phase 7: Complete
      this.reportProgress(options, 'complete', 100, 'Verification completed successfully!');

      const endTime = performance.now();
      const verificationTime = endTime - startTime;

      // Build result
      const errors = allErrors.filter(e => e.severity === 'error');
      const warnings = allErrors.filter(e => e.severity === 'warning');
      const fixedErrors = allErrors.filter(e => e.fixed && e.severity === 'error');
      const fixedWarnings = allErrors.filter(e => e.fixed && e.severity === 'warning');
      const totalFixed = fixedErrors.length + fixedWarnings.length;
      
      const langfuseErrorsFound = allErrors.filter(e => e.category === 'langfuse').length;
      const mcpErrorsFound = allErrors.filter(e => e.category === 'mcp').length;
      const eventHandlingErrorsFound = allErrors.filter(e => e.category === 'event-handling').length;
      const memoryErrorsFound = allErrors.filter(e => e.category === 'memory').length;
      const aiFixesApplied = this.fixAttempts.filter(a => a.method === 'ai' && a.success).length;
      const patternFixesApplied = this.fixAttempts.filter(a => a.method === 'pattern' && a.success).length;

      // Calculate overall confidence
      const totalErrors = errors.length;
      const totalWarnings = warnings.length;
      const totalIssues = totalErrors + totalWarnings;
      
      let confidence = 100; // Start with perfect confidence
      
      if (totalIssues > 0) {
        // Calculate base confidence from fix rate
        const fixRate = totalFixed / totalIssues;
        confidence = Math.floor(fixRate * 100);
        
        // If we have a good fix rate, boost confidence for critical fixes
        if (fixRate >= 0.5) {
          // Reward fixing critical errors more than warnings
          const fixedCriticalErrors = errors.filter(e => e.fixed && e.severity === 'error').length;
          const fixedWarnings = warnings.filter(w => w.fixed).length;
          
          // Add bonus points for fixing critical issues
          confidence += Math.min(20, fixedCriticalErrors * 5 + fixedWarnings * 2);
        }
      }
      
      // Adjust confidence based on validation
      if (!validationResult.syntaxValid) confidence -= 20;
      if (!validationResult.structurePreserved) confidence -= 15;
      
      // Ensure confidence is between 0 and 100
      confidence = Math.max(0, Math.min(100, confidence));

      return {
        isValid: errors.filter(e => !e.fixed).length === 0,
        hasErrors: errors.length > 0,
        hasWarnings: warnings.length > 0,
        errors: allErrors,
        warnings,
        fixedCode: currentCode,
        originalCode: code,
        metadata: {
          verificationTime,
          fixesApplied: totalFixed,
          errorTypesFound: [...new Set(allErrors.map(e => e.type))],
          langfuseErrorsFound,
          mcpErrorsFound,
          eventHandlingErrorsFound,
          memoryErrorsFound,
          aiFixesApplied,
          patternFixesApplied,
          verificationMethod: this.determineVerificationMethod(patternFixesApplied, aiFixesApplied),
          confidence
        },
        suggestions: this.generateSuggestions(currentCode, allErrors)
      };

    } catch (error) {
      this.reportProgress(options, 'error', 0, `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      const endTime = performance.now();
      return {
        isValid: false,
        hasErrors: true,
        hasWarnings: false,
        errors: [{
          id: 'verification-system-error',
          type: 'VERIFICATION_SYSTEM_ERROR',
          category: 'runtime',
          severity: 'error',
          message: `Verification system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          fixed: false,
          autoFixable: false
        }],
        warnings: [],
        fixedCode: code,
        originalCode: code,
        metadata: {
          verificationTime: endTime - startTime,
          fixesApplied: 0,
          errorTypesFound: ['VERIFICATION_SYSTEM_ERROR'],
          langfuseErrorsFound: 0,
          mcpErrorsFound: 0,
          eventHandlingErrorsFound: 0,
          memoryErrorsFound: 0,
          aiFixesApplied: 0,
          patternFixesApplied: 0,
          verificationMethod: 'hybrid',
          confidence: 0
        },
        suggestions: ['Please check the code manually for syntax errors']
      };
    }
  }

  /**
   * Detect basic Python syntax and structure errors
   */
  private detectBasicErrors(code: string): VerificationError[] {
    const errors: VerificationError[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Check for basic syntax issues
      if (line.includes('YOUR_API_KEY') || line.includes('your_api_key_here')) {
        errors.push({
          id: `placeholder-api-key-${lineNumber}`,
          type: 'PLACEHOLDER_API_KEY',
          category: 'security',
          severity: 'warning',
          message: 'Code contains placeholder API keys that should be replaced',
          line: lineNumber,
          fixed: false,
          autoFixable: false,
          originalCode: line.trim()
        });
      }

      // Check for missing imports
      if (line.includes('LlmAgent') && !code.includes('from google.adk.agents import LlmAgent')) {
        errors.push({
          id: `missing-llm-agent-import-${lineNumber}`,
          type: 'MISSING_IMPORT',
          category: 'import',
          severity: 'error',
          message: 'Missing import for LlmAgent',
          line: lineNumber,
          fixed: false,
          autoFixable: true,
          originalCode: line.trim(),
          fixDescription: 'Add "from google.adk.agents import LlmAgent" import'
        });
      }

      // Check for print statements without f-string format (potential formatting errors)
      if (line.includes('print(f"') && !line.includes('{') && line.includes('"')) {
        errors.push({
          id: `potential-fstring-error-${lineNumber}`,
          type: 'POTENTIAL_FSTRING_ERROR',
          category: 'syntax',
          severity: 'warning',
          message: 'Potential f-string formatting issue',
          line: lineNumber,
          fixed: false,
          autoFixable: false,
          originalCode: line.trim()
        });
      }
    });

    // Check for required exports
    if (!code.includes('__all__')) {
      errors.push({
        id: 'missing-exports',
        type: 'MISSING_EXPORTS',
        category: 'structure',
        severity: 'warning',
        message: 'Module missing __all__ exports declaration',
        fixed: false,
        autoFixable: true,
        fixDescription: 'Add __all__ = ["root_agent"] at the end of the file'
      });
    }

    return errors;
  }

  /**
   * Detect MCP-specific errors
   */
  private detectMcpErrors(code: string): VerificationError[] {
    const errors: VerificationError[] = [];
    
    // Check for MCP import without usage
    if (code.includes('from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset') && 
        !code.includes('MCPToolset(')) {
      errors.push({
        id: 'mcp-import-unused',
        type: 'MCP_IMPORT_UNUSED',
        category: 'mcp',
        severity: 'warning',
        message: 'MCPToolset imported but not used',
        fixed: false,
        autoFixable: false
      });
    }

    // Check for deprecated MCP patterns
    if (code.includes('StdioConnectionParams') && !code.includes('server_params')) {
      errors.push({
        id: 'mcp-deprecated-connection-params',
        type: 'MCP_DEPRECATED_CONNECTION_PARAMS',
        category: 'mcp',
        severity: 'error',
        message: 'StdioConnectionParams should include server_params field',
        fixed: false,
        autoFixable: true,
        fixDescription: 'Wrap parameters in server_params field'
      });
    }

    return errors;
  }

  /**
   * Apply pattern-based fixes
   */
  private applyPatternFixes(code: string, errors: VerificationError[]): {
    fixedCode: string;
    appliedFixes: string[];
    fixedErrorIds: string[];
  } {
    let fixedCode = code;
    const appliedFixes: string[] = [];
    const fixedErrorIds: string[] = [];

    // Apply Langfuse fixes
    const langfuseErrors = errors.filter(e => e.category === 'langfuse');
    if (langfuseErrors.length > 0) {
      const langfuseFixResult = LangfuseErrorCatalog.applyFixes(fixedCode, langfuseErrors);
      fixedCode = langfuseFixResult.fixedCode;
      appliedFixes.push(...langfuseFixResult.appliedFixes);
      
      // Mark fixed errors
      langfuseErrors.forEach(error => {
        if (langfuseFixResult.unfixedErrors.every(ue => ue.id !== error.id)) {
          fixedErrorIds.push(error.id);
        }
      });
    }

    // Apply Event Handling fixes
    const eventHandlingErrors = errors.filter(e => e.category === 'event-handling');
    if (eventHandlingErrors.length > 0) {
      const eventHandlingFixResult = EventHandlingErrorCatalog.applyFixes(fixedCode, eventHandlingErrors);
      fixedCode = eventHandlingFixResult.fixedCode;
      appliedFixes.push(...eventHandlingFixResult.appliedFixes);
      
      // Mark fixed errors
      eventHandlingErrors.forEach(error => {
        if (eventHandlingFixResult.unfixedErrors.every(ue => ue.id !== error.id)) {
          fixedErrorIds.push(error.id);
        }
      });
    }

    // Apply Memory fixes
    const memoryErrors = errors.filter(e => e.category === 'memory');
    if (memoryErrors.length > 0) {
      const memoryFixResult = MemoryErrorCatalog.applyFixes(fixedCode, memoryErrors);
      fixedCode = memoryFixResult.fixedCode;
      appliedFixes.push(...memoryFixResult.appliedFixes);
      
      // Mark fixed errors
      memoryErrors.forEach(error => {
        if (memoryFixResult.unfixedErrors.every(ue => ue.id !== error.id)) {
          fixedErrorIds.push(error.id);
        }
      });
    }

    // Apply basic pattern fixes
    const basicFixes = this.applyBasicPatternFixes(fixedCode, errors);
    fixedCode = basicFixes.fixedCode;
    appliedFixes.push(...basicFixes.appliedFixes);
    fixedErrorIds.push(...basicFixes.fixedErrorIds);

    // Record fix attempt
    this.fixAttempts.push({
      id: `pattern-fix-${Date.now()}`,
      method: 'pattern',
      originalCode: code,
      fixedCode,
      errors: errors.filter(e => fixedErrorIds.includes(e.id)),
      success: fixedErrorIds.length > 0,
      confidence: 85,
      timestamp: new Date()
    });

    return { fixedCode, appliedFixes, fixedErrorIds };
  }

  /**
   * Apply basic pattern fixes
   */
  private applyBasicPatternFixes(code: string, errors: VerificationError[]): {
    fixedCode: string;
    appliedFixes: string[];
    fixedErrorIds: string[];
  } {
    let fixedCode = code;
    const appliedFixes: string[] = [];
    const fixedErrorIds: string[] = [];

    // Fix missing __all__ exports
    const missingExportsError = errors.find(e => e.type === 'MISSING_EXPORTS');
    if (missingExportsError && !fixedCode.includes('__all__')) {
      fixedCode += '\n\n__all__ = ["root_agent"]';
      appliedFixes.push('Added __all__ exports declaration');
      fixedErrorIds.push(missingExportsError.id);
    }

    // Fix missing LlmAgent import
    const missingImportError = errors.find(e => e.type === 'MISSING_IMPORT');
    if (missingImportError && !fixedCode.includes('from google.adk.agents import LlmAgent')) {
      fixedCode = 'from google.adk.agents import LlmAgent\n' + fixedCode;
      appliedFixes.push('Added missing LlmAgent import');
      fixedErrorIds.push(missingImportError.id);
    }

    return { fixedCode, appliedFixes, fixedErrorIds };
  }

  /**
   * Apply AI-powered fixes
   */
  private async applyAIFixes(
    code: string, 
    errors: VerificationError[], 
    options: VerificationOptions
  ): Promise<{ success: boolean; fixedCode: string; appliedFixes: any[]; unfixedErrors: VerificationError[] }> {
    if (!this.openRouterService) {
      return {
        success: false,
        fixedCode: code,
        appliedFixes: [],
        unfixedErrors: errors
      };
    }

    try {
      const aiRequest: AIFixRequest = {
        code,
        errors,
        context: {
          framework: 'google-adk',
          integrations: this.detectIntegrations(code),
          language: 'python'
        },
        options: {
          maxRetries: options.maxAIRetries || 2,
          preserveStructure: true,
          fixOnlyErrors: true
        }
      };

      const result = await this.openRouterService.fixErrors(aiRequest);

      // Record fix attempt
      this.fixAttempts.push({
        id: `ai-fix-${Date.now()}`,
        method: 'ai',
        originalCode: code,
        fixedCode: result.fixedCode,
        errors,
        success: result.success,
        confidence: result.confidence,
        reasoning: result.reasoning,
        timestamp: new Date()
      });

      return {
        success: result.success,
        fixedCode: result.fixedCode,
        appliedFixes: result.appliedFixes,
        unfixedErrors: result.unfixedErrors
      };

    } catch (error) {
      console.error('AI fixing failed:', error);
      return {
        success: false,
        fixedCode: code,
        appliedFixes: [],
        unfixedErrors: errors
      };
    }
  }

  /**
   * Detect integrations in code
   */
  private detectIntegrations(code: string): string[] {
    const integrations: string[] = [];
    
    if (code.includes('langfuse') || code.includes('Langfuse')) {
      integrations.push('langfuse');
    }
    if (code.includes('MCPToolset') || code.includes('mcp')) {
      integrations.push('mcp');
    }
    if (code.includes('mem0') || code.includes('Memory')) {
      integrations.push('mem0');
    }
    if (code.includes('EventHandler') || code.includes('event_logger') || code.includes('event_history')) {
      integrations.push('event-handling');
    }
    if (code.includes('Memory') || code.includes('mem0') || code.includes('MEM0_API_KEY')) {
      integrations.push('memory');
    }
    
    return integrations;
  }

  /**
   * Validate fixed code
   */
  private validateFixedCode(originalCode: string, fixedCode: string, errors: VerificationError[]): {
    syntaxValid: boolean;
    structurePreserved: boolean;
    issuesResolved: boolean;
  } {
    // Basic syntax validation (simplified)
    const syntaxValid = !fixedCode.includes('SyntaxError') && 
                       fixedCode.includes('def ') || fixedCode.includes('class ') || fixedCode.includes('import ');
    
    // Structure preservation check
    const originalLines = originalCode.split('\n').length;
    const fixedLines = fixedCode.split('\n').length;
    const structurePreserved = Math.abs(originalLines - fixedLines) < originalLines * 0.5; // Allow 50% change
    
    // Issues resolution check
    const fixedErrors = errors.filter(e => e.fixed);
    const issuesResolved = fixedErrors.length > 0;
    
    return { syntaxValid, structurePreserved, issuesResolved };
  }

  /**
   * Generate suggestions for improvement
   */
  private generateSuggestions(code: string, errors: VerificationError[]): string[] {
    const suggestions: string[] = [];
    
    const unfixedErrors = errors.filter(e => !e.fixed && e.severity === 'error');
    if (unfixedErrors.length > 0) {
      suggestions.push(`${unfixedErrors.length} errors remain unfixed. Consider manual review.`);
    }
    
    if (!code.includes('try:') && code.includes('langfuse')) {
      suggestions.push('Consider adding error handling around Langfuse operations for better reliability.');
    }
    
    if (!code.includes('load_dotenv')) {
      suggestions.push('Add environment variable loading with load_dotenv() for better configuration management.');
    }
    
    if (code.includes('print(') && !code.includes('logging')) {
      suggestions.push('Consider using proper logging instead of print statements for production code.');
    }

    // Add Langfuse-specific suggestions
    const langfuseRecommendations = LangfuseErrorCatalog.getRecommendations(code);
    suggestions.push(...langfuseRecommendations);

    // Add Event Handling-specific suggestions
    const eventHandlingRecommendations = EventHandlingErrorCatalog.getRecommendations(code);
    suggestions.push(...eventHandlingRecommendations);

    // Add Memory-specific suggestions
    const memoryRecommendations = MemoryErrorCatalog.getRecommendations(code);
    suggestions.push(...memoryRecommendations);
    
    return suggestions;
  }

  /**
   * Determine verification method used
   */
  private determineVerificationMethod(patternFixes: number, aiFixes: number): 'ai' | 'pattern' | 'hybrid' {
    if (aiFixes > 0 && patternFixes > 0) return 'hybrid';
    if (aiFixes > 0) return 'ai';
    return 'pattern';
  }

  /**
   * Report progress to caller
   */
  private reportProgress(
    options: VerificationOptions,
    phase: VerificationProgress['currentPhase'],
    progress: number,
    message: string,
    errors?: VerificationError[]
  ): void {
    if (options.onProgress) {
      options.onProgress({
        step: phase,
        progress,
        message,
        currentPhase: phase,
        errors,
        data: { fixAttempts: this.fixAttempts.length }
      });
    }
  }

  /**
   * Set OpenRouter API key
   */
  setOpenRouterApiKey(apiKey: string): void {
    this.openRouterService = new OpenRouterFixingService(apiKey);
  }

  /**
   * Get fix attempts history
   */
  getFixHistory(): CodeFixAttempt[] {
    return [...this.fixAttempts];
  }

  /**
   * Clear fix history
   */
  clearFixHistory(): void {
    this.fixAttempts = [];
  }
}