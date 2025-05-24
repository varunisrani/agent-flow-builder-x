import axios from 'axios';

// Test a simple Python agent without ADK dependencies
async function testSimpleAgent() {
  try {
    console.log('🧪 Testing Simple Agent Integration...');
    
    // Simple agent code that works without complex ADK setup
    const testFiles = {
      'agent.py': `
# Simple agent without ADK dependencies for testing
class SimpleAgent:
    def __init__(self, name="SimpleAgent"):
        self.name = name
    
    def generate(self, message):
        return f"Hello from {self.name}! You said: {message}"

# Create the agent instance
root_agent = SimpleAgent("TestAgent")

# Test function
def generate(message):
    return root_agent.generate(message)

if __name__ == "__main__":
    print("Simple agent loaded successfully!")
    print(generate("Hello world"))
`
    };

    console.log('📤 Sending request to E2B sandbox...');
    
    const response = await axios.post('http://localhost:3001/api/execute', {
      files: testFiles
    }, {
      timeout: 300000, // 5 minute timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success! Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.openUrl) {
      console.log(`\n🔗 Agent API is available at: ${response.data.openUrl}`);
      console.log('You can test it by visiting the URL or making requests to:');
      console.log(`• GET  ${response.data.openUrl}/`);
      console.log(`• GET  ${response.data.openUrl}/health`);
      console.log(`• POST ${response.data.openUrl}/generate`);
    }

  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testSimpleAgent().catch(console.error); 