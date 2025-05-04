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

import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import util from 'util';
import os from 'os';

const execAsync = util.promisify(exec);
const exists = (p: string) => fs.promises.access(p).then(() => true).catch(() => false);

// Define the base directory for agents
const HOME_DIR = os.homedir();
const AGENTS_BASE_DIR = path.join(HOME_DIR, '.agent-flow-builder', 'agents');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentPath, agentName } = req.body;

    if (!agentPath && !agentName) {
      return res.status(400).json({ error: 'Missing required parameter: agentPath or agentName' });
    }

    // Determine the agent path from the name if only name is provided
    const finalAgentPath = agentPath || path.join(AGENTS_BASE_DIR, agentName);
    console.log(`Using agent path: ${finalAgentPath}`);

    // Validate that the path exists
    if (!await exists(finalAgentPath)) {
      return res.status(404).json({ error: `Agent directory not found: ${finalAgentPath}` });
    }

    // Determine virtual environment path
    const venvDir = path.join(finalAgentPath, 'venv');
    if (!await exists(venvDir)) {
      return res.status(400).json({ error: 'Virtual environment not found. Please create the agent first.' });
    }

    // Get the correct pip and Python paths based on OS
    const isWindows = process.platform === 'win32';
    const pythonPath = isWindows 
      ? path.join(venvDir, 'Scripts', 'python.exe')
      : path.join(venvDir, 'bin', 'python');
    const pipPath = isWindows
      ? path.join(venvDir, 'Scripts', 'pip.exe')
      : path.join(venvDir, 'bin', 'pip');

    // Verify that Python exists in the virtual environment
    if (!await exists(pythonPath)) {
      return res.status(400).json({ error: 'Python interpreter not found in virtual environment.' });
    }

    // Check if ADK package is installed, and if not, install it
    try {
      console.log('Checking for ADK installation...');
      const { stdout: pipList } = await execAsync(`"${pipPath}" list`);
      
      // If ADK not in pip list, install it
      if (!pipList.includes('google-generativeai-adk')) {
        console.log('ADK not found in installed packages, installing...');
        await execAsync(`"${pipPath}" install google-generativeai-adk`);
        console.log('Successfully installed google-generativeai-adk');
      } else {
        console.log('ADK already installed');
      }
    } catch (error) {
      console.error('Error checking/installing ADK:', error);
      // Continue and we'll try to run anyway
    }

    // Try multiple approaches to find the ADK command
    const possibleAdkPaths = [
      // Standard paths
      isWindows ? path.join(venvDir, 'Scripts', 'adk.exe') : path.join(venvDir, 'bin', 'adk'),
      isWindows ? path.join(venvDir, 'Scripts', 'adk') : path.join(venvDir, 'bin', 'adk3'),
      
      // Additional possibilities for different versions
      path.join(venvDir, 'bin', 'google-adk'),
      path.join(venvDir, 'bin', 'generativeai-adk'),
    ];

    // Check for ADK entry points through pip show
    try {
      const { stdout: pipShow } = await execAsync(`"${pipPath}" show google-generativeai-adk`);
      console.log('ADK package info:', pipShow);
      
      // Parse entry points if available
      if (pipShow.includes('Entry-points')) {
        const entryPointsSection = pipShow.split('Entry-points:')[1];
        console.log('Entry points:', entryPointsSection);
      }
    } catch (error) {
      console.warn('Failed to get ADK package info:', error);
    }

    // Check if module can be imported directly
    try {
      const { stdout: moduleTest } = await execAsync(`"${pythonPath}" -c "import google.generativeai.adk; print('ADK module found')"`);
      console.log('Module import test result:', moduleTest);
    } catch (moduleError) {
      console.warn('ADK module import test failed:', moduleError);
    }

    // Try different command approaches
    let adkCommand: string | null = null;
    
    // Check if any of the possible ADK executables exist
    for (const adkPath of possibleAdkPaths) {
      if (await exists(adkPath)) {
        console.log(`Found ADK at: ${adkPath}`);
        adkCommand = adkPath;
        break;
      }
    }
    
    // If we didn't find a direct executable, use python -m approach
    if (!adkCommand) {
      console.log('No ADK executable found, trying module approach');
      try {
        // Try to run as a module
        await execAsync(`"${pythonPath}" -m google.generativeai.adk --help`);
        adkCommand = 'module';
        console.log('Successfully accessed ADK as a module');
      } catch (moduleError) {
        console.warn('Failed to access ADK as a module:', moduleError);
        return res.status(400).json({ 
          error: 'ADK command not found in virtual environment. Make sure it was installed correctly.' 
        });
      }
    }

    // Run the agent using the appropriate command
    console.log(`Running agent from: ${finalAgentPath}`);
    
    // Construct the command based on what we found
    let runCommand: string;
    let args: string[];
    
    if (adkCommand === 'module') {
      runCommand = pythonPath;
      args = ['-m', 'google.generativeai.adk', 'web', '--dir', finalAgentPath];
    } else {
      runCommand = adkCommand;
      args = ['web', '--dir', finalAgentPath];
    }
    
    console.log(`Running command: ${runCommand} ${args.join(' ')}`);
    
    // Run the agent in a detached process so it continues after the API response
    const adkProcess = spawn(runCommand, args, {
      detached: true,
      stdio: 'ignore',
      cwd: finalAgentPath
    });
    adkProcess.unref();
    
    // Return success
    return res.status(200).json({
      success: true,
      message: 'Agent started successfully. It may take a moment to become available.',
      urls: {
        agentUrl: 'http://localhost:8080', // This is the default ADK web URL
        adkConsoleUrl: 'http://localhost:8080/console'
      }
    });
  } catch (error) {
    console.error('Error running agent:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error running agent',
      success: false
    });
  }
} 