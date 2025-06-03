from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
import os

# Set the Smithery API key from environment variable
smithery_api_key = os.getenv("SMITHERY_API_KEY", "040afa77-557a-4a7b-9169-3f1f2b9d685f")

# MCP toolset configuration
toolset = MCPToolset(
    connection_params=StdioServerParameters(
        command="npx",
        args=["-y", "@smithery/cli@latest", "run", "@upstash/context7-mcp" , "--key", smithery_api_key],
        env={"NODE_OPTIONS": "--no-warnings --experimental-fetch", "SMITHERY_API_KEY": smithery_api_key}
    )
)

# LlmAgent with MCP tools
root_agent = LlmAgent(
    name="DocQueryAgent",
    model="gemini-2.0-flash",
    description="An LlmAgent that handles user queries about documentation and uses MCP tool to update context and retrieve information.",
    instruction="You are an agent that can use Smithery MCP to perform operations. Use the Smithery MCP tool to interact with external systems and APIs.",
    tools=[toolset]
)

session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="github_agent")

# Run the agent
if __name__ == "__main__":
    import asyncio
    asyncio.run(runner.run_forever())