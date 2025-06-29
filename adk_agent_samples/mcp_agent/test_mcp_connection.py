#!/usr/bin/env python3
"""
Simple test script to verify MCP connection to @dandeliongold/mcp-time
"""
import asyncio
import subprocess
import json
import sys

async def test_mcp_server():
    """Test direct connection to the MCP time server"""
    print("Testing direct MCP connection to @dandeliongold/mcp-time...")
    
    # Start the MCP server process
    try:
        process = subprocess.Popen(
            ["npx", "-y", "@dandeliongold/mcp-time"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Send an initialize request
        init_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "test-client",
                    "version": "1.0.0"
                }
            }
        }
        
        print(f"Sending initialize request: {json.dumps(init_request)}")
        process.stdin.write(json.dumps(init_request) + "\n")
        process.stdin.flush()
        
        # Wait for response with timeout
        try:
            stdout, stderr = process.communicate(timeout=10)
            print(f"MCP Server stdout: {stdout}")
            if stderr:
                print(f"MCP Server stderr: {stderr}")
            print(f"Process return code: {process.returncode}")
            
        except subprocess.TimeoutExpired:
            print("MCP server test timed out after 10 seconds")
            process.kill()
            stdout, stderr = process.communicate()
            print(f"MCP Server stdout after kill: {stdout}")
            if stderr:
                print(f"MCP Server stderr after kill: {stderr}")
                
    except Exception as e:
        print(f"Error testing MCP server: {e}")
        return False
    
    return True

if __name__ == "__main__":
    asyncio.run(test_mcp_server()) 