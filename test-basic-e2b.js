import axios from 'axios';

// Test basic E2B functionality with simple files
async function testBasicE2BFunctionality() {
  try {
    console.log('🧪 Testing Basic E2B Functionality...');
    
    // Very simple test files
    const testFiles = {
      'agent.py': `
# Simple test agent - no heavy dependencies
class SimpleAgent:
    def __init__(self):
        self.name = "SimpleTestAgent"
        print("✅ Simple agent initialized")
    
    def generate(self, message):
        return f"Simple agent response: {message}"

# Create the agent
root_agent = SimpleAgent()

def generate(message):
    return root_agent.generate(message)

if __name__ == "__main__":
    print("🎉 Simple agent loaded successfully!")
    print("Test:", generate("Hello World"))
`
    };

    console.log('📤 Sending request to main server...');
    
    const response = await axios.post('http://localhost:3001/api/execute', {
      files: testFiles
    }, {
      timeout: 120000, // 2 minute timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.openUrl) {
      console.log(`\n🔗 Agent API available at: ${response.data.openUrl}`);
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

testBasicE2BFunctionality().catch(console.error); 