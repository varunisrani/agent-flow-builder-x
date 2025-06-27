from google.adk.agents import LlmAgent
from google.adk.runners import Runner

# Load environment variables
load_dotenv()
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.genai import types  # For Content/Part
import asyncio
import os
from dotenv import load_dotenv

# Set the Smithery API key from environment variable
smithery_api_key = os.getenv("SMITHERY_API_KEY")
if not smithery_api_key:
    raise ValueError("SMITHERY_API_KEY environment variable is not set")

# MCP toolset configuration for @upstash/context7-mcp
context7_toolset = MCPToolset(
    connection_params=StdioServerParameters(
        command="npx",
        args=["-y", "@smithery/cli@latest", "run", "@upstash/context7-mcp", "--key", smithery_api_key],
        env={"NODE_OPTIONS": "--no-warnings --experimental-fetch", "SMITHERY_API_KEY": smithery_api_key}
    )
)

# LlmAgent with MCP tools - CORRECT PARAMETER ORDER
root_agent = LlmAgent(
    name="search_agent",
    model="gemini-2.0-flash",
    description="An LlmAgent that handles time-related queries using Google ADK's LlmAgent class.",
    instruction="You are an agent that can use Smithery MCP to perform operations. Use the Smithery MCP tool to interact with external systems and APIs.",
    tools=[context7_toolset]
)

# Session service and runner setup - MUST INCLUDE app_name
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="Time Agent")

async def main():
    # Create a session
    user_id = "user"
    session = await session_service.create_session(app_name="Time Agent", user_id=user_id)
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

__all__ = ["root_agent"]