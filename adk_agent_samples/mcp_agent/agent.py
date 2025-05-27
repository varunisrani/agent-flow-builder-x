import os # Required for path operations
import asyncio
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from contextlib import AsyncExitStack

# Set Google API key
os.environ["GOOGLE_API_KEY"] = "AIzaSyDKYSA-rs_GE5mCqA9b1yw8NFWH9fSn-Vc"

# Define the path to the folder that will be accessible by the MCP server
# Using an absolute path based on the current file's location
TARGET_FOLDER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "accessible_files")

# This is the async function that ADK will call to get the agent
async def get_agent_async():
    """Create an ADK agent with MCP tools for file system operations."""
    # Use AsyncExitStack to properly manage resources
    exit_stack = AsyncExitStack()
    
    try:
        # Create and fetch MCP tools
        tools = await MCPToolset.from_server(
            connection_params=StdioServerParameters(
                command='npx',
                args=[
                    "-y",  # Argument for npx to auto-confirm install
                    "@modelcontextprotocol/server-filesystem",
                    # Using the absolute path to the folder we created
                    os.path.abspath(TARGET_FOLDER_PATH),
                ],
            )
        )
        
        # Create the agent with the retrieved tools
        agent = LlmAgent(
            model='gemini-2.0-flash',
            name='filesystem_assistant_agent',
            instruction='Help the user manage their files. You can list files, read files, etc.',
            tools=tools,
        )
        
        return agent, exit_stack
    except Exception as e:
        # Clean up resources if there's an error
        await exit_stack.aclose()
        raise e

# ADK web server expects a root_agent attribute to be present
# We create a placeholder LLM agent for it to find
root_agent = LlmAgent(
    model='gemini-2.0-flash',
    name='filesystem_assistant_agent',
    instruction='Help the user manage their files. You can list files, read files, etc.',
    tools=[],  # Empty list of tools initially - the get_agent_async() function will provide the real tools
)

# For use in standalone scripts (not needed for ADK web, which calls get_agent_async directly)
# root_agent = asyncio.run(get_agent_async())[0] 