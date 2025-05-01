import OpenAI from 'openai';
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '@/components/nodes/BaseNode';

// Use environment variable for API key with dangerouslyAllowBrowser flag
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true, // Enable browser usage (not recommended for production)
});

// Helper types
type Framework = 'adk' | 'vertex' | 'custom';

/**
 * Generates code for the given flow nodes and edges based on the selected framework
 */
export async function generateCode(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  framework: Framework
): Promise<string> {
  // Prepare the node data in a simplified format for the API
  const nodeData = nodes.map(node => ({
    id: node.id,
    type: node.data.type,
    label: node.data.label,
    description: node.data.description || '',
    instruction: node.data.instruction || '',
    modelType: node.data.modelType || '',
  }));

  // Create a simplified representation of edges
  const edgeData = edges.map(edge => ({
    source: edge.source,
    target: edge.target,
    label: edge.label || '',
  }));

  try {
    // Create a system message that explains what we want
    const systemMessage = `
      You are an expert Python developer who specializes in creating agent-based AI systems.
      You will be given a flow diagram represented as nodes and edges, and you need to generate
      Python code that implements this flow using the ${getFrameworkName(framework)} framework.
      
      Generate clean, well-commented code with proper error handling. Include imports, class definitions,
      and a main function that demonstrates how to use the code. The code should be complete and runnable.
      
      For context, here are the node types and their meanings:
      - agent: An autonomous agent that can use tools and models
      - tool: A capability an agent can use (e.g., web search, calculator)
      - model: An AI model (e.g., GPT-4, Claude, etc.)
      - function: A custom function that performs a specific task
      - datasource: A source of data the agent can access
      
      ${getFrameworkSpecificInstructions(framework)}
    `;

    // Make the API call
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: `Here is my agent flow diagram represented as nodes and edges. Please generate Python code for this flow using the ${getFrameworkName(framework)} framework.
            
            Nodes: ${JSON.stringify(nodeData, null, 2)}
            
            Edges: ${JSON.stringify(edgeData, null, 2)}
            
            Please give me the complete Python code implementation.`,
        },
      ],
      temperature: 0.2,
    });

    // Extract and return the generated code
    const generatedCode = response.choices[0].message.content || '';
    
    // Clean up the code (remove markdown code blocks if present)
    return cleanCodeResponse(generatedCode);
  } catch (error) {
    console.error('Error generating code with OpenAI:', error);
    throw new Error('Failed to generate code. Please try again later.');
  }
}

/**
 * Helper function to get the display name of the framework
 */
function getFrameworkName(framework: Framework): string {
  switch (framework) {
    case 'adk':
      return 'Google Agent Development Kit (ADK)';
    case 'vertex':
      return 'Google Vertex AI';
    case 'custom':
      return 'Custom OpenAI Agent';
    default:
      return 'Google Agent Development Kit (ADK)';
  }
}

/**
 * Helper function to get framework-specific instructions
 */
function getFrameworkSpecificInstructions(framework: Framework): string {
  switch (framework) {
    case 'adk':
      return `
        Use the Google Agent Development Kit (ADK) to implement this flow.
        Include appropriate imports for the ADK library, tool definitions, and agent configurations.
        Use the Agent class as the main way to define agents and their properties.
      `;
    case 'vertex':
      return `
        Use Google Vertex AI to implement this flow.
        Include appropriate imports for the Vertex AI SDK, and make sure to initialize the SDK properly.
        Use the aiplatform module for all Vertex AI functionality.
      `;
    case 'custom':
      return `
        Implement a custom agent using the OpenAI API directly.
        Define a clean Agent class that can handle conversation history, tool calling, and other agent functionality.
        Use OpenAI's chat completions API with appropriate parameters for tool use.
      `;
    default:
      return '';
  }
}

/**
 * Helper function to clean up code responses from OpenAI
 */
function cleanCodeResponse(response: string): string {
  // Remove markdown code blocks if present
  const codeBlockMatch = response.match(/```(?:python)?\s*([\s\S]*?)\s*```/);
  
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }
  
  return response.trim();
} 