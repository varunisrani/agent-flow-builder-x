import type { VerificationError, MemoryErrorPattern } from './types';

/**
 * Comprehensive Memory (Mem0) Error Catalog
 * Based on actual errors from memory agent implementation and Mem0 integration patterns
 */
export class MemoryErrorCatalog {
  private static readonly ERROR_PATTERNS: MemoryErrorPattern[] = [
    {
      id: 'memory-module-import-error',
      name: 'Memory Module Import Error',
      pattern: /ModuleNotFoundError.*mem0|from mem0 import Memory.*(?!.*mem0ai)/gs,
      description: 'ModuleNotFoundError: No module named \'mem0\'. Need to install mem0ai package.',
      severity: 'error',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /from mem0 import Memory/g,
        replace: `# Install required package: pip install mem0ai
from mem0 import Memory`,
        description: 'Add package installation instruction and ensure correct mem0 import',
        confidenceScore: 95
      },
      examples: {
        problematic: `from mem0 import Memory  # Wrong package name`,
        fixed: `# Install required package: pip install mem0ai
from mem0 import Memory`
      }
    },
    {
      id: 'memory-data-type-error',
      name: 'Memory Data Type Error',
      pattern: /for\s+\w+\s+in\s+memories\[\s*:\s*\d+\s*\]/g,
      description: 'TypeError: unhashable type: \'slice\'. Unsafe slicing of memories results.',
      severity: 'error',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /for\s+(\w+)\s+in\s+memories\[\s*:\s*(\d+)\s*\]/g,
        replace: `# Handle different possible return types from Mem0
        if hasattr(memories, '__iter__') and not isinstance(memories, str):
            memory_list = list(memories)[:$2]  # Convert to list safely
            for $1 in memory_list`,
        description: 'Add safe type checking and conversion before slicing memories',
        confidenceScore: 90
      },
      examples: {
        problematic: `for memory_item in memories[:3]:  # This line failed`,
        fixed: `if hasattr(memories, '__iter__') and not isinstance(memories, str):
            memory_list = list(memories)[:3]  # Convert to list safely
            for memory_item in memory_list:`
      }
    },
    {
      id: 'memory-initialization-error',
      name: 'Memory Initialization Error',
      pattern: /memory\s*=\s*Memory\(\)(?!\s*#.*error.*handling)(?!.*try)/g,
      description: 'Memory initialization without error handling. Can fail with authentication/API errors.',
      severity: 'error',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /memory\s*=\s*Memory\(\)/g,
        replace: `memory = None
if os.environ.get('MEM0_API_KEY'):
    try:
        memory = Memory()
        print("✓ Mem0 memory initialized")
    except Exception as e:
        print(f"Failed to initialize Mem0: {e}")
        memory = None
else:
    print("Warning: MEM0_API_KEY not set. Memory features will be disabled.")`,
        description: 'Add error handling and environment variable checks for memory initialization',
        confidenceScore: 95
      },
      examples: {
        problematic: `memory = Memory()  # No error handling`,
        fixed: `memory = None
if os.environ.get('MEM0_API_KEY'):
    try:
        memory = Memory()
        print("✓ Mem0 memory initialized")
    except Exception as e:
        print(f"Failed to initialize Mem0: {e}")
        memory = None`
      }
    },
    {
      id: 'memory-function-crashes',
      name: 'Memory Function Crashes',
      pattern: /memory\.(search|add)\(/g,
      description: 'AttributeError: \'NoneType\' object has no attribute \'search\'. Missing null checks.',
      severity: 'error',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /(\w+)\s*=\s*memory\.(search|add)\(/g,
        replace: `if not memory:  # Check if memory is available
        return []
    
    try:
        $1 = memory.$2(`,
        description: 'Add null checks and error handling around memory operations',
        confidenceScore: 85
      },
      examples: {
        problematic: `results = memory.search(query, user_id=user_id)  # Crashes if memory is None`,
        fixed: `if not memory:  # Check if memory is available
        return []
    
    try:
        results = memory.search(query, user_id=user_id)`
      }
    },
    {
      id: 'memory-environment-config',
      name: 'Memory Environment Configuration Error',
      pattern: /load_dotenv\(\)(?!.*multiple.*locations)(?!.*MEM0_API_KEY)/g,
      description: 'Environment configuration only loads from current directory. Missing MEM0_API_KEY handling.',
      severity: 'warning',
      version: 'current',
      autoFixable: true,
      fix: {
        search: /load_dotenv\(\)/g,
        replace: `# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) 
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv()  # Also load from current working directory

# Check for required API keys
print(f"🔧 Agent Configuration:")
print(f"   Memory enabled: {bool(os.environ.get('MEM0_API_KEY'))}")`,
        description: 'Load environment variables from multiple locations and add memory configuration logging',
        confidenceScore: 90
      },
      examples: {
        problematic: `load_dotenv()  # Only loads from current directory`,
        fixed: `# Load environment variables from multiple possible locations
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv()  # Also load from current working directory`
      }
    }
  ];

  /**
   * Detect memory-related errors in code
   */
  static detectErrors(code: string): VerificationError[] {
    const errors: VerificationError[] = [];
    
    this.ERROR_PATTERNS.forEach((pattern) => {
      const matches = Array.from(code.matchAll(pattern.pattern));
      matches.forEach((match, index) => {
        const line = code.substring(0, match.index).split('\n').length;
        
        errors.push({
          id: `${pattern.id}-${line}-${index}`,
          type: pattern.id.toUpperCase().replace(/-/g, '_'),
          category: 'memory',
          severity: pattern.severity,
          message: pattern.description,
          line,
          fixed: false,
          autoFixable: pattern.autoFixable,
          originalCode: match[0],
          fixDescription: pattern.fix?.description,
          confidenceScore: pattern.fix?.confidenceScore
        });
      });
    });

    return errors;
  }

  /**
   * Apply automatic fixes for memory errors
   */
  static applyFixes(code: string, errors: VerificationError[]): {
    fixedCode: string;
    appliedFixes: string[];
    unfixedErrors: VerificationError[];
  } {
    let fixedCode = code;
    const appliedFixes: string[] = [];
    const unfixedErrors: VerificationError[] = [];

    errors.forEach((error) => {
      const pattern = this.ERROR_PATTERNS.find(p => 
        error.type === p.id.toUpperCase().replace(/-/g, '_')
      );

      if (pattern && pattern.autoFixable && pattern.fix) {
        try {
          const beforeFix = fixedCode;
          fixedCode = fixedCode.replace(pattern.fix.search, pattern.fix.replace);
          
          if (beforeFix !== fixedCode) {
            appliedFixes.push(pattern.fix.description);
            error.fixed = true;
            error.fixedCode = fixedCode;
          } else {
            unfixedErrors.push(error);
          }
        } catch (e) {
          console.warn(`Failed to apply fix for ${pattern.id}:`, e);
          unfixedErrors.push(error);
        }
      } else {
        unfixedErrors.push(error);
      }
    });

    return {
      fixedCode,
      appliedFixes,
      unfixedErrors
    };
  }

  /**
   * Get recommendations for memory integration improvements
   */
  static getRecommendations(code: string): string[] {
    const recommendations: string[] = [];

    // Check for memory integration patterns
    if (code.includes('Memory()') && !code.includes('memory.search')) {
      recommendations.push('Consider implementing memory search functionality for context retrieval.');
    }

    if (code.includes('memory.add') && !code.includes('memory.search')) {
      recommendations.push('Add memory search to retrieve relevant context before responding.');
    }

    if (!code.includes('MEM0_API_KEY') && code.includes('Memory')) {
      recommendations.push('Add MEM0_API_KEY environment variable checking for proper configuration.');
    }

    if (code.includes('Memory') && !code.includes('try:')) {
      recommendations.push('Wrap memory operations in try-catch blocks for better error handling.');
    }

    if (code.includes('memories[') && !code.includes('hasattr')) {
      recommendations.push('Add type checking before iterating memory results to prevent slice errors.');
    }

    return recommendations;
  }

  /**
   * Get error pattern by ID for testing and debugging
   */
  static getPatternById(id: string): MemoryErrorPattern | undefined {
    return this.ERROR_PATTERNS.find(pattern => pattern.id === id);
  }

  /**
   * Get all available error patterns
   */
  static getAllPatterns(): MemoryErrorPattern[] {
    return [...this.ERROR_PATTERNS];
  }
}