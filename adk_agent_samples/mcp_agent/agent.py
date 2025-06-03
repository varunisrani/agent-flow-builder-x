from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.genai import types  # For Content/Part
import asyncio

# MCP toolset configuration
toolset = MCPToolset(
    connection_params=StdioServerParameters(
        command="npx",
        args=["-y", "@smithery/cli@latest", "run", "@upstash/context7-mcp", "--key", "040afa77-557a-4a7b-9169-3f1f2b9d685f"],
        env={"NODE_OPTIONS": "--no-warnings --experimental-fetch", "SMITHERY_API_KEY": "040afa77-557a-4a7b-9169-3f1f2b9d685f"}
    )
)

# LlmAgent with MCP tools - CORRECT PARAMETER ORDER
root_agent = LlmAgent(
    name="DocQueryAgent",
    model="gemini-2.0-flash",
    description="An LlmAgent that handles user queries about documentation and uses MCP tool to update context and retrieve information.",
    instruction="You are an agent that can use Smithery MCP to perform operations. Use the Smithery MCP tool to interact with external systems and APIs.",
    tools=[toolset]
)

# Session service and runner setup - MUST INCLUDE app_name
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="DocQueryAgent")

async def main():
    # Create a session
    user_id = "user"
    session = session_service.create_session(state={}, app_name="DocQueryAgent", user_id=user_id)
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