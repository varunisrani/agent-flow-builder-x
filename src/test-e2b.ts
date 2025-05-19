import { E2BService } from './lib/e2b.js';

async function testE2b() {
  const service = new E2BService();
  
  try {
    console.log('Initializing E2B service...');
    await service.initialize();
    console.log('E2B service initialized successfully');
    
    const pythonCode = `
import sys
print("Python version:", sys.version)
print("Hello from Python!")

# Do some simple math
x = 10
y = 20
result = x + y
print(f"Math result: {x} + {y} = {result}")
`;
    
    console.log('\nExecuting Python code:\n', pythonCode);
    const result = await service.execute(pythonCode);
    
    if (result.error) {
      console.error('Execution error:', result.error);
    } else {
      console.log('\nExecution output:', result.output);
    }
  } catch (error) {
    console.error('Service error:', error);
  } finally {
    console.log('\nCleaning up...');
    await service.cleanup();
    console.log('Cleanup complete');
  }
}

console.log('Starting E2B test...\n');
testE2b();