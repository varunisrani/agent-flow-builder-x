import { Sandbox } from '@e2b/code-interpreter';
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkRateLimit, validateApiKey, sanitizeInput, getClientId } from '@/lib/security';

interface SandboxResponse {
  output: string;
  error: string | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SandboxResponse | { error: string }>
) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(clientId, 50, 15); // 50 requests per 15 minutes
  
  res.setHeader('X-RateLimit-Limit', '50');
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000).toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please try again later.' 
    });
  }

  // API key validation (optional but recommended)
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!validateApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  try {
    const { code } = req.body;
    
    // Input validation and sanitization
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    const sanitizedCode = sanitizeInput(code, 100000); // Max 100KB of code
    
    // Create sandbox instance with timeout
    const sbx = await Sandbox.create({ 
      apiKey: process.env.E2B_API_KEY,
      timeout: 60000, // 60 second timeout
    });

    // Execute the sanitized code
    const execution = await sbx.runCode(sanitizedCode);
    
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