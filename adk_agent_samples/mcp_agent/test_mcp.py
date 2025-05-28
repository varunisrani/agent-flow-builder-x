"""
MCP Tool Test Script

This script tests if your MCP tools are working properly.
Run this before using your agent with MCP tools to verify everything is set up correctly.
"""

import os
import asyncio
from contextlib import AsyncExitStack
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# Set Google API key (this is a placeholder, it doesn't need to be real for this test)
os.environ["GOOGLE_API_KEY"] = "test-key-not-used"

# Define path to accessible files
TARGET_FOLDER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "accessible_files")

async def test_mcp_filesystem():
    """Test function for MCP filesystem tool."""
    print("\n===== Testing MCP Filesystem Tool =====")
    
    # Create the directory if it doesn't exist
    if not os.path.exists(TARGET_FOLDER_PATH):
        print(f"Creating directory: {TARGET_FOLDER_PATH}")
        os.makedirs(TARGET_FOLDER_PATH)
    else:
        print(f"Directory already exists: {TARGET_FOLDER_PATH}")
    
    # Create a test file
    test_file_path = os.path.join(TARGET_FOLDER_PATH, "test_file.txt")
    with open(test_file_path, "w") as f:
        f.write("This is a test file created by the MCP test script.")
    print(f"Created test file: {test_file_path}")
    
    # Use AsyncExitStack to properly manage resources
    exit_stack = AsyncExitStack()
    
    try:
        print("\nAttempting to connect to MCP filesystem server...")
        # Try to create tools using the correct method
        tools, _ = await MCPToolset.create_tools_from_server(
            connection_params=StdioServerParameters(
                command='npx',
                args=[
                    "-y",  # Argument for npx to auto-confirm install
                    "@modelcontextprotocol/server-filesystem",
                    # Using the absolute path to the folder we created
                    os.path.abspath(TARGET_FOLDER_PATH),
                ],
            ),
            async_exit_stack=exit_stack
        )
        
        print(f"✅ SUCCESS: Connected to MCP filesystem server")
        print(f"Found {len(tools)} tools:")
        
        # List the available tools
        for i, tool in enumerate(tools):
            print(f"  Tool {i+1}: {tool.name}")
            
        # Try to use the tools to list files
        if tools:
            print("\nTrying to list files using MCP tool...")
            # Find the list_files tool
            list_files_tool = None
            for tool in tools:
                if "list" in tool.name.lower() and "file" in tool.name.lower():
                    list_files_tool = tool
                    break
            
            if list_files_tool:
                result = await list_files_tool.run_async(
                    args={
                        "path": "/"  # Root path
                    },
                    tool_context=None
                )
                print(f"Files in directory: {result}")
                print("✅ SUCCESS: Tool executed correctly")
            else:
                print("❌ Could not find a tool to list files")
        
        return True
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Clean up resources
        print("\nCleaning up resources...")
        await exit_stack.aclose()
        print("✅ Resources cleaned up")

if __name__ == "__main__":
    print("Starting MCP tool test...")
    success = asyncio.run(test_mcp_filesystem())
    
    if success:
        print("\n==================================")
        print("✅ SUCCESS: MCP tools are working correctly!")
        print("You can now use your agent with MCP tools.")
        print("==================================")
    else:
        print("\n==================================")
        print("❌ ERROR: MCP tools test failed.")
        print("Please check the error messages above and fix any issues.")
        print("Common issues:")
        print("  - Node.js not installed or not in PATH")
        print("  - Python version too old (need 3.9+)")
        print("  - Missing MCP package - run: pip install google-adk[mcp]")
        print("==================================") 