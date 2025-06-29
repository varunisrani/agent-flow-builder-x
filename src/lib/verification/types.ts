export interface VerificationError {
  id: string;
  type: string;
  category: 'langfuse' | 'mcp' | 'event-handling' | 'memory' | 'syntax' | 'runtime' | 'import' | 'security' | 'compatibility';
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  fixed: boolean;
  autoFixable: boolean;
  originalCode?: string;
  fixedCode?: string;
  fixDescription?: string;
  confidenceScore?: number; // 0-100, how confident we are in the fix
}

export interface VerificationProgress {
  step: string;
  progress: number; // 0-100
  message: string;
  currentPhase: 'analyzing' | 'detecting' | 'fixing' | 'validating' | 'complete' | 'error';
  errors?: VerificationError[];
  data?: any;
}

export interface VerificationResult {
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: VerificationError[];
  warnings: VerificationError[];
  fixedCode: string;
  originalCode: string;
  metadata: {
    verificationTime: number;
    fixesApplied: number;
    errorTypesFound: string[];
    langfuseErrorsFound: number;
    mcpErrorsFound: number;
    eventHandlingErrorsFound: number;
    memoryErrorsFound: number;
    aiFixesApplied: number;
    patternFixesApplied: number;
    verificationMethod: 'ai' | 'pattern' | 'hybrid';
    confidence: number; // Overall confidence in the verification result
  };
  suggestions?: string[];
}

export interface LangfuseErrorPattern {
  id: string;
  name: string;
  pattern: RegExp;
  description: string;
  severity: 'error' | 'warning';
  version: string; // Langfuse version this error applies to
  autoFixable: boolean;
  fix?: {
    search: RegExp;
    replace: string;
    description: string;
    confidenceScore: number;
  };
  examples: {
    problematic: string;
    fixed: string;
  };
}

export interface EventHandlingErrorPattern {
  id: string;
  name: string;
  pattern: RegExp;
  description: string;
  severity: 'error' | 'warning';
  version: string; // Version this error applies to
  autoFixable: boolean;
  fix?: {
    search: RegExp;
    replace: string;
    description: string;
    confidenceScore: number;
  };
  examples: {
    problematic: string;
    fixed: string;
  };
}

export interface CodeFixAttempt {
  id: string;
  method: 'ai' | 'pattern';
  originalCode: string;
  fixedCode: string;
  errors: VerificationError[];
  success: boolean;
  confidence: number;
  reasoning?: string;
  timestamp: Date;
}

export interface VerificationOptions {
  enableLangfuseChecks?: boolean;
  enableMcpChecks?: boolean;
  enableEventHandlingChecks?: boolean;
  enableMemoryChecks?: boolean;
  enableAIFixes?: boolean;
  enablePatternFixes?: boolean;
  maxAIRetries?: number;
  confidenceThreshold?: number; // Minimum confidence to apply a fix
  onProgress?: (progress: VerificationProgress) => void;
  abortSignal?: AbortSignal;
  openRouterApiKey?: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface AIFixRequest {
  code: string;
  errors: VerificationError[];
  context: {
    framework: 'google-adk' | 'custom';
    integrations: string[];
    language: 'python';
  };
  options: {
    maxRetries: number;
    preserveStructure: boolean;
    fixOnlyErrors: boolean;
  };
}

export interface MemoryErrorPattern {
  id: string;
  name: string;
  pattern: RegExp;
  description: string;
  severity: 'error' | 'warning';
  version: string; // Version this error applies to
  autoFixable: boolean;
  fix?: {
    search: RegExp;
    replace: string;
    description: string;
    confidenceScore: number;
  };
  examples: {
    problematic: string;
    fixed: string;
  };
}

export interface AIFixResponse {
  success: boolean;
  fixedCode: string;
  appliedFixes: Array<{
    errorId: string;
    fix: string;
    confidence: number;
    reasoning: string;
  }>;
  unfixedErrors: VerificationError[];
  reasoning: string;
  confidence: number;
}