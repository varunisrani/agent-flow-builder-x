# 🔐 Secure Setup Guide: Time Agent with Mem0 Integration

This guide explains how to securely set up the Time Agent with persistent memory capabilities using Mem0.

## 🚨 Security First

**NEVER commit API keys to version control!** All API keys must be stored in environment variables or `.env` files that are excluded from git.

## 📋 Required Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Required - Google AI API Key for the main agent
GOOGLE_API_KEY=your_google_api_key_here

# Optional - For persistent memory across sessions
MEM0_API_KEY=your_mem0_api_key_here

# Optional - For enhanced memory features
OPENAI_API_KEY=your_openai_api_key_here

# Optional - For MCP time tools
SMITHERY_API_KEY=your_smithery_api_key_here
```

## 🔑 Getting API Keys

### 1. Google API Key (Required)
- Visit [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Create a new API key
- Enable the necessary AI services
- Set as `GOOGLE_API_KEY`

### 2. Mem0 API Key (Recommended)
- Sign up at [Mem0.ai](https://app.mem0.ai/)
- Navigate to [API Keys Dashboard](https://app.mem0.ai/dashboard/api-keys)
- Create a new API key
- Set as `MEM0_API_KEY`

**Benefits with Mem0 API:**
- ✅ Persistent memory across sessions
- ✅ 26% higher accuracy than OpenAI Memory
- ✅ 91% lower latency
- ✅ 90% token savings

### 3. OpenAI API Key (Optional)
- Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- Set as `OPENAI_API_KEY`
- Enables enhanced memory features when using local storage

### 4. Smithery API Key (Optional)
- Get from [Smithery.ai](https://smithery.ai/)
- Set as `SMITHERY_API_KEY`
- Enables MCP time tools

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Create .env file:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Test the setup:**
   ```bash
   python agent.py
   ```

## 🧠 Memory System Behavior

The agent uses a smart fallback strategy:

1. **🥇 Mem0 API** (if `MEM0_API_KEY` available)
   - True persistent memory across sessions
   - Cloud-based storage
   - Best performance

2. **🥈 Local Mem0 + ChromaDB** (if `OPENAI_API_KEY` available)
   - Local persistent storage
   - Requires OpenAI for embeddings
   - Good for privacy-conscious usage

3. **🥉 In-Memory Fallback**
   - Basic memory within session
   - No persistence across restarts
   - Always available

## 🔒 Security Best Practices

### ✅ DO:
- Store API keys in `.env` files
- Add `.env` to `.gitignore`
- Use environment variables in production
- Rotate API keys regularly
- Limit API key permissions

### ❌ DON'T:
- Commit API keys to git
- Share API keys in chat/email
- Use API keys in URLs or logs
- Store keys in plain text files

## 🧪 Testing Your Setup

### Basic Test:
```bash
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
print('GOOGLE_API_KEY:', '✅' if os.getenv('GOOGLE_API_KEY') else '❌')
print('MEM0_API_KEY:', '✅' if os.getenv('MEM0_API_KEY') else '❌')
"
```

### Memory Test:
```bash
python -c "
import asyncio
from memory_manager import get_memory_manager

async def test():
    mm = get_memory_manager('test_user')
    await mm.store_user_preference('test', 'working')
    prefs = await mm.get_user_preferences()
    print('Memory test:', '✅' if prefs else '❌')

asyncio.run(test())
"
```

## 🚀 Usage Examples

### Basic Time Query:
```python
# The agent will remember your name and preferences
python agent.py
# Input: "What time is it in Tokyo?"
# Output: Current time + personalized response
```

### Memory Features:
```python
from memory_manager import get_memory_manager

# Store preferences
mm = get_memory_manager('your_user_id')
await mm.store_user_preference('name', 'Your Name')
await mm.store_user_preference('timezone', 'America/New_York')

# The agent will remember these across sessions
```

## 🔧 Troubleshooting

### Memory not working?
1. Check API keys are set: `python test_api_key.py`
2. Test memory system: `python test_memory_integration.py`
3. Check logs for connection errors

### MCP tools failing?
1. Ensure Node.js is installed
2. Check `SMITHERY_API_KEY` is set
3. Agent will fallback to built-in time functions

### Agent errors?
1. Verify `GOOGLE_API_KEY` is valid
2. Check internet connection
3. Review error logs for specific issues

## 📞 Support

If you encounter issues:
1. Check this README first
2. Review error logs
3. Test individual components
4. Verify API key permissions

Remember: **Security first, functionality second!** 🔐 