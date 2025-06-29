import type { VerificationError, LangfuseErrorPattern } from './types';

/**
 * Comprehensive Langfuse Error Catalog
 * Based on actual errors from agent.py and Langfuse API changes
 */
export class LangfuseErrorCatalog {
  private static readonly ERROR_PATTERNS: LangfuseErrorPattern[] = [
    {
      id: 'langfuse-track-event-not-exists',
      name: 'track_event method does not exist',
      pattern: /langfuse\.track_event\s*\(/g,
      description: 'The track_event method was removed in Langfuse 3.0+. Use simplified logging instead.',
      severity: 'error',
      version: '3.0+',
      autoFixable: true,
      fix: {
        search: /langfuse\.track_event\s*\(\s*event_name\s*=\s*["']([^"']+)["']\s*,\s*properties\s*=\s*\{([^}]*)\}\s*\)/g,
        replace: `print(f"📊 Analytics: $1 - {$2}")`,
        description: 'Replace track_event with simplified logging that prints analytics information',
        confidenceScore: 95
      },
      examples: {
        problematic: `langfuse.track_event(event_name="conversation_interaction", properties={"user_id": user_id})`,
        fixed: `print(f"📊 Analytics: conversation_interaction - {'user_id': user_id}")`
      }
    },
    {
      id: 'langfuse-create-event-properties-error',
      name: 'create_event unexpected keyword argument properties',
      pattern: /langfuse\.create_event\s*\([^)]*properties\s*=/g,
      description: 'The create_event method does not accept properties parameter in current Langfuse version.',
      severity: 'error',
      version: '3.0+',
      autoFixable: true,
      fix: {
        search: /langfuse\.create_event\s*\(\s*name\s*=\s*["']([^"']+)["']\s*,\s*properties\s*=\s*\{([^}]*)\}\s*\)/g,
        replace: `print(f"📊 Analytics Event: $1 - {$2}")`,
        description: 'Replace create_event with properties parameter with simplified logging',
        confidenceScore: 90
      },
      examples: {
        problematic: `langfuse.create_event(name="agent_response", properties={"response": response})`,
        fixed: `print(f"📊 Analytics Event: agent_response - {'response': response}")`
      }
    },
    {
      id: 'langfuse-api-compatibility-fallback',
      name: 'General Langfuse API compatibility issues',
      pattern: /langfuse\.[a-zA-Z_]+\([^)]*\)(?!\s*#\s*FIXED)/g,
      description: 'Potential Langfuse API compatibility issue. Consider adding try-catch for error handling.',
      severity: 'warning',
      version: 'all',
      autoFixable: true,
      fix: {
        search: /(.*langfuse\.[a-zA-Z_]+\([^)]*\))/g,
        replace: `try:
            $1
        except Exception as e:
            print(f"Warning: Langfuse operation failed: {e}")
            # Continue execution even if analytics fails`,
        description: 'Wrap Langfuse calls in try-catch blocks to handle API changes gracefully',
        confidenceScore: 80
      },
      examples: {
        problematic: `langfuse.some_method(data)`,
        fixed: `try:
    langfuse.some_method(data)
except Exception as e:
    print(f"Warning: Langfuse operation failed: {e}")
    # Continue execution even if analytics fails`
      }
    },
    {
      id: 'langfuse-missing-error-handling',
      name: 'Missing error handling for Langfuse operations',
      pattern: /def track_conversation\([^)]*\):\s*if langfuse:\s*langfuse\./g,
      description: 'Langfuse operations should include error handling to prevent crashes.',
      severity: 'warning',
      version: 'all',
      autoFixable: true,
      fix: {
        search: /(def track_conversation\([^)]*\):\s*if langfuse:\s*)(.*)/g,
        replace: `$1try:
            # For Langfuse 3.0.5, we'll simplify tracking to avoid API compatibility issues
            $2
        except Exception as e:
            print(f"Warning: Failed to track conversation: {e}")
            # Continue execution even if tracking fails`,
        description: 'Add proper error handling to track_conversation function',
        confidenceScore: 85
      },
      examples: {
        problematic: `def track_conversation(conversation_id, user_id, metadata):
    if langfuse:
        langfuse.track_event(...)`,
        fixed: `def track_conversation(conversation_id, user_id, metadata):
    if langfuse:
        try:
            # For Langfuse 3.0.5, we'll simplify tracking to avoid API compatibility issues
            langfuse.track_event(...)
        except Exception as e:
            print(f"Warning: Failed to track conversation: {e}")
            # Continue execution even if tracking fails`
      }
    },
    {
      id: 'langfuse-initialization-check',
      name: 'Missing Langfuse initialization validation',
      pattern: /langfuse\s*=\s*Langfuse\([^)]*\)(?!\s*\n.*print.*initialized)/g,
      description: 'Langfuse initialization should include success validation.',
      severity: 'warning',
      version: 'all',
      autoFixable: true,
      fix: {
        search: /(langfuse\s*=\s*Langfuse\([^)]*\))/g,
        replace: `$1
    print("✓ Langfuse analytics initialized")`,
        description: 'Add initialization success message for Langfuse',
        confidenceScore: 75
      },
      examples: {
        problematic: `langfuse = Langfuse(public_key=..., secret_key=...)`,
        fixed: `langfuse = Langfuse(public_key=..., secret_key=...)
    print("✓ Langfuse analytics initialized")`
      }
    },
    {
      id: 'langfuse-deprecated-import',
      name: 'Using deprecated Langfuse import patterns',
      pattern: /from langfuse import [^L]*Langfuse/g,
      description: 'Ensure proper Langfuse import pattern for current version.',
      severity: 'info',
      version: '3.0+',
      autoFixable: true,
      fix: {
        search: /from langfuse import .*/g,
        replace: 'from langfuse import Langfuse',
        description: 'Use standard Langfuse import',
        confidenceScore: 90
      },
      examples: {
        problematic: `from langfuse import Langfuse, track_event`,
        fixed: `from langfuse import Langfuse`
      }
    },
    {
      id: 'langfuse-simplified-tracking',
      name: 'Recommend simplified tracking approach',
      pattern: /print\(f"📊 Analytics:[^"]*{metadata\.get\('event_type', 'interaction'\)}/g,
      description: 'Good practice: Using simplified analytics logging that is compatible with all Langfuse versions.',
      severity: 'info',
      version: 'all',
      autoFixable: false,
      examples: {
        problematic: `complex langfuse API calls`,
        fixed: `print(f"📊 Analytics: {metadata.get('event_type', 'interaction')} for user {user_id} in conversation {conversation_id}")`
      }
    }
  ];

  /**
   * Detect Langfuse-specific errors in code
   */
  static detectErrors(code: string): VerificationError[] {
    const errors: VerificationError[] = [];
    
    this.ERROR_PATTERNS.forEach((pattern) => {
      const matches = Array.from(code.matchAll(pattern.pattern));
      
      matches.forEach((match, index) => {
        // Calculate line number
        const beforeMatch = code.substring(0, match.index);
        const line = beforeMatch.split('\n').length;
        
        errors.push({
          id: `${pattern.id}-${index}`,
          type: pattern.id,
          category: 'langfuse',
          severity: pattern.severity,
          message: pattern.description,
          line,
          fixed: false,
          autoFixable: pattern.autoFixable,
          originalCode: match[0],
          fixDescription: pattern.fix?.description,
          confidenceScore: pattern.fix?.confidenceScore || 0
        });
      });
    });
    
    return errors;
  }

  /**
   * Apply automatic fixes to Langfuse errors
   */
  static applyFixes(code: string, errors: VerificationError[]): { fixedCode: string; appliedFixes: string[]; unfixedErrors: VerificationError[] } {
    let fixedCode = code;
    const appliedFixes: string[] = [];
    const unfixedErrors: VerificationError[] = [];
    
    errors.forEach((error) => {
      const pattern = this.ERROR_PATTERNS.find(p => p.id === error.type);
      
      if (pattern && pattern.autoFixable && pattern.fix) {
        // Apply the fix
        const beforeFix = fixedCode;
        fixedCode = fixedCode.replace(pattern.fix.search, pattern.fix.replace);
        
        if (beforeFix !== fixedCode) {
          appliedFixes.push(`${pattern.name}: ${pattern.fix.description}`);
          error.fixed = true;
          error.fixedCode = fixedCode;
        } else {
          unfixedErrors.push(error);
        }
      } else {
        unfixedErrors.push(error);
      }
    });
    
    return { fixedCode, appliedFixes, unfixedErrors };
  }

  /**
   * Get specific pattern by ID
   */
  static getPattern(id: string): LangfuseErrorPattern | undefined {
    return this.ERROR_PATTERNS.find(p => p.id === id);
  }

  /**
   * Get all patterns by severity
   */
  static getPatternsBySeverity(severity: 'error' | 'warning' | 'info'): LangfuseErrorPattern[] {
    return this.ERROR_PATTERNS.filter(p => p.severity === severity);
  }

  /**
   * Check if code has any known Langfuse issues
   */
  static hasLangfuseIssues(code: string): boolean {
    return this.detectErrors(code).length > 0;
  }

  /**
   * Get fix recommendations for code
   */
  static getRecommendations(code: string): string[] {
    const errors = this.detectErrors(code);
    const recommendations: string[] = [];
    
    if (errors.some(e => e.type === 'langfuse-track-event-not-exists')) {
      recommendations.push('Consider migrating from track_event to simplified logging for better compatibility');
    }
    
    if (errors.some(e => e.type === 'langfuse-create-event-properties-error')) {
      recommendations.push('Update create_event calls to match current Langfuse API');
    }
    
    if (errors.some(e => e.severity === 'error')) {
      recommendations.push('Add try-catch blocks around Langfuse operations to prevent crashes');
    }
    
    if (!code.includes('load_dotenv')) {
      recommendations.push('Ensure environment variables are loaded for Langfuse configuration');
    }
    
    return recommendations;
  }

  /**
   * Generate comprehensive Langfuse compatibility report
   */
  static generateCompatibilityReport(code: string): {
    compatible: boolean;
    version: string;
    issues: VerificationError[];
    recommendations: string[];
    confidence: number;
  } {
    const issues = this.detectErrors(code);
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    
    // Calculate compatibility confidence (0-100)
    let confidence = 100;
    confidence -= errorCount * 25; // Each error reduces confidence by 25%
    confidence -= warningCount * 10; // Each warning reduces confidence by 10%
    confidence = Math.max(0, confidence);
    
    const compatible = errorCount === 0;
    
    return {
      compatible,
      version: '3.0+',
      issues,
      recommendations: this.getRecommendations(code),
      confidence
    };
  }
}