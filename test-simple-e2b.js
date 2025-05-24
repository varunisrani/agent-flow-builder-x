import axios from 'axios';

async function testSimpleE2B() {
  try {
    console.log('🧪 Testing Simple E2B Server...');
    
    const testFiles = {
      'test.py': `
print("Hello from E2B!")
print("Testing basic Python execution")
print("2 + 2 =", 2 + 2)
`
    };

    console.log('📤 Sending request to simple server...');
    
    const response = await axios.post('http://localhost:3002/api/test', {
      files: testFiles
    }, {
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

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

testSimpleE2B().catch(console.error); 