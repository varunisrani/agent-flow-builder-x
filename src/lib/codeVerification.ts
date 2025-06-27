// Code verification and error fixing system
export interface VerificationResult {
  isValid: boolean;
  errors: VerificationError[];
  fixedCode: string;
  warnings: string[];
}

export interface VerificationError {
  type: string;
  message: string;
  line?: number;
  fixed: boolean;
  originalCode?: string;
  fixedCode?: string;
}

export interface VerificationProgress {
  step: string;
  progress: number;
  message: string;
  errors?: VerificationError[];
}

// Known error patterns and their fixes
const ERROR_PATTERNS = {
  // Completely wrong imports - using non-existent imports
  WRONG_IMPORTS: {
    pattern: /from mcp_toolset import|from llm_agent import|import.*mcp_toolset|import.*llm_agent|from google_adk import|import.*google_adk|from google\.adk\.mcp import|class.*Agent\)|class.*LlmAgent\)/,
    message: "Using wrong imports - should use google.adk",
    fix: (code: string) => {
      // If code has completely wrong structure, replace with proper template
      if (code.includes('from mcp_toolset import') ||
          code.includes('from llm_agent import') ||
          code.includes('from google_adk import') ||
          code.includes('from google.adk.mcp import') ||
          code.includes('class') && (code.includes('Agent') || code.includes('LlmAgent'))) {
        return generateProperMCPTemplate(
          nodeData?.mcpPackage,
          nodeData?.agentName,
          nodeData?.agentDescription,
          nodeData?.agentInstruction
        );
      }
      return code;
    }
  },

  // Wrong class structure
  WRONG_CLASS_STRUCTURE: {
    pattern: /class\s+\w+\s*\(\s*(Agent|LlmAgent)\s*\):|class\s+\w+Agent\s*\(/,
    message: "Using wrong class structure - should use LlmAgent directly",
    fix: (code: string) => {
      if (code.includes('class') && (code.includes('Agent') || code.includes('LlmAgent'))) {
        return generateProperMCPTemplate(
          nodeData?.mcpPackage,
          nodeData?.agentName,
          nodeData?.agentDescription,
          nodeData?.agentInstruction
        );
      }
      return code;
    }
  },

  // Wrong non-existent classes usage
  WRONG_CLASSES: {
    pattern: /MCPClient\s*\(|MCPTool\s*\(|StdioServerParameters\s*\(\s*agent\s*=/,
    message: "Using non-existent classes - should use proper Google ADK classes",
    fix: (code: string) => {
      if (code.includes('MCPClient(') || code.includes('MCPTool(') || code.includes('StdioServerParameters(agent=')) {
        return generateProperMCPTemplate(
          nodeData?.mcpPackage,
          nodeData?.agentName,
          nodeData?.agentDescription,
          nodeData?.agentInstruction
        );
      }
      return code;
    }
  },

  // LlmAgent constructor errors
  LLMAGENT_WRONG_PARAMS: {
    pattern: /LlmAgent\s*\(\s*(?:.*?(?:instructions|toolset|session_service).*?)\)/s,
    message: "LlmAgent constructor has wrong parameter names",
    fix: (code: string) => {
      // Fix parameter names and order: name, model, description, instruction, tools
      return code.replace(
        /LlmAgent\s*\(\s*([\s\S]*?)\)/,
        (match, params) => {
          const lines = params.split('\n').map(line => line.trim()).filter(line => line);
          const fixedParams = [];
          
          // Extract values
          let name = '', model = '', description = '', instruction = '', tools = '';
          
          for (const line of lines) {
            if (line.includes('name=') || line.startsWith('"') || line.startsWith("'")) {
              name = line.replace(/name\s*=\s*/, '').replace(/,$/, '');
            } else if (line.includes('model=')) {
              model = line.replace(/model\s*=\s*/, '').replace(/,$/, '');
            } else if (line.includes('description=')) {
              description = line.replace(/description\s*=\s*/, '').replace(/,$/, '');
            } else if (line.includes('instruction=') || line.includes('instructions=')) {
              instruction = line.replace(/instructions?\s*=\s*/, '').replace(/,$/, '');
            } else if (line.includes('tools=') || line.includes('toolset=')) {
              tools = line.replace(/toolset?\s*=\s*/, '').replace(/,$/, '');
            }
          }
          
          // Ensure model is set
          if (!model) model = '"gemini-2.0-flash"';
          
          return `LlmAgent(
    name=${name || '"agent"'},
    model=${model},
    description=${description || '"AI agent"'},
    instruction=${instruction || '"You are a helpful assistant"'},
    tools=${tools || '[]'}
)`;
        }
      );
    }
  },

  // Runner missing app_name
  RUNNER_MISSING_APP_NAME: {
    pattern: /Runner\s*\(\s*agent\s*=\s*[^,]+,\s*session_service\s*=\s*[^,)]+\s*\)/,
    message: "Runner constructor missing required app_name parameter",
    fix: (code: string) => {
      return code.replace(
        /Runner\s*\(\s*(agent\s*=\s*[^,]+),\s*(session_service\s*=\s*[^,)]+)\s*\)/,
        'Runner($1, $2, app_name="agent")'
      );
    }
  },

  // Missing model in LlmAgent
  MISSING_MODEL: {
    pattern: /LlmAgent\s*\([^)]*\)/s,
    message: "LlmAgent missing model parameter",
    fix: (code: string) => {
      if (!code.includes('model=')) {
        return code.replace(
          /(LlmAgent\s*\(\s*(?:name\s*=\s*[^,]+,?\s*)?)/,
          '$1\n    model="gemini-2.0-flash",'
        );
      }
      return code;
    }
  },

  // Wrong import in __init__.py
  WRONG_INIT_IMPORT: {
    pattern: /from\s+\.\s+import\s+agent/,
    message: "Wrong import in __init__.py - should import root_agent instance",
    fix: (code: string) => {
      return code.replace(
        /from\s+\.\s+import\s+agent/,
        'from .agent import root_agent'
      );
    }
  },

  // Missing --key in MCP args
  MISSING_MCP_KEY: {
    pattern: /args\s*=\s*\[[^\]]*\]/,
    message: "MCP args missing --key parameter",
    fix: (code: string) => {
      return code.replace(
        /args\s*=\s*(\[[^\]]*\])/,
        (match, argsArray) => {
          if (!argsArray.includes('--key')) {
            const cleanArgs = argsArray.slice(1, -1); // Remove brackets
            return `args=[${cleanArgs}, "--key", smithery_api_key]`;
          }
          return match;
        }
      );
    }
  },

  // Missing SMITHERY_API_KEY in env
  MISSING_SMITHERY_ENV: {
    pattern: /env\s*=\s*\{[^}]*\}/,
    message: "Environment variables missing SMITHERY_API_KEY",
    fix: (code: string) => {
      return code.replace(
        /env\s*=\s*(\{[^}]*\})/,
        (match, envObj) => {
          if (!envObj.includes('SMITHERY_API_KEY')) {
            const cleanEnv = envObj.slice(1, -1); // Remove braces
            return `env={${cleanEnv}, "SMITHERY_API_KEY": smithery_api_key}`;
          }
          return match;
        }
      );
    }
  },

  // Using run_forever instead of run_async
  WRONG_RUN_METHOD: {
    pattern: /asyncio\.run\(runner\.run_forever\(\)\)/,
    message: "Using deprecated run_forever method",
    fix: (code: string) => {
      // Replace with proper async pattern
      const asyncPattern = `async def main():
    # Create a session
    user_id = "user"
    session = session_service.create_session(state={}, app_name="agent", user_id=user_id)
    session_id = session.id

    # Create an initial message (Content object)
    from google.genai import types
    new_message = types.Content(
        role="user",
        parts=[types.Part(text="Hello, agent!")]
    )

    # Run the agent
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=new_message
    ):
        print(event)

if __name__ == "__main__":
    asyncio.run(main())`;
      
      return code.replace(
        /if __name__ == "__main__":\s*asyncio\.run\(runner\.run_forever\(\)\)/s,
        asyncPattern
      );
    }
  },

  // Missing google.genai.types import for MCP agents
  MISSING_TYPES_IMPORT: {
    pattern: /from google\.adk\.agents import LlmAgent/,
    message: "Missing google.genai.types import for MCP agents",
    fix: (code: string) => {
      if (code.includes('LlmAgent') && code.includes('run_async') && !code.includes('from google.genai import types')) {
        return code.replace(
          /(from google\.adk\.agents import LlmAgent)/,
          '$1\nfrom google.genai import types  # For Content/Part'
        );
      }
      return code;
    }
  },

  // Duplicate tools parameter in LlmAgent
  DUPLICATE_TOOLS_PARAM: {
    pattern: /tools\s*=\s*tools\s*=\s*\[/,
    message: "Duplicate tools parameter in LlmAgent constructor",
    fix: (code: string) => {
      return code.replace(
        /tools\s*=\s*tools\s*=\s*\[/g,
        'tools=['
      );
    }
  },

  // LlmAgent validation errors - misspelled parameters
  LLMAGENT_MISSPELLED_PARAMS: {
    pattern: /LlmAgent\s*\([^)]*(?:instructions\s*=|toolset\s*=|session_service\s*=)/s,
    message: "LlmAgent has misspelled parameters (instructions/toolset/session_service)",
    fix: (code: string) => {
      return code
        .replace(/instructions\s*=/g, 'instruction=')
        .replace(/toolset\s*=/g, 'tools=')
        .replace(/,\s*session_service\s*=[^,)]+/g, ''); // Remove session_service parameter
    }
  },

  // LlmAgent validation errors - None or empty values
  LLMAGENT_NONE_VALUES: {
    pattern: /LlmAgent\s*\([^)]*(?:name\s*=\s*None|model\s*=\s*None|description\s*=\s*None|instruction\s*=\s*None|tools\s*=\s*None)/s,
    message: "LlmAgent has None values for required parameters",
    fix: (code: string) => {
      return code
        .replace(/name\s*=\s*None/g, 'name="agent"')
        .replace(/model\s*=\s*None/g, 'model="gemini-2.0-flash"')
        .replace(/description\s*=\s*None/g, 'description="AI agent"')
        .replace(/instruction\s*=\s*None/g, 'instruction="You are a helpful assistant"')
        .replace(/tools\s*=\s*None/g, 'tools=[]');
    }
  },

  // LlmAgent validation errors - empty string values
  LLMAGENT_EMPTY_VALUES: {
    pattern: /LlmAgent\s*\([^)]*(?:name\s*=\s*["'][\s]*["']|model\s*=\s*["'][\s]*["']|description\s*=\s*["'][\s]*["']|instruction\s*=\s*["'][\s]*["'])/s,
    message: "LlmAgent has empty string values for required parameters",
    fix: (code: string) => {
      return code
        .replace(/name\s*=\s*["'][\s]*["']/g, 'name="agent"')
        .replace(/model\s*=\s*["'][\s]*["']/g, 'model="gemini-2.0-flash"')
        .replace(/description\s*=\s*["'][\s]*["']/g, 'description="AI agent"')
        .replace(/instruction\s*=\s*["'][\s]*["']/g, 'instruction="You are a helpful assistant"');
    }
  },

  // LlmAgent validation errors - wrong tools type
  LLMAGENT_WRONG_TOOLS_TYPE: {
    pattern: /tools\s*=\s*(?![\[\(])[^,\)]+/,
    message: "LlmAgent tools parameter must be a list",
    fix: (code: string) => {
      return code.replace(
        /tools\s*=\s*([^,\)\[\(][^,\)]*)/g,
        'tools=[$1]'
      );
    }
  },

  // Missing SMITHERY_API_KEY environment variable check
  MISSING_API_KEY_CHECK: {
    pattern: /smithery_api_key\s*=\s*os\.getenv\([^)]+\)(?!\s*\n\s*if\s+not\s+smithery_api_key)/,
    message: "Missing SMITHERY_API_KEY validation check",
    fix: (code: string) => {
      return code.replace(
        /(smithery_api_key\s*=\s*os\.getenv\([^)]+\))/,
        `$1
if not smithery_api_key:
    raise ValueError("SMITHERY_API_KEY environment variable is not set")`
      );
    }
  },

  // Wrong Runner method - run_forever instead of run_async
  WRONG_RUNNER_METHOD: {
    pattern: /runner\.run_forever\(\)/,
    message: "Using deprecated run_forever method - should use run_async",
    fix: (code: string) => {
      const asyncMainPattern = `async def main():
    # Create a session
    user_id = "user"
    session = session_service.create_session(state={}, app_name="agent", user_id=user_id)
    session_id = session.id

    # Create an initial message (Content object)
    from google.genai import types
    new_message = types.Content(
        role="user",
        parts=[types.Part(text="Hello, agent!")]
    )

    # Run the agent
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=new_message
    ):
        print(event)

if __name__ == "__main__":
    asyncio.run(main())`;

      return code.replace(
        /if __name__ == "__main__":\s*(?:asyncio\.run\()?runner\.run_forever\(\)(?:\))?/s,
        asyncMainPattern
      );
    }
  },

  // Missing required imports for run_async pattern
  MISSING_ASYNC_IMPORTS: {
    pattern: /runner\.run_async/,
    message: "Missing required imports for async pattern",
    fix: (code: string) => {
      if (!code.includes('from google.genai import types')) {
        code = code.replace(
          /(from google\.adk\.agents import LlmAgent)/,
          '$1\nfrom google.genai import types  # For Content/Part'
        );
      }
      if (!code.includes('import asyncio')) {
        code = code.replace(
          /(import os)/,
          '$1\nimport asyncio'
        );
      }
      return code;
    }
  },

  // MCPToolset args validation - too many arguments error
  MCP_ARGS_TOO_MANY: {
    pattern: /args\s*=\s*\[[^\]]*\]/,
    message: "MCP args might cause 'too many arguments' error",
    fix: (code: string) => {
      // Ensure args follow the correct pattern: ["-y", "@smithery/cli@latest", "run", "package", "--key", "key"]
      return code.replace(
        /args\s*=\s*(\[[^\]]*\])/g,
        (match, argsArray) => {
          // If args don't include --key, add it
          if (!argsArray.includes('--key')) {
            const cleanArgs = argsArray.slice(1, -1); // Remove brackets
            return `args=[${cleanArgs}, "--key", smithery_api_key]`;
          }
          return match;
        }
      );
    }
  },

  // LlmAgent complex string validation - ensure simple, non-empty strings
  LLMAGENT_COMPLEX_STRINGS: {
    pattern: /LlmAgent\s*\([^)]*name\s*=\s*["'][^"']{50,}["']/s,
    message: "LlmAgent name parameter too complex - should be simple string",
    fix: (code: string) => {
      return code.replace(
        /(name\s*=\s*)["'][^"']{50,}["']/g,
        '$1"search_agent"'
      );
    }
  },

  // LlmAgent description validation - ensure reasonable length
  LLMAGENT_COMPLEX_DESCRIPTION: {
    pattern: /LlmAgent\s*\([^)]*description\s*=\s*["'][^"']{200,}["']/s,
    message: "LlmAgent description parameter too complex - should be concise",
    fix: (code: string) => {
      return code.replace(
        /(description\s*=\s*)["'][^"']{200,}["']/g,
        '$1"Agent that uses Gemini 2.0 model and Smithery MCP tool to find and provide information."'
      );
    }
  },

  // App name synchronization - ensure consistency across Runner and session
  APP_NAME_INCONSISTENCY: {
    pattern: /Runner\s*\([^)]*app_name\s*=\s*["']([^"']+)["'][^)]*\)[\s\S]*?session_service\.create_session\([^)]*app_name\s*=\s*["']([^"']+)["']/s,
    message: "Inconsistent app_name between Runner and session creation",
    fix: (code: string) => {
      // Extract the app_name from Runner and use it consistently
      const runnerMatch = code.match(/Runner\s*\([^)]*app_name\s*=\s*["']([^"']+)["']/);
      if (runnerMatch) {
        const appName = runnerMatch[1];
        // Replace session creation app_name to match Runner app_name
        return code.replace(
          /(session_service\.create_session\([^)]*app_name\s*=\s*)["'][^"']+["']/g,
          `$1"${appName}"`
        );
      }
      return code;
    }
  },

  // Ensure all LlmAgent parameters are simple, safe values
  LLMAGENT_SAFE_DEFAULTS: {
    pattern: /LlmAgent\s*\(/,
    message: "Ensuring LlmAgent parameters use safe, validated values",
    fix: (code: string) => {
      // Replace any potentially problematic parameter values with safe defaults
      let fixedCode = code;

      // Ensure name is simple and safe
      if (!/name\s*=\s*["'][a-zA-Z_][a-zA-Z0-9_]*["']/.test(fixedCode)) {
        fixedCode = fixedCode.replace(
          /(LlmAgent\s*\([^)]*?)name\s*=\s*[^,)]+/s,
          '$1name="search_agent"'
        );
      }

      // Ensure model is always gemini-2.0-flash
      fixedCode = fixedCode.replace(
        /(LlmAgent\s*\([^)]*?)model\s*=\s*[^,)]+/s,
        '$1model="gemini-2.0-flash"'
      );

      // Ensure description is reasonable
      if (!/description\s*=\s*["'][^"']{10,100}["']/.test(fixedCode)) {
        fixedCode = fixedCode.replace(
          /(LlmAgent\s*\([^)]*?)description\s*=\s*[^,)]+/s,
          '$1description="Agent that uses Gemini 2.0 model and Smithery MCP tool to find and provide information."'
        );
      }

      // Ensure instruction is reasonable
      if (!/instruction\s*=\s*["'][^"']{10,200}["']/.test(fixedCode)) {
        fixedCode = fixedCode.replace(
          /(LlmAgent\s*\([^)]*?)instruction\s*=\s*[^,)]+/s,
          '$1instruction="You are an agent that can use Smithery MCP to perform operations. Use the Smithery MCP tool to interact with external systems and APIs."'
        );
      }

      return fixedCode;
    }
  },

  // CRITICAL: LlmAgent parameter order - model first causes validation errors
  LLMAGENT_WRONG_PARAMETER_ORDER: {
    pattern: /LlmAgent\s*\(\s*model\s*=/,
    message: "LlmAgent constructor has wrong parameter order - name must be first, not model",
    fix: (code: string) => {
      // Extract parameters and reorder them correctly
      return code.replace(
        /LlmAgent\s*\(\s*([\s\S]*?)\)/,
        (match, params) => {
          const lines = params.split(',').map(line => line.trim());
          const paramMap: { [key: string]: string } = {};
          
          // Extract all parameters
          lines.forEach(line => {
            if (line.includes('name=')) paramMap.name = line;
            else if (line.includes('model=')) paramMap.model = line;
            else if (line.includes('description=')) paramMap.description = line;
            else if (line.includes('instruction=')) paramMap.instruction = line;
            else if (line.includes('tools=')) paramMap.tools = line;
          });
          
          // Reorder correctly: name, model, description, instruction, tools
          const orderedParams = [
            paramMap.name || 'name="agent"',
            paramMap.model || 'model="gemini-2.0-flash"',
            paramMap.description || 'description="AI agent"',
            paramMap.instruction || 'instruction="You are a helpful assistant"',
            paramMap.tools || 'tools=[]'
          ].map(p => p.replace(/,$/, '')); // Remove trailing commas
          
          return `LlmAgent(
        ${orderedParams.join(',\n        ')}
    )`;
        }
      );
    }
  },

  // CRITICAL: Synchronous session creation causes errors
  SYNCHRONOUS_SESSION_CREATION: {
    pattern: /session_service\.create_session\s*\([^)]*state\s*=/,
    message: "Using synchronous session creation - must use async with correct parameters",
    fix: (code: string) => {
      return code.replace(
        /session_service\.create_session\s*\(\s*state\s*=\s*[^,]*,\s*app_name\s*=\s*([^,]*),\s*user_id\s*=\s*([^)]*)\)/,
        'await session_service.create_session(app_name=$1, user_id=$2)'
      );
    }
  },

  // CRITICAL: Wrong Runner parameter order
  RUNNER_WRONG_PARAMETER_ORDER: {
    pattern: /Runner\s*\(\s*app_name\s*=/,
    message: "Runner constructor has wrong parameter order - agent must be first, not app_name",
    fix: (code: string) => {
      return code.replace(
        /Runner\s*\(\s*app_name\s*=\s*([^,]*),\s*agent\s*=\s*([^,]*),\s*session_service\s*=\s*([^)]*)\)/,
        'Runner(agent=$2, session_service=$3, app_name=$1)'
      );
    }
  },

  // CRITICAL: run_forever method doesn't exist
  RUN_FOREVER_USAGE: {
    pattern: /\.run_forever\s*\(\)/,
    message: "run_forever method doesn't exist - must use run_async with proper async pattern",
    fix: (code: string) => {
      return code.replace(
        /asyncio\.run\(runner\.run_forever\(\)\)/,
        `# FIXED: Use proper async pattern with run_async
async def main():
    session = await session_service.create_session(app_name="agent", user_id="user")
    async for event in runner.run_async(
        user_id=session.user_id,
        session_id=session.id,
        new_message=types.Content(role='user', parts=[types.Part(text="Hello")])
    ):
        print(event)

if __name__ == '__main__':
    asyncio.run(main())`
      );
    }
  },

  // CRITICAL: Missing dotenv import and load_dotenv() call
  MISSING_DOTENV: {
    pattern: /os\.getenv\(['"](?:GOOGLE_API_KEY|SMITHERY_API_KEY)/,
    message: "Using environment variables without loading .env file",
    fix: (code: string) => {
      if (!code.includes('from dotenv import load_dotenv')) {
        code = code.replace(
          /import os/,
          'import os\nfrom dotenv import load_dotenv'
        );
      }
      if (!code.includes('load_dotenv()')) {
        code = code.replace(
          /(import.*\n.*)/,
          '$1\n\n# Load environment variables\nload_dotenv()'
        );
      }
      return code;
    }
  },

  // Wrong Langfuse imports - non-existent analytics module
  WRONG_LANGFUSE_IMPORTS: {
    pattern: /from langfuse\.analytics import|import.*AnalyticsAgent/,
    message: "Using non-existent Langfuse analytics imports",
    fix: (code: string) => {
      return code
        .replace(/from langfuse\.analytics import AnalyticsAgent\n?/g, '')
        .replace(/import.*AnalyticsAgent.*\n?/g, '')
        .replace(/analytics_agent = AnalyticsAgent\([^)]+\)\n?/g, '')
        .replace(/__all__ = \['analytics_agent'[^\]]*\]\n?/g, '');
    }
  },

  // Wrong MCPToolset constructor pattern - tools and parameters
  WRONG_MCPTOOLSET_CONSTRUCTOR: {
    pattern: /MCPToolset\s*\(\s*tools\s*=\s*\[.*?\]\s*,\s*parameters\s*=/s,
    message: "MCPToolset constructor using wrong parameters - should use connection_params",
    fix: (code: string) => {
      return generateProperMCPTemplate(
        nodeData?.mcpPackage,
        nodeData?.agentName,
        nodeData?.agentDescription,
        nodeData?.agentInstruction
      );
    }
  },

  // Wrong agent method calls - root_agent.run_async or root_agent.Runner
  WRONG_AGENT_METHODS: {
    pattern: /root_agent\.(run_async|Runner)\s*\(/,
    message: "Using non-existent methods on agent - should use separate Runner class",
    fix: (code: string) => {
      return generateProperMCPTemplate(
        nodeData?.mcpPackage,
        nodeData?.agentName,
        nodeData?.agentDescription,
        nodeData?.agentInstruction
      );
    }
  }
};

// Main verification function
export async function verifyAndFixCode(
  code: string,
  onProgress?: (progress: VerificationProgress) => void,
  nodeData?: { mcpPackage?: string | string[]; agentName?: string; agentDescription?: string; agentInstruction?: string }
): Promise<VerificationResult> {
  const errors: VerificationError[] = [];
  const warnings: string[] = [];
  let fixedCode = code;
  let stepCount = 0;
  const totalSteps = Object.keys(ERROR_PATTERNS).length + 2;

  // Step 1: Initial validation
  stepCount++;
  onProgress?.({
    step: "initial_validation",
    progress: (stepCount / totalSteps) * 100,
    message: "Starting code verification..."
  });

  // Step 2: Check each error pattern
  for (const [errorType, pattern] of Object.entries(ERROR_PATTERNS)) {
    stepCount++;
    onProgress?.({
      step: errorType.toLowerCase(),
      progress: (stepCount / totalSteps) * 100,
      message: `Checking for ${pattern.message}...`
    });

    if (pattern.pattern.test(fixedCode)) {
      const originalCode = fixedCode;

      // Create a closure to pass nodeData to the fix function
      const fixFunction = (code: string) => {
        // For patterns that need nodeData, we need to modify them
        if (errorType === 'WRONG_IMPORTS' || errorType === 'WRONG_CLASS_STRUCTURE' || errorType === 'WRONG_CLASSES') {
          if (code.includes('from mcp_toolset import') ||
              code.includes('from llm_agent import') ||
              code.includes('from google_adk import') ||
              code.includes('class') && (code.includes('Agent') || code.includes('LlmAgent')) ||
              code.includes('MCPClient(') || code.includes('MCPTool(') || code.includes('StdioServerParameters(agent=')) {
            return generateProperMCPTemplate(
              nodeData?.mcpPackage,
              nodeData?.agentName,
              nodeData?.agentDescription,
              nodeData?.agentInstruction
            );
          }
        }
        return pattern.fix(code);
      };

      fixedCode = fixFunction(fixedCode);

      errors.push({
        type: errorType,
        message: pattern.message,
        fixed: fixedCode !== originalCode,
        originalCode: originalCode,
        fixedCode: fixedCode
      });
    }
  }

  // Step 3: Final validation
  stepCount++;
  onProgress?.({
    step: "final_validation",
    progress: 100,
    message: "Verification complete!",
    errors: errors
  });

  // Additional checks
  if (!fixedCode.includes('__all__ = ["root_agent"]')) {
    warnings.push("Missing __all__ export declaration");
    fixedCode += '\n\n__all__ = ["root_agent"]';
  }

  return {
    isValid: errors.length === 0,
    errors,
    fixedCode,
    warnings
  };
}

// Quick validation for specific error types
export function hasKnownErrors(code: string): boolean {
  return Object.values(ERROR_PATTERNS).some(pattern => pattern.pattern.test(code));
}

// Generate proper MCP template when code is completely wrong
function generateProperMCPTemplate(
  packageName?: string | string[],
  agentName?: string,
  agentDescription?: string,
  agentInstruction?: string
): string {
  const packages = Array.isArray(packageName)
    ? packageName
    : (packageName ? packageName.split(',').map(p => p.trim()).filter(Boolean) : ["@upstash/context7-mcp"]);
  const firstPackage = packages[0];
  const finalAgentName = agentName || (firstPackage ? firstPackage.split('/').pop()?.replace(/-/g, '_') + "_agent" : "DocQueryAgent");
  const finalDescription = agentDescription || "An LlmAgent that handles user queries and uses MCP tool to interact with external systems and APIs.";
  const finalInstruction = agentInstruction || "You are an agent that can use Smithery MCP to perform operations. Use the Smithery MCP tool to interact with external systems and APIs.";

  const toolsets = packages.map((pkg, idx) => {
    const base = pkg.split('/').pop()?.replace(/-mcp$/i, '').replace(/[^a-zA-Z0-9_]/g, '_') || `mcp_${idx}`;
    const varName = `${base}_toolset`;
    const code = `# MCP toolset configuration for ${pkg}
${varName} = MCPToolset(
    connection_params=StdioServerParameters(
        command="npx",
        args=["-y", "@smithery/cli@latest", "run", "${pkg}", "--key", smithery_api_key],
        env={"NODE_OPTIONS": "--no-warnings --experimental-fetch", "SMITHERY_API_KEY": smithery_api_key}
    )
)`;
    return { varName, code };
  });

  const toolsetDefs = toolsets.map(t => t.code).join('\n\n');
  const toolsetNames = toolsets.map(t => t.varName).join(', ');

  return `from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.genai import types  # For Content/Part
import asyncio
import os

# Set the Smithery API key from environment variable
smithery_api_key = os.getenv("SMITHERY_API_KEY")
if not smithery_api_key:
    raise ValueError("SMITHERY_API_KEY environment variable is not set")

${toolsetDefs}

# LlmAgent with MCP tools - CORRECT PARAMETER ORDER
root_agent = LlmAgent(
    name="${finalAgentName}",
    model="gemini-2.0-flash",
    description="${finalDescription}",
    instruction="${finalInstruction}",
    tools=[${toolsetNames}]
)

# Session service and runner setup - MUST INCLUDE app_name
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="${finalAgentName}")

async def main():
    # Create a session
    user_id = "user"
    session = session_service.create_session(state={}, app_name="${finalAgentName}", user_id=user_id)
    session_id = session.id

    # Create an initial message (Content object)
    new_message = types.Content(
        role="user",
        parts=[types.Part(text="Hello, agent!")]
    )

    # Run the agent
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=new_message
    ):
        print(event)

if __name__ == "__main__":
    asyncio.run(main())

__all__ = ["root_agent"]`;
}

// Generate proper __init__.py content
export function generateInitPy(): string {
  return `from .agent import root_agent

__all__ = ["root_agent"]`;
}
