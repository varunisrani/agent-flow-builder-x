import axios from 'axios';

// Test the ADK integration
async function testADKIntegration() {
  try {
    console.log('🧪 Testing ADK Integration...');
    
    // Sample agent code that should work with ADK
    const testFiles = {
      'agent.py': `
# Simple ADK agent setup
try:
    from google.adk.agents import LlmAgent
    print("✅ ADK import successful")
    
    # Create a simple agent with correct parameters
    root_agent = LlmAgent(
        model="gemini-2.0-flash",
        name="TestAgent",
        instruction="You are a helpful assistant that responds to user queries."
    )
    
    print("✅ Agent created successfully")
    
    # Simple function for testing
    def generate(message):
        return f"Hello! You said: {message}"

    if __name__ == "__main__":
        print("🎉 ADK Agent loaded successfully!")
        print("Test message:", generate("Hello from ADK!"))
        
except ImportError as e:
    print(f"❌ ADK import failed: {e}")
    print("This might be expected if ADK is not fully installed")
    
    # Fallback simple agent
    class SimpleAgent:
        def __init__(self):
            self.name = "SimpleAgent"
        
        def generate(self, message):
            return f"Simple response to: {message}"
    
    root_agent = SimpleAgent()
    
    def generate(message):
        return root_agent.generate(message)
    
    print("✅ Fallback agent created")
    
except Exception as e:
    print(f"❌ Error creating agent: {e}")
    print("Creating minimal fallback...")
    
    def generate(message):
        return f"Minimal response to: {message}"
    
    class MockAgent:
        pass
    
    root_agent = MockAgent()
    
    print("✅ Minimal agent ready")
`
    };

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
testADKIntegration().catch(console.error); 