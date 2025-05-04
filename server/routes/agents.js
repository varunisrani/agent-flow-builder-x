const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const dotenv = require('dotenv');
const { Configuration, OpenAIApi } = require('openai');

// Load environment variables
dotenv.config();

// Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ WARNING: OPENAI_API_KEY is not set in environment. Code generation will fail!');
  console.warn('Please create a .env file with OPENAI_API_KEY=your_api_key');
}

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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

/**
 * Generate code using OpenAI
 */
router.post('/generate-code', async (req, res) => {
  try {
    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        code: '',
        error: 'OpenAI API key not configured. Please add your API key to the .env file.'
      });
    }
    
    const { nodes, edges, mcpEnabled } = req.body;
    
    if (!nodes || !edges) {
      return res.status(400).json({
        success: false,
        code: '',
        error: 'Missing required parameters: nodes and edges'
      });
    }
    
    if (nodes.length === 0) {
      return res.status(400).json({
        success: false,
        code: '',
        error: 'No nodes provided. Please create a flow diagram first.'
      });
    }
    
    // Create a simplified representation of the flow for the prompt
    const nodeDescriptions = nodes.map(node => {
      const { id, data } = node;
      return {
        id,
        type: data.type,
        label: data.label,
        description: data.description || '',
        instruction: data.instruction || '',
        modelType: data.modelType || '',
        mcpUrl: data.mcpUrl || '',
        mcpToolId: data.mcpToolId || ''
      };
    });
    
    // Simplify edges to make them easier to explain
    const connectionDescriptions = edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      return {
        from: sourceNode?.data?.label || edge.source,
        to: targetNode?.data?.label || edge.target,
        fromType: sourceNode?.data?.type || 'unknown',
        toType: targetNode?.data?.type || 'unknown',
      };
    });
    
    console.log(`Generating code for ${nodes.length} nodes and ${edges.length} edges. MCP enabled: ${mcpEnabled}`);
    
    // Create a prompt for the OpenAI model
    const prompt = `Generate Google ADK Python code for the following agent flow:
    
Nodes:
${JSON.stringify(nodeDescriptions, null, 2)}

Connections:
${JSON.stringify(connectionDescriptions, null, 2)}

${mcpEnabled ? 'Include MCP (Model Context Protocol) support.' : ''}

Create complete and runnable code with proper imports. 
Include docstrings and comments.
For agent nodes, use the instruction field as the system instruction.
For model nodes, use the modelType field if specified.
For MCP client nodes, use the mcpUrl field if specified.
For MCP tool nodes, use the mcpToolId field if specified.
Make connections between tools and agents.
Export the primary agent as 'root_agent'.
Include a main() function with example usage.

Return ONLY the Python code with no explanations or markdown.`;

    try {
      // Call OpenAI for code generation
      const completion = await openai.createChatCompletion({
        model: "gpt-4-turbo", // Or appropriate model
        messages: [
          { role: "system", content: "You are an expert Python programmer specializing in Google's Agent Development Kit (ADK). You write clean, efficient, and well-documented code." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2, // Lower temperature for more deterministic output
        max_tokens: 2000 // Adjust as needed
      });
      
      // Extract code from response
      const generatedCode = completion.data.choices[0].message.content;
      
      console.log('Code generated successfully, length:', generatedCode.length);
      
      return res.json({
        success: true,
        code: generatedCode
      });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      
      // Extract detailed error message from OpenAI response
      const errorMessage = openaiError.response?.data?.error?.message || 
                          openaiError.message || 
                          'Failed to generate code with OpenAI';
      
      return res.status(500).json({
        success: false,
        code: '',
        error: `OpenAI API error: ${errorMessage}`
      });
    }
  } catch (error) {
    console.error('Error generating code:', error);
    return res.status(500).json({
      success: false,
      code: '',
      error: error.message || 'Failed to generate code'
    });
  }
});

module.exports = router; 