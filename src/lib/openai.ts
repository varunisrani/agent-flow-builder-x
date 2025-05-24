import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '@/components/nodes/BaseNode';

// OpenRouter configuration from environment variables
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_BASE = import.meta.env.VITE_OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';

// Validate API key is present
if (!OPENROUTER_API_KEY) {
  console.error('OpenRouter API key not found in environment variables. Please add VITE_OPENROUTER_API_KEY to your .env file.');
}

// Type definitions
interface Position {
  x: number;
  y: number;
}

interface APINodeResponse {
  id: string;
  type: string;
  label: string;
  description?: string;
  position?: Position;
  data?: Record<string, unknown>;
}

// Type for OpenRouter API request body
interface OpenRouterRequestBody {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  response_format?: {
    type: string;
  };
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
}

// Helper function to generate a unique ID
const generateId = () => `node_${Math.random().toString(36).substring(2, 9)}`;

// Function to calculate positions for nodes
const calculateNodePositions = (nodes: Node<BaseNodeData>[]) => {
  // Start with some default positions
  const centerX = 400;
  const centerY = 300;
  const radius = 200;
  
  return nodes.map((node, index) => {
    const angle = (index * (2 * Math.PI)) / nodes.length;
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
    };
  });
};

// Helper function to make OpenRouter API calls
async function callOpenRouter(endpoint: string, body: OpenRouterRequestBody) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': window.location.origin, // Required by OpenRouter
    'X-Title': 'Agent Flow Builder' // Optional but recommended
  };

  try {
    const response = await fetch(`${OPENROUTER_API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Main function to generate a flow from a natural language prompt
export async function generateFlow(prompt: string): Promise<{ nodes: Node<BaseNodeData>[]; edges: Edge[] }> {
  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key is not configured. Please add VITE_OPENROUTER_API_KEY to your .env file.');
    }

    // Define the system message to shape the AI's response
    const systemMessage = `
      You are an expert in building Google ADK agent workflows.
      When given a description of an agent system, you will output a JSON representation of nodes and edges for a flow-based diagram.
      
      For each node, include:
      - id (string)
      - type (one of: "agent", "tool", "model")
      - label (short display name)
      - description (longer description of what it does)
      - data (an object with additional properties)
      
      The node types must follow Google ADK conventions:
      - agent: An LlmAgent that uses Google ADK's LlmAgent class
      - tool: A FunctionTool from google.adk.tools (e.g., google_search, calculator)
      - model: A model supported by Google ADK (e.g., "gemini-2.0-flash", "gemini-2.0-pro")
      
      For tools, only use official Google ADK tools:
      - google_search: Web search tool
      - calculator: Basic math operations
      - file_tool: File operations
      - http_tool: HTTP requests
      - system_tool: System operations
      
      For edges, include:
      - id (string)
      - source (id of source node)
      - target (id of target node)
      - label (optional description of the connection)
      
      Output the JSON in the following format:
      {
        "nodes": [...],
        "edges": [...]
      }
    `;

    // Make the OpenRouter API call
    const result = await callOpenRouter('/chat/completions', {
      model: 'openai/gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: `Create a Google ADK agent flow from this description: ${prompt}. Only use official Google ADK tools and models.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const responseContent = result.choices[0].message.content || '{"nodes":[], "edges":[]}';
    const parsedResponse = JSON.parse(responseContent);

    // Convert nodes to the proper format with baseNode type
    const formattedNodes = parsedResponse.nodes.map((node: APINodeResponse) => ({
      id: node.id,
      type: 'baseNode', // Always use baseNode as the type for React Flow
      position: node.position || { x: 0, y: 0 },
      data: {
        label: node.label,
        type: node.type as BaseNodeData['type'], // Store the semantic type (agent, tool, etc.) in the data object
        description: node.description || '',
        ...(node.data || {})
      } satisfies BaseNodeData
    }));

    // Apply better node positioning
    const positionedNodes = calculateNodePositions(formattedNodes);

    return {
      nodes: positionedNodes,
      edges: parsedResponse.edges,
    };
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate flow: ${error.message}`);
    }
    throw new Error('Failed to generate flow. Please check your API key and try again.');
  }
} 
