import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Define the base directory for agents
const HOME_DIR = os.homedir();
const AGENTS_BASE_DIR = path.join(HOME_DIR, '.agent-flow-builder', 'agents');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name } = req.query;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Missing required parameter: name' });
    }

    const agentPath = path.join(AGENTS_BASE_DIR, name);
    
    // Check if the directory exists
    const exists = await fs.promises.access(agentPath)
      .then(() => true)
      .catch(() => false);

    return res.status(200).json({
      exists,
      path: exists ? agentPath : null
    });
  } catch (error) {
    console.error('Error checking agent:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error checking agent',
      success: false
    });
  }
} 