"""TIME MCP Agent"""
import asyncio
import logging
import sys
from contextlib import AsyncExitStack

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# Global state
_tools = None
_exit_stack = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("timeagent")


async def get_tools_async():
    """Gets tools from the TIME MCP Server using CLI arguments for config."""
    global _tools, _exit_stack
    _exit_stack = AsyncExitStack()
    await _exit_stack.__aenter__()

    try:
        tools, _ = await MCPToolset.create_tools_from_server(
            connection_params=StdioServerParameters(
                command="uvx",
                args=[
                    "mcp-server-time",
                    "--timezone",
                    "Asia/Calcutta"
                ],
                env={
                    "NODE_OPTIONS": "--no-warnings --experimental-fetch"
                },
            ),
            async_exit_stack=_exit_stack,
        )
        _tools = tools
        return tools
    except Exception as e:
        logger.error(f"Failed to load MCP tools: {e}", exc_info=True)
        await _exit_stack.aclose()
        _exit_stack = None
        raise

# Try to initialize tools at import (eager loading)
try:
    asyncio.run(get_tools_async())
    logger.info(f"Initialized TIME MCP tools for the agent.")
except Exception as e:
    logger.warning(f"Warning: Failed to initialize TIME tools: {e}")
    logger.info("Agent will attempt to initialize tools when first used.")

# Create the root agent instance
root_agent = LlmAgent(
    model="gemini-2.0-flash",
    name="timeagent",
    description="An LlmAgent that responds to user queries about the current time using MCP integration.",
    instruction="""You are a helpful assistant that can perform time-related operations.

Available functions:
- get_current_time(timezone="IANA timezone name") - Get current time in a specific timezone
- convert_time(source_timezone="source IANA timezone", time="HH:MM", target_timezone="target IANA timezone") - Convert time between timezones

IMPORTANT RULES:
1. Always use valid IANA timezone names (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo')
2. Use 24-hour format for time (HH:MM)
3. Handle timezone conversions carefully
4. Provide clear explanations for time calculations""",
    tools=_tools or []  # Use empty list if tools not loaded yet
)

async def main():
    global _tools, _exit_stack
    try:
        if _tools is None:
            logger.info("Loading MCP tools...")
            _tools = await get_tools_async()
            root_agent.tools = _tools
            logger.info(f"Loaded MCP tools: {[tool.name for tool in _tools]}")

        # Setup session service and runner
        session_service = InMemorySessionService()
        runner = Runner(agent=root_agent, session_service=session_service)

        logger.info("Starting agent runner. Press Ctrl+C to exit.")
        await runner.run_forever()

    except asyncio.CancelledError:
        logger.info("Agent runner cancelled, shutting down.")
    except Exception as e:
        logger.error(f"Unexpected error in main: {e}", exc_info=True)
    finally:
        if _exit_stack is not None:
            await _exit_stack.aclose()
            _exit_stack = None
        logger.info("Cleanup complete.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received, exiting.")
        sys.exit(0)
