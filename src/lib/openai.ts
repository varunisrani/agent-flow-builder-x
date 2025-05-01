import { BaseNodeData } from '@/components/nodes/BaseNode';
import { Node, Edge } from '@xyflow/react';

// OpenAI API key
const OPENAI_API_KEY = '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';
const MODEL = 'gpt-4.1-mini';

// Node position calculations
const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;
const HORIZONTAL_PADDING = 200;
const VERTICAL_PADDING = 150;

// Interface for OpenAI API response
interface ToolConfig {
  apiKey?: string;
  endpoint?: string;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

interface GeneratedNode {
  id: string;
  type: BaseNodeData['type'];
  label: string;
  description: string;
  modelType?: string;
  instruction?: string;
  toolConfig?: ToolConfig;
}

interface GeneratedEdge {
  source: string;
  target: string;
  label?: string;
}

interface FlowGenerationResponse {
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
}

/**
 * Generate a workflow based on a natural language prompt
 */
export async function generateFlow(prompt: string): Promise<{
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
}> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an AI that converts natural language descriptions into a workflow graph for an agent-based system. Create a logically connected flow with appropriate connections between nodes.
            
            The available node types are:
            - agent: An agent node that orchestrates the workflow (e.g., making decisions, calling tools)
            - model: A language model node (e.g., GPT-4) that performs text generation, reasoning, or processing
            - tool: A tool that the agent can use (e.g., web search, weather API, calculator, database)
            - function: A function node that executes custom code for a specific purpose
            - input: An input node where data enters the workflow (always start with this)
            - output: An output node where results exit the workflow (always end with this)
            
            For each node, provide:
            - id: A unique identifier (e.g., "node1", "search_tool")
            - type: One of the node types listed above
            - label: A short, descriptive name for the node (e.g., "Web Search", "GPT-4 Model")
            - description: A brief explanation of what the node does and its purpose in the workflow
            - Additional properties depending on node type:
              - model nodes: modelType (e.g., "gpt-4.1-mini", "claude-3-sonnet")
              - agent nodes: instruction (e.g., "Search for information and summarize it")
              - tool nodes: toolConfig (JSON with any necessary configuration parameters)
            
            For each edge, provide:
            - source: The ID of the source node
            - target: The ID of the target node
            - label (optional): A description of what data/information flows through this connection
            
            Build a complete graph where:
            1. Every node must be connected 
            2. The flow should start with an input node
            3. The flow should end with an output node
            4. The connections should form a logical sequence of operations
            5. Agent nodes should typically be connected to tool or model nodes
            
            Return your response as a JSON object with two arrays: 'nodes' and 'edges'.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ''
        }`
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON from the response
    let parsedData: FlowGenerationResponse;
    try {
      // Find JSON content between ```json and ``` if present
      const jsonMatch = content.match(/```json([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        parsedData = JSON.parse(jsonMatch[1].trim());
      } else {
        // Otherwise try to parse the entire content
        parsedData = JSON.parse(content);
      }
      
      // Validate the response format
      if (!parsedData.nodes || !Array.isArray(parsedData.nodes) || !parsedData.edges || !Array.isArray(parsedData.edges)) {
        throw new Error('Invalid response format: missing nodes or edges arrays');
      }
      
      // Ensure all referenced node IDs in edges exist in nodes
      const nodeIds = new Set(parsedData.nodes.map(node => node.id));
      for (const edge of parsedData.edges) {
        if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
          throw new Error(`Invalid edge: references non-existent node(s) - ${edge.source} to ${edge.target}`);
        }
      }
      
    } catch (e) {
      console.error('Failed to parse OpenAI response:', e);
      throw new Error('Failed to parse the workflow generation response. Please try again with a clearer description.');
    }

    // Convert to xyflow Nodes and Edges format with positioned nodes
    return positionNodes(parsedData);
  } catch (error) {
    console.error('Error generating flow:', error);
    throw error;
  }
}

/**
 * Position nodes in a visually appealing layout
 */
function positionNodes(data: FlowGenerationResponse): {
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
} {
  const { nodes: rawNodes, edges: rawEdges } = data;
  
  // Create a map to track node levels in the graph
  const nodeLevels: { [key: string]: number } = {};
  const nodeMaxColumn: { [key: string]: number } = {};
  
  // Find starting nodes (nodes with no incoming edges)
  const startingNodeIds = rawNodes
    .filter(node => !rawEdges.some(edge => edge.target === node.id))
    .map(node => node.id);
  
  // If no starting nodes found, use the first node as the starting point
  if (startingNodeIds.length === 0 && rawNodes.length > 0) {
    startingNodeIds.push(rawNodes[0].id);
  }
  
  // Assign levels to nodes through BFS
  const queue = startingNodeIds.map(id => ({ id, level: 0, column: 0 }));
  const processedNodes = new Set<string>();
  
  while (queue.length > 0) {
    const { id, level, column } = queue.shift()!;
    
    if (processedNodes.has(id)) {
      continue;
    }
    
    processedNodes.add(id);
    nodeLevels[id] = level;
    
    // Track the maximum column used at this level
    nodeMaxColumn[level] = Math.max(column, nodeMaxColumn[level] || 0);
    
    // Find all outgoing edges
    const outgoingEdges = rawEdges.filter(edge => edge.source === id);
    const nextColumn = outgoingEdges.length > 1 ? 0 : column;
    
    // Queue the next nodes
    outgoingEdges.forEach((edge, idx) => {
      if (!processedNodes.has(edge.target)) {
        queue.push({ 
          id: edge.target, 
          level: level + 1,
          column: nextColumn + idx
        });
      }
    });
  }
  
  // Verify that all nodes have levels assigned - handle disconnected nodes
  rawNodes.forEach(node => {
    if (!(node.id in nodeLevels)) {
      // Assign a default level for disconnected nodes
      nodeLevels[node.id] = 0;
      
      // Find a good column position that doesn't overlap with existing nodes
      const maxColumn = nodeMaxColumn[0] || 0;
      nodeMaxColumn[0] = maxColumn + 1;
    }
  });
  
  // Create positioned nodes
  const nodes: Node<BaseNodeData>[] = rawNodes.map(nodeData => {
    const level = nodeLevels[nodeData.id] || 0;
    const column = nodeMaxColumn[level] || 0;
    
    // Create properly formatted node
    return {
      id: nodeData.id,
      type: 'baseNode',
      data: {
        label: nodeData.label,
        type: nodeData.type,
        description: nodeData.description,
        ...(nodeData.modelType && { modelType: nodeData.modelType }),
        ...(nodeData.instruction && { instruction: nodeData.instruction }),
        ...(nodeData.toolConfig && { toolConfig: nodeData.toolConfig }),
      },
      position: {
        x: level * HORIZONTAL_PADDING + (NODE_WIDTH / 2),
        y: column * VERTICAL_PADDING + (NODE_HEIGHT / 2),
      },
    };
  });
  
  // Create edges with improved labels
  const edges: Edge[] = rawEdges.map((edge, idx) => ({
    id: `e${idx}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    // Add styling for better visibility
    style: { stroke: '#444' },
    labelStyle: { fill: '#444', fontWeight: 500 },
    labelBgStyle: { fill: 'rgba(255, 255, 255, 0.75)' },
  }));
  
  return { nodes, edges };
} 