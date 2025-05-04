# Agent Flow Builder API Server

This is the backend server for the Agent Flow Builder application. It provides APIs for generating agent code using OpenAI, creating agent files, and running agents.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set up your OpenAI API key:
   
   Create a `.env` file in the `server` directory with the following content:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

   You can get an API key from [OpenAI](https://platform.openai.com/account/api-keys).

3. Start the server:
   ```
   npm start
   ```

   For development with auto-restart:
   ```
   npm run dev
   ```

## API Endpoints

### Generate Code
- **URL:** `/api/agents/generate-code`
- **Method:** POST
- **Description:** Generates Google ADK code from a flow diagram using OpenAI
- **Request Body:**
  ```json
  {
    "nodes": [...],  // Array of node objects
    "edges": [...],  // Array of edge objects
    "mcpEnabled": true  // Boolean flag for MCP support
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "code": "# Generated Python code..."
  }
  ```

### Create Agent
- **URL:** `/api/agents/create`
- **Method:** POST
- **Description:** Creates agent files from generated code
- **Request Body:**
  ```json
  {
    "agentName": "my_agent",
    "code": "# Python code content..."
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "paths": {
      "agentFile": "/path/to/agent.py",
      "initFile": "/path/to/__init__.py"
    }
  }
  ```

### Run Agent
- **URL:** `/api/agents/run`
- **Method:** POST
- **Description:** Runs an agent using Google ADK
- **Request Body:**
  ```json
  {
    "agentName": "my_agent"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "urls": {
      "agentUrl": "http://localhost:8080"
    }
  }
  ```

## Requirements

- Node.js 14+
- Python 3.8+ (for running agents)
- Google ADK installed (`pip install google-generativeai-adk`)
- OpenAI API key

## Environment Variables

- `PORT`: Port for the server (default: 3001)
- `OPENAI_API_KEY`: Your OpenAI API key 