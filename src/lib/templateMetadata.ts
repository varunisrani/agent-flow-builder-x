import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '../components/nodes/BaseNode';

/**
 * Template node configuration for converting code templates to visual flows
 */
export interface TemplateNodeConfig {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Partial<BaseNodeData>;
}

/**
 * Template edge configuration for connections between nodes
 */
export interface TemplateEdgeConfig {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Complete template metadata structure
 */
export interface CodeTemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: 'Code Templates';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  estimatedTime: string;
  isNew?: boolean;
  isPopular?: boolean;
  nodes: TemplateNodeConfig[];
  edges: TemplateEdgeConfig[];
  features: string[];
}

/**
 * Code generation template metadata definitions
 */
export const CODE_TEMPLATES: CodeTemplateMetadata[] = [
  {
    id: 'basic-agent',
    name: 'Basic Agent',
    description: 'Simple Google ADK agent with minimal configuration and basic model setup',
    category: 'Code Templates',
    difficulty: 'Beginner',
    tags: ['ADK', 'Basic', 'Gemini', 'Starter'],
    estimatedTime: '5 min',
    isPopular: true,
    features: ['Google ADK', 'Gemini Model', 'Basic Configuration'],
    nodes: [
      {
        id: 'agent-1',
        type: 'agent',
        position: { x: 100, y: 100 },
        data: {
          label: 'BasicAgent',
          nodeType: 'agent',
          description: 'A simple Google ADK agent with basic configuration',
          agentName: 'BasicAgent',
          agentDescription: 'A simple agent using Google ADK',
          agentInstruction: 'You are a helpful AI assistant. Provide clear and accurate responses to user queries.',
          agentModel: 'gemini-1.5-flash'
        }
      },
      {
        id: 'model-1',
        type: 'model',
        position: { x: 300, y: 100 },
        data: {
          label: 'gemini-1.5-flash',
          nodeType: 'model',
          description: 'Google Gemini 1.5 Flash - Fast and efficient AI model',
          modelName: 'gemini-1.5-flash',
          modelType: 'gemini'
        }
      }
    ],
    edges: [
      {
        id: 'e1-1',
        source: 'agent-1',
        target: 'model-1'
      }
    ]
  },
  {
    id: 'mcp-agent',
    name: 'MCP Agent',
    description: 'Model Context Protocol agent with Smithery integration and dynamic tool loading',
    category: 'Code Templates',
    difficulty: 'Intermediate',
    tags: ['MCP', 'Smithery', 'Tools', 'Protocol'],
    estimatedTime: '10-15 min',
    isNew: true,
    features: ['MCP Protocol', 'Smithery Integration', 'Dynamic Tools', 'API Key Management'],
    nodes: [
      {
        id: 'agent-2',
        type: 'agent',
        position: { x: 100, y: 100 },
        data: {
          label: 'MCPAgent',
          nodeType: 'agent',
          description: 'Advanced agent with Model Context Protocol capabilities',
          agentName: 'MCPAgent',
          agentDescription: 'An agent with Model Context Protocol capabilities',
          agentInstruction: 'You are an AI assistant with access to MCP tools. Use available tools to help users accomplish their tasks efficiently.',
          agentModel: 'gemini-1.5-flash'
        }
      },
      {
        id: 'model-2',
        type: 'model',
        position: { x: 300, y: 100 },
        data: {
          label: 'gemini-1.5-flash',
          nodeType: 'model',
          description: 'Google Gemini 1.5 Flash - Fast and efficient AI model',
          modelName: 'gemini-1.5-flash',
          modelType: 'gemini'
        }
      },
      {
        id: 'mcp-client-1',
        type: 'mcp-client',
        position: { x: 500, y: 50 },
        data: {
          label: 'Time MCP Client',
          nodeType: 'mcp-client',
          description: 'MCP client for time and date operations',
          smitheryMcp: 'smithery/time',
          command: 'npx',
          args: ['--yes', '@smithery/time-mcp', '--key'],
          availableFunctions: 'time and date operations',
          mcpType: 'time',
          smitheryApiKey: ''
        }
      },
      {
        id: 'mcp-server-1',
        type: 'mcp-server',
        position: { x: 500, y: 150 },
        data: {
          label: 'Time MCP Server',
          nodeType: 'mcp-server',
          description: 'MCP server hosting time and date services',
          serverName: 'time-server',
          serverDescription: 'MCP server for time operations',
          mcpUrl: '',
          mcpCommand: 'npx @smithery/time-mcp',
          mcpArgs: ['--key']
        }
      }
    ],
    edges: [
      {
        id: 'e2-1',
        source: 'agent-2',
        target: 'model-2'
      },
      {
        id: 'e2-2',
        source: 'agent-2',
        target: 'mcp-client-1'
      },
      {
        id: 'e2-3',
        source: 'mcp-client-1',
        target: 'mcp-server-1'
      }
    ]
  },
  {
    id: 'langfuse-agent',
    name: 'Analytics Agent',
    description: 'Langfuse-enabled agent with comprehensive conversation tracking and performance monitoring',
    category: 'Code Templates',
    difficulty: 'Intermediate',
    tags: ['Langfuse', 'Analytics', 'Monitoring', 'Tracking'],
    estimatedTime: '10 min',
    features: ['Langfuse Analytics', 'Conversation Tracking', 'Performance Monitoring', 'Error Tracking'],
    nodes: [
      {
        id: 'agent-3',
        type: 'agent',
        position: { x: 100, y: 100 },
        data: {
          label: 'AnalyticsAgent',
          nodeType: 'agent',
          description: 'Agent with built-in analytics and performance monitoring',
          agentName: 'AnalyticsAgent',
          agentDescription: 'An agent with built-in analytics and monitoring',
          agentInstruction: 'You are an AI assistant with comprehensive analytics tracking. All interactions are monitored for performance optimization.',
          agentModel: 'gemini-1.5-flash'
        }
      },
      {
        id: 'model-3',
        type: 'model',
        position: { x: 300, y: 100 },
        data: {
          label: 'gemini-1.5-flash',
          nodeType: 'model',
          description: 'Google Gemini 1.5 Flash - Fast and efficient AI model',
          modelName: 'gemini-1.5-flash',
          modelType: 'gemini'
        }
      },
      {
        id: 'langfuse-1',
        type: 'langfuse',
        position: { x: 500, y: 100 },
        data: {
          label: 'Langfuse Analytics',
          nodeType: 'langfuse',
          description: 'Analytics and observability for agent interactions',
          langfuseEnabled: true,
          langfusePublicKey: '',
          langfuseSecretKey: '',
          langfuseHost: 'https://cloud.langfuse.com',
          langfuseProjectName: 'agent-analytics'
        }
      }
    ],
    edges: [
      {
        id: 'e3-1',
        source: 'agent-3',
        target: 'model-3'
      },
      {
        id: 'e3-2',
        source: 'agent-3',
        target: 'langfuse-1'
      }
    ]
  },
  {
    id: 'memory-agent',
    name: 'Memory Agent',
    description: 'Mem0-powered agent with persistent memory and context-aware responses',
    category: 'Code Templates',
    difficulty: 'Intermediate',
    tags: ['Mem0', 'Memory', 'Context', 'Persistence'],
    estimatedTime: '10 min',
    features: ['Mem0 Memory', 'Persistent Context', 'User Preferences', 'Conversation History'],
    nodes: [
      {
        id: 'agent-4',
        type: 'agent',
        position: { x: 100, y: 100 },
        data: {
          label: 'MemoryAgent',
          nodeType: 'agent',
          description: 'Agent with persistent memory and context awareness',
          agentName: 'MemoryAgent',
          agentDescription: 'An agent with persistent memory capabilities',
          agentInstruction: 'You are an AI assistant with memory. Remember user preferences and conversation context to provide personalized responses.',
          agentModel: 'gemini-1.5-flash'
        }
      },
      {
        id: 'model-4',
        type: 'model',
        position: { x: 300, y: 100 },
        data: {
          label: 'gemini-1.5-flash',
          nodeType: 'model',
          description: 'Google Gemini 1.5 Flash - Fast and efficient AI model',
          modelName: 'gemini-1.5-flash',
          modelType: 'gemini'
        }
      },
      {
        id: 'memory-1',
        type: 'memory',
        position: { x: 500, y: 100 },
        data: {
          label: 'Mem0 Memory',
          nodeType: 'memory',
          description: 'Persistent memory and learning capabilities for agent context',
          memoryEnabled: true,
          memoryApiKey: '',
          memoryHost: 'https://api.mem0.ai',
          memoryUserId: 'default_user',
          memoryOrganization: '',
          memoryType: 'all',
          memoryRetention: 30
        }
      }
    ],
    edges: [
      {
        id: 'e4-1',
        source: 'agent-4',
        target: 'model-4'
      },
      {
        id: 'e4-2',
        source: 'agent-4',
        target: 'memory-1'
      }
    ]
  },
  {
    id: 'event-handling-agent',
    name: 'Event Handling Agent',
    description: 'Comprehensive event tracking system with real-time monitoring and detailed logging',
    category: 'Code Templates',
    difficulty: 'Advanced',
    tags: ['Events', 'Logging', 'Monitoring', 'Analytics'],
    estimatedTime: '15 min',
    features: ['Event Tracking', 'Real-time Monitoring', 'File Logging', 'Statistics', 'Error Handling'],
    nodes: [
      {
        id: 'agent-5',
        type: 'agent',
        position: { x: 100, y: 100 },
        data: {
          label: 'EventAgent',
          nodeType: 'agent',
          description: 'Agent with comprehensive event handling and tracking',
          agentName: 'EventAgent',
          agentDescription: 'An agent with comprehensive event handling capabilities',
          agentInstruction: 'You are an AI assistant with detailed event tracking. All interactions are logged and monitored for analysis.',
          agentModel: 'gemini-1.5-flash'
        }
      },
      {
        id: 'model-5',
        type: 'model',
        position: { x: 300, y: 100 },
        data: {
          label: 'gemini-1.5-flash',
          nodeType: 'model',
          description: 'Google Gemini 1.5 Flash - Fast and efficient AI model',
          modelName: 'gemini-1.5-flash',
          modelType: 'gemini'
        }
      },
      {
        id: 'tool-1',
        type: 'tool',
        position: { x: 500, y: 50 },
        data: {
          label: 'Event Logger',
          nodeType: 'tool',
          description: 'Comprehensive event tracking and monitoring for agent interactions',
          toolName: 'EventLogger',
          toolDescription: 'Comprehensive event logging and tracking',
          toolType: 'event_tracking',
          parameters: { 'event_type': 'string', 'data': 'object' },
          returns: 'dict'
        }
      },
      {
        id: 'tool-2',
        type: 'tool',
        position: { x: 500, y: 150 },
        data: {
          label: 'Statistics Reporter',
          nodeType: 'tool',
          description: 'Generate detailed statistics and analytics reports',
          toolName: 'StatisticsReporter',
          toolDescription: 'Event statistics and analytics reporting',
          toolType: 'analytics',
          parameters: { 'metric': 'string', 'timeframe': 'string' },
          returns: 'dict'
        }
      }
    ],
    edges: [
      {
        id: 'e5-1',
        source: 'agent-5',
        target: 'model-5'
      },
      {
        id: 'e5-2',
        source: 'agent-5',
        target: 'tool-1'
      },
      {
        id: 'e5-3',
        source: 'agent-5',
        target: 'tool-2'
      }
    ]
  },
  {
    id: 'combined-agent',
    name: 'Multi-Feature Agent',
    description: 'Advanced agent combining MCP tools, analytics, memory, and event handling',
    category: 'Code Templates',
    difficulty: 'Advanced',
    tags: ['Combined', 'MCP', 'Analytics', 'Memory', 'Events', 'Advanced'],
    estimatedTime: '20-25 min',
    isPopular: true,
    features: ['All Features', 'MCP Tools', 'Langfuse Analytics', 'Mem0 Memory', 'Event Handling', 'Full Stack'],
    nodes: [
      {
        id: 'agent-6',
        type: 'agent',
        position: { x: 200, y: 200 },
        data: {
          label: 'MultiFeaturedAgent',
          nodeType: 'agent',
          description: 'Advanced agent with all features: MCP, analytics, memory, and events',
          agentName: 'MultiFeaturedAgent',
          agentDescription: 'A comprehensive agent with all available features',
          agentInstruction: 'You are an advanced AI assistant with comprehensive capabilities including tools, analytics, memory, and event tracking.',
          agentModel: 'gemini-1.5-flash'
        }
      },
      {
        id: 'model-6',
        type: 'model',
        position: { x: 400, y: 200 },
        data: {
          label: 'gemini-1.5-flash',
          nodeType: 'model',
          description: 'Google Gemini 1.5 Flash - Fast and efficient AI model',
          modelName: 'gemini-1.5-flash',
          modelType: 'gemini'
        }
      },
      {
        id: 'mcp-client-2',
        type: 'mcp-client',
        position: { x: 100, y: 100 },
        data: {
          label: 'Time MCP Client',
          nodeType: 'mcp-client',
          description: 'MCP client for time and date operations',
          smitheryMcp: 'smithery/time',
          command: 'npx',
          args: ['--yes', '@smithery/time-mcp', '--key'],
          availableFunctions: 'time operations',
          mcpType: 'time',
          smitheryApiKey: ''
        }
      },
      {
        id: 'langfuse-2',
        type: 'langfuse',
        position: { x: 300, y: 100 },
        data: {
          label: 'Langfuse Analytics',
          nodeType: 'langfuse',
          description: 'Analytics and observability for agent interactions',
          langfuseEnabled: true,
          langfusePublicKey: '',
          langfuseSecretKey: '',
          langfuseHost: 'https://cloud.langfuse.com',
          langfuseProjectName: 'multi-feature-agent'
        }
      },
      {
        id: 'memory-2',
        type: 'memory',
        position: { x: 500, y: 100 },
        data: {
          label: 'Mem0 Memory',
          nodeType: 'memory',
          description: 'Persistent memory and learning capabilities for agent context',
          memoryEnabled: true,
          memoryApiKey: '',
          memoryHost: 'https://api.mem0.ai',
          memoryUserId: 'default_user',
          memoryOrganization: '',
          memoryType: 'all',
          memoryRetention: 30
        }
      },
      {
        id: 'tool-3',
        type: 'tool',
        position: { x: 100, y: 300 },
        data: {
          label: 'Event Logger',
          nodeType: 'tool',
          description: 'Comprehensive event tracking and monitoring for agent interactions',
          toolName: 'EventLogger',
          toolDescription: 'Event tracking and logging',
          toolType: 'event_tracking',
          parameters: { 'event_type': 'string', 'data': 'object' },
          returns: 'dict'
        }
      },
      {
        id: 'tool-4',
        type: 'tool',
        position: { x: 300, y: 300 },
        data: {
          label: 'Analytics Reporter',
          nodeType: 'tool',
          description: 'Performance analytics and detailed reporting capabilities',
          toolName: 'AnalyticsReporter',
          toolDescription: 'Performance analytics and reporting',
          toolType: 'analytics',
          parameters: { 'metric': 'string', 'timeframe': 'string' },
          returns: 'dict'
        }
      }
    ],
    edges: [
      {
        id: 'e6-1',
        source: 'agent-6',
        target: 'model-6'
      },
      {
        id: 'e6-2',
        source: 'agent-6',
        target: 'mcp-client-2'
      },
      {
        id: 'e6-3',
        source: 'agent-6',
        target: 'langfuse-2'
      },
      {
        id: 'e6-4',
        source: 'agent-6',
        target: 'memory-2'
      },
      {
        id: 'e6-5',
        source: 'agent-6',
        target: 'tool-3'
      },
      {
        id: 'e6-6',
        source: 'agent-6',
        target: 'tool-4'
      }
    ]
  }
];

/**
 * Get template by ID
 */
export function getCodeTemplate(templateId: string): CodeTemplateMetadata | undefined {
  return CODE_TEMPLATES.find(template => template.id === templateId);
}

/**
 * Get all code templates
 */
export function getAllCodeTemplates(): CodeTemplateMetadata[] {
  return CODE_TEMPLATES;
}

/**
 * Filter templates by tags or difficulty
 */
export function filterCodeTemplates(
  templates: CodeTemplateMetadata[],
  tags?: string[],
  difficulty?: string
): CodeTemplateMetadata[] {
  return templates.filter(template => {
    const matchesTags = !tags || tags.length === 0 || 
      tags.some(tag => template.tags.includes(tag));
    const matchesDifficulty = !difficulty || template.difficulty === difficulty;
    
    return matchesTags && matchesDifficulty;
  });
}