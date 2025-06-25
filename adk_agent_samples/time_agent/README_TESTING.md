# Testing Langfuse Integration with Time Agent

## 🚀 Quick Start

### 1. Set Up Environment Variables

Create a `.env` file in the project root (`agent-flow-builder-x/.env`) or in the time_agent directory with:

```bash
# Required: Google AI API Key
GOOGLE_API_KEY=your_google_api_key_here

# Required: Smithery API Key for MCP Time Server
SMITHERY_API_KEY=your_smithery_api_key_here

# Required: Langfuse Configuration
LANGFUSE_SECRET_KEY=sk-lf-your_secret_key_here
LANGFUSE_PUBLIC_KEY=pk-lf-your_public_key_here
LANGFUSE_HOST=https://cloud.langfuse.com
```

### 2. Get Langfuse Credentials

1. Sign up at [Langfuse Cloud](https://cloud.langfuse.com) (or use US region: https://us.cloud.langfuse.com)
2. Create a new project
3. Go to project settings
4. Copy your `Public Key` (starts with `pk-lf-`) and `Secret Key` (starts with `sk-lf-`)

### 3. Run the Test Suite

```bash
# Navigate to the time_agent directory
cd adk_agent_samples/time_agent

# Activate your virtual environment
source ../../venv/bin/activate

# Run the comprehensive test
python test_langfuse_integration.py
```

## 🧪 Test Types

### Test 1: Langfuse Connection
- Verifies credentials are set correctly
- Tests authentication with Langfuse servers
- Creates a test trace to ensure data can be sent

### Test 2: Agent Creation
- Ensures the time agent can be created with Langfuse integration
- Validates all required environment variables are present

### Test 3: Agent Interaction
- Runs a real time query through the agent
- Traces the entire interaction to Langfuse
- Demonstrates full observability pipeline

## 📊 Expected Output

```
🚀 Starting Langfuse Integration Tests
==================================================
🧪 Testing Langfuse Connection...
✅ Langfuse connection successful!
📍 Connected to: https://cloud.langfuse.com
✅ Test trace created successfully!

🤖 Testing Agent Creation...
✅ Agent created successfully with Langfuse integration!

💬 Testing Agent Interaction...
🕐 Asking agent: 'What is the current time in New York?'
📨 Event: ...
✅ Agent interaction completed!
✅ Interaction logged to Langfuse!

==================================================
📊 Test Results Summary:
Langfuse Connection: ✅ PASS
Agent Creation: ✅ PASS
Agent Interaction: ✅ PASS

🎉 All tests passed! Your Langfuse integration is working correctly!
🔍 Check your Langfuse dashboard to see the traced interactions.
```

## 🔍 Verify in Langfuse Dashboard

After running the tests:

1. Go to your Langfuse dashboard
2. You should see new traces with names like:
   - `test_trace` (from connection test)
   - `time_agent_test` (from agent interaction)
3. Click on the traces to see detailed execution information

## ❌ Troubleshooting

### Common Issues:

1. **"Langfuse credentials not found"**
   - Check your `.env` file exists and has the correct keys
   - Ensure environment variables are properly set

2. **"GOOGLE_API_KEY environment variable is not set"**
   - Get your API key from Google AI Studio
   - Add it to your `.env` file

3. **"SMITHERY_API_KEY environment variable is not set"**
   - Get your API key from Smithery
   - Add it to your `.env` file

4. **Agent interaction fails**
   - Check your internet connection
   - Verify all API keys are valid
   - Ensure MCP time server is accessible

## 🚨 Manual Testing

For manual testing, you can also run the agent directly:

```bash
python agent.py
```

This will run a single time query and you should see the Langfuse initialization message in the logs. 