import 'dotenv/config'
import { Sandbox } from '@e2b/code-interpreter'

async function main() {
  console.log('🚀 Starting E2B Sandbox demo...\n')

  // Create a sandbox (5-minute default TTL)
  const sbx = await Sandbox.create({ apiKey: process.env.E2B_API_KEY })
  console.log('✅ Sandbox created successfully\n')

  // Run a Python calculation
  const pythonCode = `
# Basic arithmetic
result = 2 + 2
print(f"Basic addition: 2 + 2 = {result}")

# Let's also show some more math operations
print(f"Multiplication: 2 * 2 = {2 * 2}")
print(f"Division: 2 / 2 = {2 / 2}")
print(f"Power: 2 ** 2 = {2 ** 2}")

# Using Python's math module
import math
print(f"Square root of 4 = {math.sqrt(4)}")
`
  
  console.log('📝 Running Python calculations:')
  console.log(pythonCode)
  
  const execution = await sbx.runCode(pythonCode)
  
  // Format and display execution results
  console.log('\n📊 Calculation Results:')
  console.log('--------------------')
  if (execution.logs.stdout.length > 0) {
    console.log('📤 Output:')
    execution.logs.stdout.forEach(line => console.log('   ' + line.trim()))
  }
  if (execution.logs.stderr.length > 0) {
    console.log('❌ Errors:', execution.logs.stderr.join('\n'))
  }
  console.log('--------------------')

  // List and categorize files in the sandbox root directory
  console.log('📁 Sandbox File System Structure:')
  console.log('------------------------------')
  const files = await sbx.files.list('/')
  
  // Categorize files by type
  const directories = files.filter(f => f.type === 'dir')
  const regularFiles = files.filter(f => f.type === 'file')

  // Display system directories
  console.log('\n📂 System Directories:')
  directories
    .filter(d => ['/etc', '/usr', '/var', '/home', '/root'].includes(d.path))
    .forEach(d => console.log(`   ${d.path}/`))

  // Display code & data directories
  console.log('\n📂 Code & Data Directories:')
  directories
    .filter(d => ['/code', '/tmp'].includes(d.path))
    .forEach(d => console.log(`   ${d.path}/`))

  // Display important files
  console.log('\n📄 Important Files:')
  regularFiles
    .filter(f => [
      'requirements.txt',
      'r-4.4.2_1_amd64.deb',
      'ijava-1.3.0.zip'
    ].includes(f.name))
    .forEach(f => console.log(`   ${f.path}`))
  
  console.log('\n💡 Available Features:')
  console.log('   - Python, R, and Java environments pre-installed')
  console.log('   - Package installation via pip, apt, etc.')
  console.log('   - File operations in /code directory')
  console.log('   - System resource access in isolated environment')

  // Always kill the sandbox when done
  await sbx.kill()
  console.log('\n🧹 Sandbox cleaned up and terminated')
}

// Add proper error handling with formatted output
main().catch(err => {
  console.error('\n❌ Error during sandbox demo:')
  console.error('---------------------------')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}) 