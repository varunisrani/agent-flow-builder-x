const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Base directory for agent files
const agentsDir = path.join(process.cwd(), 'app', 'agents');

// Ensure agents directory exists
if (!fs.existsSync(agentsDir)) {
  fs.mkdirSync(agentsDir, { recursive: true });
}

/**
 * Create agent files and structure
 */
router.post('/create', async (req, res) => {
  try {
    const { agentName, code } = req.body;
    
    if (!agentName || !code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: agentName and code'
      });
    }
    
    // Create agent directory
    const agentDir = path.join(agentsDir, agentName);
    
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }
    
    // Write agent.py file
    const agentFile = path.join(agentDir, 'agent.py');
    fs.writeFileSync(agentFile, code, 'utf8');
    
    // Write __init__.py file for proper imports
    const initFile = path.join(agentDir, '__init__.py');
    fs.writeFileSync(initFile, 'from .agent import root_agent', 'utf8');
    
    return res.json({
      success: true,
      paths: {
        agentFile,
        initFile
      }
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create agent'
    });
  }
});

/**
 * Run an agent using ADK web command
 */
router.post('/run', async (req, res) => {
  try {
    const { agentName } = req.body;
    
    if (!agentName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: agentName'
      });
    }
    
    // Check if agent directory exists
    const agentDir = path.join(agentsDir, agentName);
    
    if (!fs.existsSync(agentDir)) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentName} not found`
      });
    }
    
    // Start the agent process
    // In a real production env, you might want to use PM2 or similar
    const agentProcess = spawn('python', ['-m', 'google.generativeai.adk', 'web', '--agent', `app.agents.${agentName}`], {
      detached: true,
      stdio: 'ignore'
    });
    
    // Allow process to keep running after parent exits
    agentProcess.unref();
    
    return res.json({
      success: true,
      urls: {
        agentUrl: 'http://localhost:8080'
      }
    });
  } catch (error) {
    console.error('Error running agent:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to run agent'
    });
  }
});

module.exports = router; 