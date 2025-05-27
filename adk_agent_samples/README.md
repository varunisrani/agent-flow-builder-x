# ADK Agent Samples

This directory contains sample agents built with Google's Agent Development Kit (ADK).

## MCP Agent

The `mcp_agent` directory contains an example of an agent that uses the Model Context Protocol (MCP) to interact with the file system.

### Setup

1. Make sure you have Python 3.9+ installed
2. Create and activate a virtual environment:
   ```
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install the Google ADK:
   ```
   pip install google-adk
   ```
4. Set your Google API key (already configured in the code):
   ```
   # The API key is already set in agent.py:
   # os.environ["GOOGLE_API_KEY"] = "AIzaSyDKYSA-rs_GE5mCqA9b1yw8NFWH9fSn-Vc"
   ```

### Running the Agent

To run the agent, use the ADK web interface:

```
cd /path/to/agent-flow-builder-x
source venv/bin/activate
cd adk_agent_samples
adk web
```

Then navigate to http://localhost:8000 in your web browser to interact with the agent.

### Project Structure

- `mcp_agent/agent.py` - Contains the agent definition
- `mcp_agent/__init__.py` - Makes the agent module importable
- `mcp_agent/accessible_files/` - Directory accessible by the MCP server

## Time Agent

The `time_agent` directory contains an example of an agent that uses the Model Context Protocol (MCP) to provide time-related functionality.

### Additional Setup for Time Agent

1. Install the mcp-server-time package:
   ```
   pip install mcp-server-time
   ```

### Time Agent Features

The time agent can:
- Get the current time in different timezones
- Convert time between timezones
- Calculate time differences
- Provide relative time information
- Get days in a month

### Project Structure

- `time_agent/agent.py` - Contains the time agent definition
- `time_agent/__init__.py` - Makes the time agent module importable 