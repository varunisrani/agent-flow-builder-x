import type { VerificationError, EventHandlingErrorPattern } from './types';

/**
 * Comprehensive Event Handling Error Catalog
 * Based on actual errors from GitHub agent and Google ADK event handling patterns
 */
export class EventHandlingErrorCatalog {
  private static readonly ERROR_PATTERNS: EventHandlingErrorPattern[] = [
    {
      id: 'event-handling-deprecated-mcp-import',
      name: 'Deprecated MCP Import Error',
      pattern: /from google\.adk\.tools\.mcp_tool\.mcp_toolset import MCPToolset,\s*StdioServerParameters/g,
      description: 'StdioServerParameters is not recommended. Please use StdioConnectionParams.',
      severity: 'error',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /from google\.adk\.tools\.mcp_tool\.mcp_toolset import MCPToolset,\s*StdioServerParameters/g,
        replace: `from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioConnectionParams
from mcp import StdioServerParameters`,
        description: 'Replace deprecated import with proper StdioConnectionParams and separate StdioServerParameters import',
        confidenceScore: 95
      },
      examples: {
        problematic: `from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters`,
        fixed: `from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioConnectionParams
from mcp import StdioServerParameters`
      }
    },
    {
      id: 'event-handling-mcp-connection-error',
      name: 'MCP Connection Error',
      pattern: /MCPToolset\s*\(\s*connection_params\s*=\s*StdioServerParameters\s*\(/g,
      description: 'Missing required argument "server". Use StdioConnectionParams with server_params wrapper.',
      severity: 'error',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /MCPToolset\s*\(\s*connection_params\s*=\s*StdioServerParameters\s*\(/g,
        replace: `MCPToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(`,
        description: 'Wrap StdioServerParameters in StdioConnectionParams with server_params field',
        confidenceScore: 90
      },
      examples: {
        problematic: `MCPToolset(connection_params=StdioServerParameters(`,
        fixed: `MCPToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(`
      }
    },
    {
      id: 'event-handling-nonexistent-mcp-package',
      name: 'Non-existent MCP Package Error',
      pattern: /@yokingma\/time-mcp|@smithery\/cli@latest[^"]*run[^"]*--key/g,
      description: 'Package @yokingma/time-mcp doesn\'t exist. Use @dandeliongold/mcp-time instead.',
      severity: 'error',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /args\s*=\s*\[\s*"-y"\s*,\s*"@smithery\/cli@latest"\s*,\s*"run"\s*,\s*"--key"\s*,\s*smithery_api_key\s*\]/g,
        replace: `args=["-y", "@dandeliongold/mcp-time"]`,
        description: 'Replace non-existent package with working @dandeliongold/mcp-time package',
        confidenceScore: 95
      },
      examples: {
        problematic: `args=["-y","@smithery/cli@latest","run","--key",smithery_api_key]`,
        fixed: `args=["-y", "@dandeliongold/mcp-time"]`
      }
    },
    {
      id: 'event-handling-duplicate-code-blocks',
      name: 'Duplicate Code Blocks',
      pattern: /time_mcp_toolset\s*=\s*None.*time_mcp_toolset\s*=\s*None/gs,
      description: 'Same MCP configuration appears multiple times in the file.',
      severity: 'warning',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /(time_mcp_toolset\s*=\s*None.*?)(time_mcp_toolset\s*=\s*None.*?(?=\n\n|\n#|\nif|\nclass|\ndef|\n$))/gs,
        replace: '$1',
        description: 'Remove duplicate MCP toolset configuration',
        confidenceScore: 85
      },
      examples: {
        problematic: `time_mcp_toolset = None\n# ... code ...\ntime_mcp_toolset = None`,
        fixed: `time_mcp_toolset = None\n# ... code ...`
      }
    },
    {
      id: 'event-handling-smithery-api-dependency',
      name: 'Smithery API Dependency Error',
      pattern: /smithery_api_key\s*=\s*os\.getenv\(["']SMITHERY_API_KEY["']\).*use_mcp\s*=\s*smithery_api_key\s*is\s*not\s*None/gs,
      description: 'Required SMITHERY_API_KEY for basic functionality. Enable MCP by default instead.',
      severity: 'error',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /smithery_api_key\s*=\s*os\.getenv\(["']SMITHERY_API_KEY["']\).*?use_mcp\s*=\s*smithery_api_key\s*is\s*not\s*None/gs,
        replace: `use_mcp = True  # Enable MCP tools by default`,
        description: 'Remove Smithery API key dependency and enable MCP by default',
        confidenceScore: 90
      },
      examples: {
        problematic: `smithery_api_key = os.getenv("SMITHERY_API_KEY")\nuse_mcp = smithery_api_key is not None`,
        fixed: `use_mcp = True  # Enable MCP tools by default`
      }
    },
    {
      id: 'event-handling-poor-error-handling',
      name: 'Poor Error Handling',
      pattern: /time_mcp_toolset\s*=\s*MCPToolset\s*\((?!.*try:)/gs,
      description: 'No graceful fallback when MCP connection fails. Add try-catch block.',
      severity: 'warning',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /(if use_mcp:\s*)([\s\S]*?)(time_mcp_toolset\s*=\s*MCPToolset\s*\([\s\S]*?\)\s*)/g,
        replace: `$1$2try:
        print("   Initializing MCP toolset...")
        $3
        print("   ✓ MCP toolset initialized successfully")
    except Exception as e:
        print(f"   ⚠️ MCP toolset initialization failed: {e}")
        print("   Will continue in fallback mode without MCP tools")
        time_mcp_toolset = None
        use_mcp = False`,
        description: 'Add try-catch block around MCP toolset initialization with proper error handling',
        confidenceScore: 85
      },
      examples: {
        problematic: `time_mcp_toolset = MCPToolset(...)  # Would crash on failure`,
        fixed: `try:
    time_mcp_toolset = MCPToolset(...)
    print("✓ MCP toolset initialized successfully")
except Exception as e:
    print(f"⚠️ MCP toolset initialization failed: {e}")
    time_mcp_toolset = None
    use_mcp = False`
      }
    },
    {
      id: 'event-handling-inconsistent-naming',
      name: 'Inconsistent Naming',
      pattern: /(name\s*=\s*["']time_agent["']|agent_name\s*=\s*["']time_agent["']|app_name\s*=\s*["']time_agent["'])/g,
      description: 'Agent named "time_agent" but should be "github_agent" for consistency.',
      severity: 'warning',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /(name\s*=\s*["'])time_agent(["'])/g,
        replace: '$1github_agent$2',
        description: 'Update agent name to be consistent with github_agent',
        confidenceScore: 95
      },
      examples: {
        problematic: `name="time_agent"`,
        fixed: `name="github_agent"`
      }
    },
    {
      id: 'event-handling-broken-tools-config',
      name: 'Broken Tools Configuration',
      pattern: /tools\s*=\s*\[\s*time_mcp_toolset\s*,\s*time_mcp_toolset\s*if\s*time_mcp_toolset\s*and\s*time_mcp_toolset\s*else\s*\[\]\s*\]/g,
      description: 'Invalid tools parameter structure with duplicate and complex conditional logic.',
      severity: 'error',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /tools\s*=\s*\[\s*time_mcp_toolset\s*,\s*time_mcp_toolset\s*if\s*time_mcp_toolset\s*and\s*time_mcp_toolset\s*else\s*\[\]\s*\]/g,
        replace: `tools=[time_mcp_toolset] if time_mcp_toolset else []`,
        description: 'Fix tools configuration with proper conditional array',
        confidenceScore: 95
      },
      examples: {
        problematic: `tools=[time_mcp_toolset, time_mcp_toolset if time_mcp_toolset and time_mcp_toolset else []]`,
        fixed: `tools=[time_mcp_toolset] if time_mcp_toolset else []`
      }
    },
    {
      id: 'event-handling-missing-fallback',
      name: 'Missing Fallback Functionality',
      pattern: /instruction_text\s*=\s*["'].*?["'](?![\s\S]*if\s+use_mcp\s+and.*?else:)/gs,
      description: 'No fallback functionality when MCP tools are unavailable.',
      severity: 'warning',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /(instruction_text\s*=\s*["'][^"']*["'])/g,
        replace: `$1

if use_mcp and time_mcp_toolset:
    instruction_text += """ You have access to MCP time tools..."""
else:
    instruction_text += """ You are currently running in fallback mode without MCP tools..."""`,
        description: 'Add conditional instruction based on MCP availability',
        confidenceScore: 80
      },
      examples: {
        problematic: `instruction_text = "Basic instruction"`,
        fixed: `instruction_text = "Basic instruction"

if use_mcp and time_mcp_toolset:
    instruction_text += " You have access to MCP tools..."
else:
    instruction_text += " Running in fallback mode..."`
      }
    },
    {
      id: 'event-handling-logging-config-issues',
      name: 'Logging Configuration Issues',
      pattern: /(logging\.FileHandler\s*\(\s*['"]agent_events\.log['"]|event_logger\s*=\s*logging\.getLogger\s*\(\s*['"]agent_events['"])/g,
      description: 'Wrong log file name and logger name. Should use agent-specific naming.',
      severity: 'warning',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /logging\.FileHandler\s*\(\s*['"]agent_events\.log['"]/g,
        replace: `logging.FileHandler('github_agent_events.log'`,
        description: 'Update log file name to be agent-specific',
        confidenceScore: 90
      },
      examples: {
        problematic: `logging.FileHandler('agent_events.log')`,
        fixed: `logging.FileHandler('github_agent_events.log')`
      }
    }
  ];

  /**
   * Detect event handling-specific errors in code
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
          category: 'event-handling',
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
   * Apply automatic fixes to event handling errors
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
  static getPattern(id: string): EventHandlingErrorPattern | undefined {
    return this.ERROR_PATTERNS.find(p => p.id === id);
  }

  /**
   * Get all patterns by severity
   */
  static getPatternsBySeverity(severity: 'error' | 'warning' | 'info'): EventHandlingErrorPattern[] {
    return this.ERROR_PATTERNS.filter(p => p.severity === severity);
  }

  /**
   * Check if code has any known event handling issues
   */
  static hasEventHandlingIssues(code: string): boolean {
    return this.detectErrors(code).length > 0;
  }

  /**
   * Get fix recommendations for code
   */
  static getRecommendations(code: string): string[] {
    const errors = this.detectErrors(code);
    const recommendations: string[] = [];
    
    if (errors.some(e => e.type === 'event-handling-deprecated-mcp-import')) {
      recommendations.push('Update MCP imports to use current StdioConnectionParams pattern');
    }
    
    if (errors.some(e => e.type === 'event-handling-mcp-connection-error')) {
      recommendations.push('Fix MCP connection structure by wrapping StdioServerParameters properly');
    }
    
    if (errors.some(e => e.type === 'event-handling-nonexistent-mcp-package')) {
      recommendations.push('Use working MCP packages like @dandeliongold/mcp-time instead of non-existent ones');
    }
    
    if (errors.some(e => e.type === 'event-handling-poor-error-handling')) {
      recommendations.push('Add try-catch blocks around MCP initialization for better error handling');
    }
    
    if (errors.some(e => e.severity === 'error')) {
      recommendations.push('Fix critical event handling errors to ensure agent functionality');
    }
    
    return recommendations;
  }

  /**
   * Generate comprehensive event handling compatibility report
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
      version: 'current',
      issues,
      recommendations: this.getRecommendations(code),
      confidence
    };
  }
}