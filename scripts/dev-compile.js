
// Simple script to compile TypeScript using the dev configuration
const { execSync } = require('child_process');

try {
  console.log('Compiling TypeScript with development configuration...');
  execSync('tsc --project tsconfig.dev.json', { stdio: 'inherit' });
  console.log('TypeScript compilation complete!');
} catch (error) {
  console.error('Error compiling TypeScript:', error);
  process.exit(1);
}
