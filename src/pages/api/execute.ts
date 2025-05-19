import { Sandbox } from '@e2b/code-interpreter';
import type { NextApiRequest, NextApiResponse } from 'next';

interface SandboxResponse {
  output: string;
  error: string | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SandboxResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;
    
    // Create sandbox instance
    const sbx = await Sandbox.create({ 
      apiKey: process.env.E2B_API_KEY 
    });

    // Execute the code
    const execution = await sbx.runCode(code);
    
    // Format the response
    const response: SandboxResponse = {
      output: '',
      error: null
    };

    if (execution.logs.stdout.length > 0) {
      response.output = execution.logs.stdout.join('\n');
    }
    
    if (execution.logs.stderr.length > 0) {
      response.error = execution.logs.stderr.join('\n');
    }

    // Cleanup sandbox
    await sbx.kill();

    return res.status(200).json(response);
  } catch (error) {
    console.error('Sandbox execution error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
} 