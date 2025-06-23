#!/usr/bin/env python3
"""
Test script for MCP toolsets to verify connections and troubleshoot issues.
Run this before running the main agent to ensure MCP servers are working.
"""

import asyncio
import logging
import time
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Smithery API key
smithery_api_key = "3ebd5e80-a8e0-490e-b991-bbad4dcd6ad4"

# Timeout settings
MCP_TIMEOUT = 60.0
MCP_CONNECT_TIMEOUT = 30.0
MCP_READ_TIMEOUT = 45.0

# Common environment variables
common_env = {
    "NODE_OPTIONS": "--no-warnings --experimental-fetch --max-old-space-size=2048",
    "SMITHERY_API_KEY": smithery_api_key,
    "MCP_REQUEST_TIMEOUT": str(int(MCP_TIMEOUT * 1000)),
    "MCP_RETRY_COUNT": "3",
    "MCP_CONNECT_TIMEOUT": str(int(MCP_CONNECT_TIMEOUT * 1000)),
    "MCP_READ_TIMEOUT": str(int(MCP_READ_TIMEOUT * 1000)),
    "TIMEOUT": str(int(MCP_TIMEOUT * 1000)),
    "UV_THREADPOOL_SIZE": "16",
    "NODE_ENV": "production"
}

async def test_mcp_toolset(name, toolset, timeout=60):
    """Test a single MCP toolset."""
    logger.info(f"\n=== Testing {name} ===")
    start_time = time.time()
    
    try:
        # Try to get tools with timeout
        tools = await asyncio.wait_for(
            toolset.get_tools(None), 
            timeout=timeout
        )
        
        elapsed = time.time() - start_time
        logger.info(f"✅ {name} connected successfully in {elapsed:.2f}s")
        logger.info(f"   Available tools: {len(tools)}")
        
        # List available tools
        for i, tool in enumerate(tools[:3], 1):  # Show first 3 tools
            logger.info(f"   {i}. {tool.name if hasattr(tool, 'name') else 'Unknown tool'}")
        
        if len(tools) > 3:
            logger.info(f"   ... and {len(tools) - 3} more tools")
            
        return True, elapsed, len(tools)
        
    except asyncio.TimeoutError:
        elapsed = time.time() - start_time
        logger.error(f"❌ {name} timed out after {elapsed:.2f}s")
        return False, elapsed, 0
        
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ {name} failed after {elapsed:.2f}s: {str(e)}")
        return False, elapsed, 0

async def test_smithery_connection():
    """Test basic Smithery connection."""
    logger.info("\n=== Testing Smithery CLI Availability ===")
    
    import subprocess
    try:
        result = subprocess.run(
            ["npx", "--version"], 
            capture_output=True, 
            text=True, 
            timeout=10
        )
        if result.returncode == 0:
            logger.info(f"✅ npx available: {result.stdout.strip()}")
        else:
            logger.error(f"❌ npx failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"❌ npx not available: {str(e)}")
        return False
    
    # Test Smithery CLI
    try:
        result = subprocess.run(
            ["npx", "-y", "@smithery/cli@latest", "--version"], 
            capture_output=True, 
            text=True, 
            timeout=30
        )
        if result.returncode == 0:
            logger.info("✅ Smithery CLI available")
        else:
            logger.error(f"❌ Smithery CLI failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"❌ Smithery CLI not available: {str(e)}")
        return False
    
    return True

async def main():
    """Main test function."""
    logger.info("🧪 Starting MCP Toolset Tests")
    
    # Test basic prerequisites
    if not await test_smithery_connection():
        logger.error("❌ Basic prerequisites not met. Exiting.")
        return
    
    # Define toolsets to test
    toolsets = {
        "Time MCP": MCPToolset(
            connection_params=StdioServerParameters(
                command="npx",
                args=["-y", "@smithery/cli@latest", "run", "@yokingma/time-mcp", "--key", smithery_api_key],
                env=common_env,
                timeout=MCP_TIMEOUT,
                connect_timeout=MCP_CONNECT_TIMEOUT,
                read_timeout=MCP_READ_TIMEOUT
            ),
            name="time_toolset_test",
            description="Time operations test"
        ),
        
        "Wikipedia MCP": MCPToolset(
            connection_params=StdioServerParameters(
                command="npx",
                args=["-y", "@smithery/cli@latest", "run", "@Rudra-ravi/wikipedia-mcp", "--key", smithery_api_key],
                env=common_env,
                timeout=MCP_TIMEOUT,
                connect_timeout=MCP_CONNECT_TIMEOUT,
                read_timeout=MCP_READ_TIMEOUT
            ),
            name="wikipedia_toolset_test",
            description="Wikipedia search test"
        )
    }
    
    # Test each toolset
    results = {}
    for name, toolset in toolsets.items():
        success, elapsed, tool_count = await test_mcp_toolset(name, toolset, timeout=90)
        results[name] = {
            'success': success,
            'elapsed': elapsed,
            'tool_count': tool_count
        }
        
        # Wait a bit between tests to avoid overwhelming the system
        await asyncio.sleep(2)
    
    # Summary
    logger.info("\n" + "="*50)
    logger.info("📊 TEST SUMMARY")
    logger.info("="*50)
    
    successful = 0
    total = len(results)
    
    for name, result in results.items():
        status = "✅ PASS" if result['success'] else "❌ FAIL"
        logger.info(f"{name:15} | {status} | {result['elapsed']:6.2f}s | {result['tool_count']:2d} tools")
        if result['success']:
            successful += 1
    
    logger.info("="*50)
    logger.info(f"Overall: {successful}/{total} toolsets working")
    
    if successful == total:
        logger.info("🎉 All tests passed! Your MCP setup is working correctly.")
        logger.info("You can now run the main agent with confidence.")
    elif successful > 0:
        logger.info("⚠️  Some tests passed. You can try running the agent with working toolsets.")
    else:
        logger.info("💥 All tests failed. Please check your network connection and Smithery API key.")
    
    return successful == total

if __name__ == "__main__":
    # Set event loop policy for Windows if needed
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    try:
        success = asyncio.run(main())
        exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\n🛑 Test interrupted by user")
        exit(1)
    except Exception as e:
        logger.error(f"\n💥 Test suite failed: {str(e)}")
        exit(1) 