// Test file for verification system
import { verifyAndFixCode } from './codeVerification';

// Test code with the latest errors you encountered
const testCodeWithErrors = `import sys
from mcp_toolset import StdioServerParameters, MCPClient, MCPTool
from llm_agent import LlmAgent

class TimeManagerAgent(LlmAgent):
    def __init__(self, mcp_client, mcp_tool):
        super().__init__()
        self.mcp_client = mcp_client
        self.mcp_tool = mcp_tool

    def handle_time_management(self, user_input):
        # Process user input and interact with MCP tool
        response = self.mcp_tool.perform_operation(user_input)
        return response

def main():
    # Initialize MCP client and tool
    mcp_client = MCPClient("node_1748935373731_mcp_client", "Smithery Client: time-mcp")
    mcp_tool = MCPTool("node_1748935373731_mcp_tool", "Smithery MCP: @yokingma/time-mcp")

    # Create the Time Manager Agent
    time_manager_agent = TimeManagerAgent(mcp_client, mcp_tool)

    # Start the agent with StdioServerParameters for MCP integration
    server_params = StdioServerParameters(agent=time_manager_agent)
    server_params.start()

if __name__ == "__main__":
    main()

__all__ = ["root_agent"]`;

// Test the verification system
export async function testVerification() {
  console.log('Testing verification system...');
  
  const result = await verifyAndFixCode(testCodeWithErrors, (progress) => {
    console.log(`Progress: ${progress.progress}% - ${progress.message}`);
  });
  
  console.log('Verification Result:', {
    isValid: result.isValid,
    errorsFound: result.errors.length,
    warnings: result.warnings.length
  });
  
  console.log('Errors fixed:');
  result.errors.forEach(error => {
    console.log(`- ${error.type}: ${error.message} (Fixed: ${error.fixed})`);
  });
  
  console.log('Fixed code:');
  console.log(result.fixedCode);
  
  return result;
}

// Test code with duplicate tools parameter error
const testCodeWithDuplicateTools = `from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset

toolset = MCPToolset(...)

# Wrong: duplicate tools parameter
root_agent = LlmAgent(
    name="test",
    model="gemini-2.0-flash",
    description="test",
    instruction="test",
    tools=tools=[toolset]  # ERROR: duplicate tools=
)`;

// Test the duplicate tools error specifically
export async function testDuplicateToolsError() {
  console.log('Testing duplicate tools parameter error...');

  const result = await verifyAndFixCode(testCodeWithDuplicateTools);

  console.log('Should fix tools=tools=[toolset] to tools=[toolset]');
  console.log('Fixed code contains duplicate tools=:', result.fixedCode.includes('tools=tools='));
  console.log('Fixed code:', result.fixedCode);

  return result;
}

// Test code with LlmAgent validation errors
const testCodeWithValidationErrors = `from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset

toolset = MCPToolset(...)

# Multiple validation errors
root_agent = LlmAgent(
    name=None,                    # ERROR: None value
    model="",                     # ERROR: empty string
    description="Test agent",
    instructions="Test",          # ERROR: should be 'instruction'
    toolset=toolset,             # ERROR: should be 'tools=[toolset]'
    session_service=session_service  # ERROR: shouldn't be passed
)

# Missing API key validation
smithery_api_key = os.getenv("SMITHERY_API_KEY")

# Wrong runner method
if __name__ == "__main__":
    runner.run_forever()`;

// Test code with complex/problematic parameter values
const testCodeWithComplexParams = `from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

# Complex/problematic parameter values
root_agent = LlmAgent(
    name="This is a very long and complex agent name that might cause validation issues",
    model="gemini-2.0-flash",
    description="This is an extremely long description that goes on and on and might cause validation issues because it's way too verbose and complex for the LlmAgent constructor to handle properly without causing validation errors",
    instruction="You are an agent",
    tools=[toolset]
)

# Inconsistent app_name
runner = Runner(agent=root_agent, session_service=session_service, app_name="runner_agent")

async def main():
    session = session_service.create_session(state={}, app_name="different_agent", user_id="user")`;

// Test LlmAgent validation errors specifically
export async function testLlmAgentValidationErrors() {
  console.log('Testing LlmAgent validation error fixes...');

  const result = await verifyAndFixCode(testCodeWithValidationErrors);

  console.log('Should fix all LlmAgent validation errors:');
  console.log('- None values replaced with defaults');
  console.log('- Empty strings replaced with defaults');
  console.log('- instructions -> instruction');
  console.log('- toolset -> tools=[toolset]');
  console.log('- session_service parameter removed');
  console.log('- API key validation added');
  console.log('- run_forever -> run_async pattern');

  console.log('Fixed code:', result.fixedCode);

  return result;
}

// Test complex parameter validation
export async function testComplexParameterValidation() {
  console.log('Testing complex parameter validation fixes...');

  const result = await verifyAndFixCode(testCodeWithComplexParams);

  console.log('Should fix complex parameter issues:');
  console.log('- Long/complex name -> simple "search_agent"');
  console.log('- Long description -> concise standard description');
  console.log('- Inconsistent app_name -> synchronized values');

  console.log('Fixed code:', result.fixedCode);

  return result;
}

// Expected fixed code should have:
// 1. Correct LlmAgent parameter order: name, model, description, instruction, tools
// 2. Runner with app_name parameter
// 3. MCP args with --key parameter
// 4. Environment variables with SMITHERY_API_KEY
// 5. Proper async pattern instead of run_forever
// 6. No duplicate tools= parameter (tools=[toolset] not tools=tools=[toolset])
// 7. No None or empty values in LlmAgent parameters
// 8. Proper parameter names (instruction not instructions, tools not toolset)
// 9. No session_service passed to LlmAgent
// 10. SMITHERY_API_KEY validation check included
