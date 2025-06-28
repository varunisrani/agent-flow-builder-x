// Define types for Next.js API request and response
interface NextApiRequest {
  method: string;
  query: Record<string, string | string[]>;
  body: any;
}

interface NextApiResponse {
  status(code: number): NextApiResponse;
  json(data: any): void;
}

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import os from 'os';
import util from 'util';

const execAsync = util.promisify(exec);
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const exists = (path: string) => fs.promises.access(path).then(() => true).catch(() => false);

// Use a directory in the user's home folder for agents
const HOME_DIR = os.homedir();
const AGENTS_BASE_DIR = path.join(HOME_DIR, '.agent-flow-builder', 'agents');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentName, code, dirPath, agentPyContent, initPyContent } = req.body;

    // Validate parameters
    if ((!agentName && !dirPath) || (!code && !agentPyContent)) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Determine final directory path - use provided dirPath or build from agentName
    const finalDirPath = dirPath || path.join(AGENTS_BASE_DIR, agentName);
    console.log(`Using directory path: ${finalDirPath}`);
    
    // Create base directory if it doesn't exist
    const baseDir = path.dirname(finalDirPath);
    if (!await exists(baseDir)) {
      await mkdir(baseDir, { recursive: true });
      console.log(`Created base directory: ${baseDir}`);
    }
    
    // Create agent directory if it doesn't exist
    if (!await exists(finalDirPath)) {
      await mkdir(finalDirPath, { recursive: true });
      console.log(`Created agent directory: ${finalDirPath}`);
    }
    
    // Create agent files
    const agentFilePath = path.join(finalDirPath, 'agent.py');
    const initFilePath = path.join(finalDirPath, '__init__.py');
    
    // Write agent.py file
    await writeFile(agentFilePath, agentPyContent || code);
    console.log(`Created agent file: ${agentFilePath}`);
    
    // Write a simple __init__.py that imports the agent
    await writeFile(initFilePath, initPyContent || 'from .agent import root_agent');
    console.log(`Created init file: ${initFilePath}`);
    
    // Create .env file with necessary API keys
    const envFilePath = path.join(finalDirPath, '.env');
    
    // Generate .env content based on agent code features
    let envContent = `# Agent Environment Variables
# Copy this file to .env and replace placeholder values with your actual API keys

# Required: Google API Key for Gemini models
GOOGLE_API_KEY=your_google_api_key_here

`;

    // Check if code contains specific features and add relevant env vars
    const agentCodeContent = agentPyContent || code;
    
    if (agentCodeContent.includes('SMITHERY_API_KEY') || agentCodeContent.includes('MCPToolset')) {
      envContent += `# MCP (Model Context Protocol) via Smithery
SMITHERY_API_KEY=your_smithery_api_key_here

`;
    }
    
    if (agentCodeContent.includes('langfuse') || agentCodeContent.includes('Langfuse')) {
      envContent += `# Langfuse Analytics (optional)
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key_here
LANGFUSE_SECRET_KEY=your_langfuse_secret_key_here
LANGFUSE_HOST=https://cloud.langfuse.com

`;
    }
    
    if (agentCodeContent.includes('MEM0_API_KEY') || agentCodeContent.includes('mem0')) {
      envContent += `# Mem0 Memory Service (optional)
MEM0_API_KEY=your_mem0_api_key_here
MEM0_HOST=https://api.mem0.ai

`;
    }
    
    if (agentCodeContent.includes('GITHUB_PERSONAL_ACCESS_TOKEN')) {
      envContent += `# GitHub Integration (optional)
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here

`;
    }
    
    envContent += `# Additional Notes:
# - Replace 'your_*_key_here' with your actual API keys
# - Keep this file secure and never commit it to version control
# - Add .env to your .gitignore file
`;
    
    await writeFile(envFilePath, envContent);
    console.log(`Created .env file: ${envFilePath}`);
    
    // Check if virtual environment exists
    const venvDir = path.join(finalDirPath, 'venv');
    const venvExists = await exists(venvDir);
    
    if (!venvExists) {
      try {
        // Create virtual environment - try python3 first (for macOS), then fall back to python
        console.log(`Creating virtual environment in ${venvDir}`);
        try {
          // On macOS, use python3 command
          await execAsync(`python3 -m venv ${venvDir}`);
        } catch (pythonError) {
          console.log('python3 command failed, trying python command...');
          await execAsync(`python -m venv ${venvDir}`);
        }
        
        // Determine pip path based on OS
        const pipPath = process.platform === 'win32' 
          ? path.join(venvDir, 'Scripts', 'pip')
          : path.join(venvDir, 'bin', 'pip');

        // Ensure pip is up-to-date
        console.log('Upgrading pip...');
        try {
          await execAsync(`"${pipPath}" install --upgrade pip`);
        } catch (pipError) {
          console.warn('Error upgrading pip, continuing anyway:', pipError);
        }
        
        // Install Google ADK package - use the correct package name
        console.log('Installing Google ADK package...');
        try {
          // The correct package name is 'google-generativeai-adk' not 'google-adk'
          // Add verbose output to see any errors
          const { stdout, stderr } = await execAsync(`"${pipPath}" install google-generativeai-adk --verbose`);
          console.log('Google ADK package installation output:', stdout);
          if (stderr) console.log('Google ADK package installation stderr:', stderr);
          console.log('Google ADK package installed successfully');
          
          // Verify installation
          const { stdout: pipList } = await execAsync(`"${pipPath}" list`);
          console.log('Installed packages:', pipList);
        } catch (adkError) {
          console.error('Error installing Google ADK:', adkError);
          // Continue without failing - we'll try other approaches in the run-agent API
        }
        
        console.log('Virtual environment setup completed');
      } catch (error) {
        console.error('Error setting up virtual environment:', error);
        // Continue without failing the request, as we can still create the files
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Agent files created successfully in ${finalDirPath}`,
      paths: {
        agentFile: agentFilePath,
        initFile: initFilePath,
        envFile: path.join(finalDirPath, '.env'),
        venv: venvExists ? venvDir : null
      }
    });
  } catch (error) {
    console.error('Error creating agent files:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error creating agent files',
      success: false 
    });
  }
} 