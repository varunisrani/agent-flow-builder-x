import OpenAI from 'openai';
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '@/components/nodes/BaseNode';

// Use environment variable for API key with dangerouslyAllowBrowser flag
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true, // Enable browser usage (not recommended for production)
});

// Helper types
type Framework = 'adk' | 'vertex' | 'custom';

/**
 * Generates code for the given flow nodes and edges based on the selected framework
 */
export async function generateCode(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  framework: Framework
): Promise<string> {
  // If there are no nodes or edges, return a template for the selected framework
  if (nodes.length === 0 || edges.length === 0) {
    return getFrameworkTemplate(framework);
  }

  // Prepare the node data in a simplified format for the API
  const nodeData = nodes.map(node => ({
    id: node.id,
    type: node.data.type,
    label: node.data.label,
    description: node.data.description || '',
    instruction: node.data.instruction || '',
    modelType: node.data.modelType || '',
  }));

  // Create a simplified representation of edges
  const edgeData = edges.map(edge => ({
    source: edge.source,
    target: edge.target,
    label: edge.label || '',
  }));

  try {
    // Create a system message that explains what we want
    const systemMessage = `
      You are an expert Python developer who specializes in creating agent-based AI systems.
      You will be given a flow diagram represented as nodes and edges, and you need to generate
      Python code that implements this flow using the ${getFrameworkName(framework)} framework.
      
      Generate clean, well-commented code with proper error handling. Include imports, class definitions,
      and a main function that demonstrates how to use the code. The code should be complete and runnable.
      
      For context, here are the node types and their meanings:
      - agent: An autonomous agent that can use tools and models
      - tool: A capability an agent can use (e.g., web search, calculator)
      - model: An AI model (e.g., GPT-4, Claude, etc.)
      - function: A custom function that performs a specific task
      - datasource: A source of data the agent can access
      
      ${getFrameworkSpecificInstructions(framework)}
    `;

    // Make the API call
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: `Here is my agent flow diagram represented as nodes and edges. Please generate Python code for this flow using the ${getFrameworkName(framework)} framework.
            
            Nodes: ${JSON.stringify(nodeData, null, 2)}
            
            Edges: ${JSON.stringify(edgeData, null, 2)}
            
            CRITICAL WARNING: When using MCPToolset in Google ADK:
            1. NEVER use MCPToolset.from_server() as it's deprecated and will cause errors
            2. ALWAYS use MCPToolset.create_tools_from_server() with async_exit_stack parameter
            
            CORRECT SYNTAX:
            from contextlib import AsyncExitStack
            exit_stack = AsyncExitStack()
            
            tools, _ = await MCPToolset.create_tools_from_server(
                connection_params=StdioServerParameters(...),
                async_exit_stack=exit_stack
            )
            
            INCORRECT SYNTAX (DO NOT USE):
            tools, exit_stack = await MCPToolset.from_server(...)
            
            Please give me the complete Python code implementation.`,
        },
      ],
      temperature: 0.2,
    });

    // Extract and return the generated code
    const generatedCode = response.choices[0].message.content || '';
    
    // Clean up the code (remove markdown code blocks if present)
    return cleanCodeResponse(generatedCode);
  } catch (error) {
    console.error('Error generating code with OpenAI:', error);
    throw new Error('Failed to generate code. Please try again later.');
  }
}

/**
 * Helper function to get the display name of the framework
 */
function getFrameworkName(framework: Framework): string {
  switch (framework) {
    case 'adk':
      return 'Google Agent Development Kit (ADK)';
    case 'vertex':
      return 'Google Vertex AI';
    case 'custom':
      return 'Custom OpenAI Agent';
    default:
      return 'Google Agent Development Kit (ADK)';
  }
}

/**
 * Helper function to get framework-specific instructions
 */
function getFrameworkSpecificInstructions(framework: Framework): string {
  switch (framework) {
    case 'adk':
      return `
        Use the Google Agent Development Kit (ADK) to implement this flow.
        Include appropriate imports for the ADK library, tool definitions, and agent configurations.
        Use the Agent class as the main way to define agents and their properties.
        
        IMPORTANT: For MCP tools, NEVER use MCPToolset.from_server() as it's deprecated.
        ALWAYS use MCPToolset.create_tools_from_server() with async_exit_stack parameter.
        
        CORRECT SYNTAX:
        from contextlib import AsyncExitStack
        exit_stack = AsyncExitStack()
        
        tools, _ = await MCPToolset.create_tools_from_server(
            connection_params=StdioServerParameters(
                command='npx',
                args=["-y", "@modelcontextprotocol/server-filesystem", "/path/to/folder"],
            ),
            async_exit_stack=exit_stack
        )
        
        INCORRECT SYNTAX (DO NOT USE):
        tools, exit_stack = await MCPToolset.from_server(...)
      `;
    case 'vertex':
      return `
        Use Google Vertex AI to implement this flow.
        Include appropriate imports for the Vertex AI SDK, and make sure to initialize the SDK properly.
        Use the aiplatform module for all Vertex AI functionality.
      `;
    case 'custom':
      return `
        Implement a custom agent using the OpenAI API directly.
        Define a clean Agent class that can handle conversation history, tool calling, and other agent functionality.
        Use OpenAI's chat completions API with appropriate parameters for tool use.
      `;
    default:
      return '';
  }
}

/**
 * Helper function to clean up code responses from OpenAI
 */
function cleanCodeResponse(response: string): string {
  // Remove markdown code blocks if present
  const codeBlockMatch = response.match(/```(?:python)?\s*([\s\S]*?)\s*```/);
  
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }
  
  return response.trim();
}

/**
 * Helper function to get a starter template for the selected framework
 */
function getFrameworkTemplate(framework: Framework): string {
  switch (framework) {
    case 'adk':
      return `
"""GitHub MCP Agent"""
import os
import asyncio
from contextlib import AsyncExitStack
from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# Global state
_tools = None
_exit_stack = None
GITHUB_TOKEN = os.getenv('GITHUB_PERSONAL_ACCESS_TOKEN')

async def get_tools_async():
    """Gets tools from the GitHub MCP Server."""
    exit_stack = AsyncExitStack()
    tools, _ = await MCPToolset.create_tools_from_server(
        connection_params=StdioServerParameters(
            command='npx',
            args=[
                "-y",  # Argument for npx to auto-confirm install
                "@modelcontextprotocol/server-github",
            ],
            env={
                "GITHUB_PERSONAL_ACCESS_TOKEN": GITHUB_TOKEN,
                "NODE_OPTIONS": "--no-warnings --experimental-fetch",
                "SKIP_TOOLS": "create_pull_request_review"  # Explicitly skip problematic tool
            }
        ),
        async_exit_stack=exit_stack
    )
    # Filter out the problematic tool if it still exists
    return [t for t in tools if t.name != 'create_pull_request_review'], exit_stack

class GitHubAgent(LlmAgent):
    async def _run_async_impl(self, ctx):
        if not self.tools:
            global _tools, _exit_stack
            self.tools, _exit_stack = await get_tools_async()
            _tools = self.tools
        async for event in super()._run_async_impl(ctx):
            yield event

# Create the agent
root_agent = GitHubAgent(
    model="gemini-2.0-flash",
    name="github_agent",
    description="GitHub operations assistant.",
    instruction="""GitHub assistant for repository operations.
Available functions:
- search_repositories(query="search term")
- get_repository(owner="owner", repo="repo")
- list_issues(owner="owner", repo="repo")
- create_issue(owner="owner", repo="repo", title="", body="")
- get_user(username="username")
- list_pull_requests(owner="owner", repo="repo")
- get_pull_request(owner="owner", repo="repo", pull_number=123)
- merge_pull_request(owner="owner", repo="repo", pull_number=123)

Note: Pull request review functionality is not available.""",
    tools=[]  # Tools will be loaded dynamically from MCP server
)

async def main():
    """Run the agent."""
    runner = Runner(
        app_name='github_mcp_app',
        agent=root_agent,
        session_service=InMemorySessionService()
    )
    
    try:
        session = runner.session_service.create_session(
            state={}, app_name='github_mcp_app', user_id='github_user'
        )
        async for event in runner.run_async(
            session_id=session.id,
            user_id=session.user_id,
            new_message=types.Content(
                role='user',
                parts=[types.Part(text="Search for popular Python libraries")]
            )
        ):
            print(event)
    finally:
        if hasattr(root_agent, '_exit_stack'):
            await root_agent._exit_stack.aclose()

if __name__ == "__main__":
    asyncio.run(main())
`;
    case 'vertex':
      // ... other templates ...
      return `# Vertex AI template`;
    case 'custom':
      return `# Custom OpenAI Agent template`;
    default:
      return '';
  }
} 