import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '../components/nodes/BaseNode';
import { CodeTemplateMetadata, TemplateNodeConfig, TemplateEdgeConfig } from './templateMetadata';

/**
 * Convert template metadata to ReactFlow nodes and edges
 */
export interface TemplateToNodesResult {
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
}

/**
 * Generate unique node IDs to avoid conflicts with existing nodes
 */
export function generateUniqueNodeId(baseId: string, existingNodes: Node[] = []): string {
  const existingIds = new Set(existingNodes.map(node => node.id));
  let counter = 1;
  let uniqueId = baseId;
  
  while (existingIds.has(uniqueId)) {
    uniqueId = `${baseId}-${counter}`;
    counter++;
  }
  
  return uniqueId;
}

/**
 * Generate unique edge IDs to avoid conflicts with existing edges
 */
export function generateUniqueEdgeId(baseId: string, existingEdges: Edge[] = []): string {
  const existingIds = new Set(existingEdges.map(edge => edge.id));
  let counter = 1;
  let uniqueId = baseId;
  
  while (existingIds.has(uniqueId)) {
    uniqueId = `${baseId}-${counter}`;
    counter++;
  }
  
  return uniqueId;
}

/**
 * Convert template node configuration to ReactFlow node
 */
export function convertTemplateNodeToReactFlowNode(
  templateNode: TemplateNodeConfig,
  existingNodes: Node[] = []
): Node<BaseNodeData> {
  // Extract the semantic type (agent, tool, model, etc.)
  const semanticType = templateNode.data.nodeType || templateNode.type;
  
  // Use timestamp-based IDs like natural language input
  const uniqueId = `node_${Date.now()}_${semanticType}_${Math.random().toString(36).substring(2, 5)}`;
  
  // Generate label with better fallback logic
  const generateLabel = () => {
    // Use explicit label first
    if (templateNode.data.label) return templateNode.data.label;
    
    // Use specific name properties based on type
    if (templateNode.data.agentName) return templateNode.data.agentName;
    if (templateNode.data.modelName) return templateNode.data.modelName;
    if (templateNode.data.toolName) return templateNode.data.toolName;
    if (templateNode.data.serverName) return templateNode.data.serverName;
    
    // Use type-based default labels
    switch (semanticType) {
      case 'agent': return 'Agent';
      case 'model': return 'AI Model';
      case 'tool': return 'Tool';
      case 'mcp-client': return 'MCP Client';
      case 'mcp-server': return 'MCP Server';
      case 'langfuse': return 'Analytics';
      case 'memory': return 'Memory';
      case 'event-handling': return 'Event Handler';
      default: return semanticType || 'Node';
    }
  };

  return {
    id: uniqueId,
    type: 'baseNode',
    position: templateNode.position,
    data: {
      ...templateNode.data,
      id: uniqueId,
      // Match natural language input structure exactly
      label: generateLabel(),
      type: semanticType, // Natural language uses 'type' in data, not 'nodeType'
      description: templateNode.data.description || templateNode.data.agentDescription || templateNode.data.toolDescription || templateNode.data.serverDescription || ''
    } as BaseNodeData,
    draggable: true // CRITICAL: Natural language always includes this
  };
}

/**
 * Convert template edge configuration to ReactFlow edge
 */
export function convertTemplateEdgeToReactFlowEdge(
  templateEdge: TemplateEdgeConfig,
  nodeIdMapping: Map<string, string>,
  existingEdges: Edge[] = []
): Edge {
  // Use timestamp-based IDs like natural language input
  const uniqueId = `edge_${Date.now()}_${templateEdge.source}_${templateEdge.target}`;
  
  // Map old node IDs to new unique IDs
  const sourceId = nodeIdMapping.get(templateEdge.source) || templateEdge.source;
  const targetId = nodeIdMapping.get(templateEdge.target) || templateEdge.target;
  
  return {
    id: uniqueId,
    source: sourceId,
    target: targetId,
    sourceHandle: templateEdge.sourceHandle,
    targetHandle: templateEdge.targetHandle,
    type: 'default', // Match natural language input edge type
    animated: true
  };
}

/**
 * Calculate optimal node positions with improved layout algorithm
 */
export function calculateOptimalPositions(
  nodes: TemplateNodeConfig[],
  options: {
    centerX?: number;
    centerY?: number;
    horizontalSpacing?: number;
    verticalSpacing?: number;
    maxNodesPerRow?: number;
  } = {}
): TemplateNodeConfig[] {
  const {
    centerX = 400,
    centerY = 300,
    horizontalSpacing = 200,
    verticalSpacing = 150,
    maxNodesPerRow = 3
  } = options;
  
  // Sort nodes by type hierarchy (agent first, then model, then others)
  const typeHierarchy = ['agent', 'model', 'mcp-client', 'mcp-server', 'langfuse', 'memory', 'tool'];
  const sortedNodes = [...nodes].sort((a, b) => {
    const aIndex = typeHierarchy.indexOf(a.type);
    const bIndex = typeHierarchy.indexOf(b.type);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  
  // Calculate grid layout
  const totalNodes = sortedNodes.length;
  const rows = Math.ceil(totalNodes / maxNodesPerRow);
  const startY = centerY - ((rows - 1) * verticalSpacing) / 2;
  
  return sortedNodes.map((node, index) => {
    const row = Math.floor(index / maxNodesPerRow);
    const col = index % maxNodesPerRow;
    const nodesInRow = Math.min(maxNodesPerRow, totalNodes - row * maxNodesPerRow);
    const rowStartX = centerX - ((nodesInRow - 1) * horizontalSpacing) / 2;
    
    return {
      ...node,
      position: {
        x: rowStartX + col * horizontalSpacing,
        y: startY + row * verticalSpacing
      }
    };
  });
}

/**
 * Convert template metadata to ReactFlow nodes and edges
 */
export function convertTemplateToNodesAndEdges(
  template: CodeTemplateMetadata,
  existingNodes: Node[] = [],
  existingEdges: Edge[] = [],
  layoutOptions?: {
    centerX?: number;
    centerY?: number;
    horizontalSpacing?: number;
    verticalSpacing?: number;
    maxNodesPerRow?: number;
  }
): TemplateToNodesResult {
  // Calculate optimal positions
  const optimizedNodes = calculateOptimalPositions(template.nodes, layoutOptions);
  
  // Track node ID mapping for edges
  const nodeIdMapping = new Map<string, string>();
  
  // Convert nodes
  const reactFlowNodes = optimizedNodes.map(templateNode => {
    const reactFlowNode = convertTemplateNodeToReactFlowNode(templateNode, existingNodes);
    nodeIdMapping.set(templateNode.id, reactFlowNode.id);
    return reactFlowNode;
  });
  
  // Convert edges
  const reactFlowEdges = template.edges.map(templateEdge => 
    convertTemplateEdgeToReactFlowEdge(templateEdge, nodeIdMapping, existingEdges)
  );
  
  return {
    nodes: reactFlowNodes,
    edges: reactFlowEdges
  };
}

/**
 * Apply template to existing flow (replace current nodes and edges)
 */
export function applyTemplateToFlow(
  template: CodeTemplateMetadata,
  layoutOptions?: {
    centerX?: number;
    centerY?: number;
    horizontalSpacing?: number;
    verticalSpacing?: number;
    maxNodesPerRow?: number;
  }
): TemplateToNodesResult {
  // Convert template with fresh IDs (no existing nodes/edges to consider)
  return convertTemplateToNodesAndEdges(template, [], [], layoutOptions);
}

/**
 * Add template nodes to existing flow (append to current nodes and edges)
 */
export function addTemplateToFlow(
  template: CodeTemplateMetadata,
  existingNodes: Node[],
  existingEdges: Edge[],
  layoutOptions?: {
    centerX?: number;
    centerY?: number;
    horizontalSpacing?: number;
    verticalSpacing?: number;
    maxNodesPerRow?: number;
  }
): TemplateToNodesResult {
  // Convert template considering existing nodes/edges to avoid ID conflicts
  const templateResult = convertTemplateToNodesAndEdges(
    template, 
    existingNodes, 
    existingEdges, 
    layoutOptions
  );
  
  return {
    nodes: [...existingNodes, ...templateResult.nodes],
    edges: [...existingEdges, ...templateResult.edges]
  };
}

/**
 * Get template preview (nodes and edges for display purposes)
 */
export function getTemplatePreview(
  template: CodeTemplateMetadata,
  previewOptions: {
    scale?: number;
    centerX?: number;
    centerY?: number;
  } = {}
): TemplateToNodesResult {
  const { scale = 0.5, centerX = 200, centerY = 150 } = previewOptions;
  
  const layoutOptions = {
    centerX,
    centerY,
    horizontalSpacing: 150 * scale,
    verticalSpacing: 100 * scale,
    maxNodesPerRow: 3
  };
  
  return convertTemplateToNodesAndEdges(template, [], [], layoutOptions);
}

/**
 * Validate template structure
 */
export function validateTemplate(template: CodeTemplateMetadata): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check required fields
  if (!template.id) errors.push('Template ID is required');
  if (!template.name) errors.push('Template name is required');
  if (!template.nodes || template.nodes.length === 0) {
    errors.push('Template must have at least one node');
  }
  
  // Check node structure
  const nodeIds = new Set<string>();
  template.nodes.forEach((node, index) => {
    if (!node.id) {
      errors.push(`Node ${index} is missing ID`);
    } else if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    } else {
      nodeIds.add(node.id);
    }
    
    if (!node.type) errors.push(`Node ${node.id || index} is missing type`);
    if (!node.position) errors.push(`Node ${node.id || index} is missing position`);
    if (!node.data || !node.data.nodeType) {
      errors.push(`Node ${node.id || index} is missing data or nodeType`);
    }
  });
  
  // Check edge structure
  const edgeIds = new Set<string>();
  template.edges.forEach((edge, index) => {
    if (!edge.id) {
      errors.push(`Edge ${index} is missing ID`);
    } else if (edgeIds.has(edge.id)) {
      errors.push(`Duplicate edge ID: ${edge.id}`);
    } else {
      edgeIds.add(edge.id);
    }
    
    if (!edge.source) errors.push(`Edge ${edge.id || index} is missing source`);
    if (!edge.target) errors.push(`Edge ${edge.id || index} is missing target`);
    
    // Check if source and target nodes exist
    if (edge.source && !nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id || index} references non-existent source node: ${edge.source}`);
    }
    if (edge.target && !nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id || index} references non-existent target node: ${edge.target}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}