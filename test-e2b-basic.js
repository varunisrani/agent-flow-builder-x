import axios from 'axios';

// Test basic E2B functionality
async function testBasicE2B() {
  try {
    console.log('🧪 Testing Basic E2B Functionality...');
    
    // Very simple files that just test Python execution
    const testFiles = {
      'test.py': `
print("Hello from E2B sandbox!")
print("Python is working!")

# Test basic functionality
import sys
print(f"Python version: {sys.version}")

# Create a simple function
def add_numbers(a, b):
    return a + b

result = add_numbers(5, 3)
print(f"5 + 3 = {result}")
`
    };

    console.log('📤 Sending basic test to E2B...');
    
    const response = await axios.post('http://localhost:3001/api/execute', {
      files: testFiles
    }, {
      timeout: 120000, // 2 minute timeout for basic test
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Basic E2B test successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Basic E2B test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server. Is it running on port 3001?');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testBasicE2B().catch(console.error); 