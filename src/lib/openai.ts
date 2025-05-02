import OpenAI from 'openai';
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '@/components/nodes/BaseNode';

// Use environment variable for API key with dangerouslyAllowBrowser flag
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true, // Enable browser usage (not recommended for production)
});

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

// Define the shape of node data returned from the API
interface APINodeResponse {
  id: string;
  type: string;
  label: string;
  description?: string;
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
}

// Main function to generate a flow from a natural language prompt
export async function generateFlow(prompt: string): Promise<{ nodes: Node<BaseNodeData>[]; edges: Edge[] }> {
  try {
    // Define the system message to shape the AI's response
    const systemMessage = `
      You are an expert in building agent workflows.
      When given a description of an agent system, you will output a JSON representation of nodes and edges for a flow-based diagram.
      
      For each node, include:
      - id (string)
      - type (one of: "agent", "tool", "model", "function", "datasource")
      - label (short display name)
      - description (longer description of what it does)
      - data (an object with any additional properties relevant to the node type)
      
      The node types are:
      - agent: An autonomous agent that can use tools and models
      - tool: A capability an agent can use (e.g., web search, calculator)
      - model: An AI model (e.g., GPT-4, Claude, etc.)
      - function: A custom function that performs a specific task
      - datasource: A source of data the agent can access
      
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

    // Make the OpenAI API call
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    // Parse the response
    const responseContent = response.choices[0].message.content || '{"nodes":[], "edges":[]}';
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
        ...(node.data || {}),
      } as BaseNodeData,
    }));

    // Apply better node positioning
    const positionedNodes = calculateNodePositions(formattedNodes);

    return {
      nodes: positionedNodes,
      edges: parsedResponse.edges,
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error('Failed to generate flow. Please check your API key and try again.');
  }
} 