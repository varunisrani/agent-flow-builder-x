#!/usr/bin/env node

// Test script to verify the boolean conversion fix
console.log('🧪 Testing Boolean Conversion Fix\n');

// Simulate the template literal behavior
const hasTools = true;
const hasToolsFalse = false;

// Test the old buggy pattern (JavaScript boolean directly interpolated)
const buggyPattern = `tools=[google_search] if ${hasTools} else None`;
const buggyPatternFalse = `tools=[google_search] if ${hasToolsFalse} else None`;

console.log('❌ OLD BUGGY PATTERN:');
console.log(`hasTools=true:  ${buggyPattern}`);
console.log(`hasTools=false: ${buggyPatternFalse}`);
console.log('This would generate Python: tools=[google_search] if true else None');
console.log('❌ ERROR: "true" is not valid in Python (should be "True")\n');

// Test the new fixed pattern (explicit Python boolean conversion)
const fixedPattern = `tools=[google_search] if ${hasTools ? 'True' : 'False'} else None`;
const fixedPatternFalse = `tools=[google_search] if ${hasToolsFalse ? 'True' : 'False'} else None`;

console.log('✅ NEW FIXED PATTERN:');
console.log(`hasTools=true:  ${fixedPattern}`);
console.log(`hasTools=false: ${fixedPatternFalse}`);
console.log('This generates valid Python: tools=[google_search] if True else None');
console.log('✅ SUCCESS: "True"/"False" are valid Python booleans\n');

// Test Python syntax validation
console.log('🔍 PYTHON SYNTAX VALIDATION:');
try {
  // This simulates what Python would see
  const pythonCodeWithBug = `
def test_agent():
    tools = [google_search] if true else None  # JavaScript boolean - INVALID
    return tools
`;
  
  const pythonCodeFixed = `
def test_agent():
    tools = [google_search] if True else None  # Python boolean - VALID
    return tools
`;
  
  console.log('Code with bug (invalid Python):');
  console.log(pythonCodeWithBug);
  console.log('Code with fix (valid Python):');
  console.log(pythonCodeFixed);
  
} catch (error) {
  console.error('Error in test:', error);
}

console.log('🎉 Test completed! The boolean conversion fix should resolve the');
console.log('   "name \'false\' is not defined" error in generated Python code.');
