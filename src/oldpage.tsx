'use client';

import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  EdgeChange,
  applyEdgeChanges,
  Connection,
  ReactFlowInstance,
  ConnectionLineType,
  ConnectionMode,
  applyNodeChanges,
  NodeChange,
  Position,
  OnConnectStartParams,
  IsValidConnection,
  OnConnectStart,
  Handle,
  MarkerType,
  addEdge,
} from '@xyflow/react';
import 'reactflow/dist/style.css';
import {
  ProjectData,
  ProjectMeta,
  loadProjects,
  loadProjectData,
  saveProjectData,
  addProject,
  deleteProject,
  getLastActiveProjectId,
  saveLastActiveProjectId,
  PROJECT_DATA_PREFIX
} from './storage';

import { SelectProjectScreen } from './components/SelectProjectScreen';
import { LandingPage } from './components/landing/LandingPage';
import { CodeEditor } from './components/CodeEditor/CodeEditor';
import { CodeProjectEditor } from './components/CodeProjectEditor';
import DraggableComponent from './components/DraggableComponent';
// import CreateAgentDialog from './components/CreateAgentDialog'; // Removed as part of consolidating buttons
import RunAgentDialog from './components/RunAgentDialog';
import './components/HeaderProjectManager'; // Import for side effects only
import { templates as fixedTemplates, pydanticTemplates as fixedPydanticTemplates } from './utils/templates.fixed';
import { generateFlowCode } from './utils/generateFlowCode';
import { generateAgentFromRequirements, saveGeneratedAgent } from './utils/generateAgentFromRequirements';
import { nodeTypes as importedNodeTypes } from './components/nodes';
import HelpButton from './components/Tutorial/HelpButton';

// Add custom CSS for animations and effects
const customStyles = `
  @keyframes pulse-slow {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.3; }
  }

  @keyframes float-slow {
    0%, 100% { transform: translateY(0) rotate(var(--rotation, 0deg)); }
    50% { transform: translateY(-10px) rotate(var(--rotation, 0deg)); }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-pulse-slow {
    animation: pulse-slow 6s ease-in-out infinite;
  }

  .animate-float-slow {
    animation: float-slow 8s ease-in-out infinite;
  }

  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }

  .animation-delay-2000 {
    animation-delay: 2s;
  }

  .bg-grid-pattern {
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  .bg-noise-pattern {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }

  /* React Flow Custom Styles */
  .react-flow__handle {
    opacity: 0.7;
    transition: opacity 0.3s, transform 0.2s, box-shadow 0.3s;
    cursor: crosshair !important;
  }

  .react-flow__handle:hover {
    opacity: 1;
    transform: scale(1.3);
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.8);
  }

  .react-flow__handle.connecting {
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
  }

  .react-flow__edge-path {
    stroke-width: 2;
    transition: stroke-width 0.2s, filter 0.3s;
  }

  .react-flow__edge:hover .react-flow__edge-path {
    stroke-width: 3;
    filter: drop-shadow(0 0 3px rgba(139, 92, 246, 0.5));
  }

  /* Improve connection line visibility */
  .react-flow__connection-path {
    stroke-width: 3;
    filter: drop-shadow(0 0 3px rgba(139, 92, 246, 0.5));
  }

  /* Style for potential target handles during connection */
  .potential-target {
    opacity: 0.9 !important;
    transform: scale(1.2);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.7);
    animation: pulse-subtle 1.5s infinite;
  }

  @keyframes pulse-subtle {
    0% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.7); }
    50% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.9); }
    100% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.7); }
  }

  /* Style for body during connection mode */
  body.connecting-mode .react-flow__node {
    opacity: 0.8;
    transition: opacity 0.3s, transform 0.3s;
  }

  body.connecting-mode .react-flow__node:hover {
    opacity: 1;
    transform: translateY(-2px);
  }

  .react-flow__edge-text {
    font-size: 10px;
    fill: #e2e8f0;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .react-flow__node {
    transition: transform 0.2s;
  }

  .react-flow__node:hover {
    transform: translateY(-2px);
  }

  @keyframes dash {
    from {
      stroke-dashoffset: 24;
    }
    to {
      stroke-dashoffset: 0;
    }
  }

  /* Ripple animation for button clicks */
  @keyframes ripple {
    0% {
      opacity: 1;
      transform: scale(0);
    }
    40% {
      opacity: 0.7;
      transform: scale(1.2);
    }
    100% {
      opacity: 0;
      transform: scale(2);
    }
  }

  /* Button hover and active states */
  .btn-hover-effect {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .btn-hover-effect:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  .btn-hover-effect:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(139, 92, 246, 0.2);
  }

  /* Improved ripple effect */
  @keyframes ripple-effect {
    0% {
      transform: scale(0);
      opacity: 0.6;
    }
    100% {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  /* Tutorial overlay styles - these are now handled directly in the component */
  .tutorial-highlight {
    position: absolute;
    border: 2px dashed #8b5cf6;
    border-radius: 4px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
    z-index: 2001;
    pointer-events: none;
    animation: pulse-subtle 2s infinite;
  }

  .tutorial-step {
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-left: 3px solid #8b5cf6;
  }

  /* Help menu container styles */
  .help-menu-container {
    position: relative;
    z-index: 1001;
  }

  .tutorial-tooltip {
    position: absolute;
    background: rgba(30, 30, 46, 0.95);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 8px;
    padding: 12px;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 1001;
    animation: fadeIn 0.3s ease-out;
  }

  /* Help button pulse effect */
  .help-button-pulse {
    position: relative;
  }

  .help-button-pulse::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: inherit;
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7);
    animation: help-pulse 2s infinite;
  }

  @keyframes help-pulse {
    0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
  }

  /* Ensure proper z-index for UI components */
  .header-bar {
    z-index: 1000;
  }

  /* Improved animation for fade-in elements */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Modal positioning and scrolling fixes */
  @media (max-height: 800px) {
    .tutorial-card, .quick-reference-guide {
      margin: 2rem auto;
      max-height: calc(100vh - 4rem) !important;
    }
  }

  /* Ensure modals are scrollable on small screens */
  .modal-container {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    padding: 2rem 0;
    max-height: 100vh;
  }

  /* Ensure content is scrollable inside modals */
  .quick-reference-guide .overflow-y-auto {
    max-height: 60vh;
  }
`;

// Define types for node data (as a type rather than an interface)
export type NodeData = { // Export NodeData
  label: string;
  type?: string;
  model?: string;
  agentModel?: string;
  description?: string | null;
  capabilities?: string;
  input_type?: string;
  size?: string;
  instruction?: string;
  goal?: string;
  tool_type?: string;
  [key: string]: unknown; // Add index signature for compatibility
};

// Create a context to share flow data between components
interface FlowContextType {
  nodes: Node<NodeData>[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  activeProjectId: string | null; // Add active project ID to context
  saveCurrentProjectData: () => void; // Function to trigger save
  framework?: 'google-adk' | 'pydantic-ai'; // Optional framework setting
  setFramework: React.Dispatch<React.SetStateAction<'google-adk' | 'pydantic-ai'>>; // Function to set framework
}

// Provide default context values, including null for activeProjectId initially
const FlowContext = createContext<FlowContextType>({
    nodes: [],
    edges: [],
    setNodes: () => {},
    setEdges: () => {},
    activeProjectId: null,
    saveCurrentProjectData: () => {},
    setFramework: () => {},
});

// Use the imported node types from components/nodes
const nodeTypes = importedNodeTypes;

// Utility function to determine edge style and label based on node types
const getEdgeStyleAndLabel = (sourceType: string | undefined, targetType: string | undefined) => {
  let edgeStyle = { stroke: '#6b7280', strokeWidth: 2 }; // Default gray
  let edgeLabel = '';

  // Determine style based on source/target pair
  if (sourceType === 'tool' && targetType === 'agent') {
    edgeStyle = { stroke: '#8b5cf6', strokeWidth: 2.5 }; // Purple for tool-agent
    edgeLabel = 'Provides Tool';
  } else if (sourceType === 'agent' && targetType === 'tool') {
    edgeStyle = { stroke: '#8b5cf6', strokeWidth: 2.5 }; // Purple for agent-tool
    edgeLabel = 'Uses Tool';
  } else if (sourceType === 'model' && targetType === 'agent') {
    edgeStyle = { stroke: '#8b5cf6', strokeWidth: 2.5 }; // Purple for model-agent
    edgeLabel = 'Powers Agent';
  } else if (sourceType === 'agent' && targetType === 'model') {
    edgeStyle = { stroke: '#8b5cf6', strokeWidth: 2.5 }; // Purple for agent-model
    edgeLabel = 'Uses Model';
  } else if (sourceType === 'agent' && targetType === 'agent') {
    edgeStyle = { stroke: '#6366f1', strokeWidth: 2.5 }; // Indigo for agent-agent
    edgeLabel = 'Communicates With';
  }

  return { edgeStyle, edgeLabel };
};

// Templates for quick start - using imported templates from templates.fixed.ts
const templates = fixedTemplates;

// Additional templates (these should be moved to templates.fixed.ts)
const additionalTemplates = [
  {
    id: 'hierarchical',
    name: 'Hierarchical Decomposition Agent',
    description: 'Complex task decomposition with hierarchical agent structure',
    nodes: [
      {
        id: 'coordinator-agent',
        type: 'agent',
        position: { x: 250, y: 50 },
        data: {
          label: 'Coordinator Agent',
          capabilities: 'Task Decomposition & Coordination',
          instruction: `You are a coordinator agent responsible for breaking down complex tasks into subtasks.
1. Analyze the main task and break it into smaller, manageable subtasks
2. Delegate subtasks to appropriate specialized agents
3. Synthesize results from sub-agents into a final response`,
          goal: 'Decompose and coordinate complex tasks',
          agentModel: 'gemini-2.0-pro-exp',
          description: 'Manages task decomposition and coordination'
        }
      },
      {
        id: 'research-agent',
        type: 'agent',
        position: { x: 100, y: 200 },
        data: {
          label: 'Research Agent',
          capabilities: 'Information Gathering',
          instruction: 'Gather and analyze information from various sources to support task completion',
          goal: 'Collect relevant information',
          agentModel: 'gemini-2.0-flash-exp'
        }
      },
      {
        id: 'planning-agent',
        type: 'agent',
        position: { x: 250, y: 200 },
        data: {
          label: 'Planning Agent',
          capabilities: 'Strategy Development',
          instruction: 'Create detailed execution plans based on research findings',
          goal: 'Develop action plans',
          agentModel: 'gemini-2.0-pro-exp'
        }
      },
      {
        id: 'execution-agent',
        type: 'agent',
        position: { x: 400, y: 200 },
        data: {
          label: 'Execution Agent',
          capabilities: 'Task Execution',
          instruction: 'Execute planned tasks and provide progress updates',
          goal: 'Implement planned actions',
          agentModel: 'gemini-2.0-flash-exp'
        }
      }
    ],
    edges: [
      // Connect sub-agents to coordinator
      {
        id: 'edge-1',
        source: 'research-agent',
        target: 'coordinator-agent',
        animated: true,
        label: 'Reports to',
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      },
      {
        id: 'edge-2',
        source: 'planning-agent',
        target: 'coordinator-agent',
        animated: true,
        label: 'Reports to',
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      },
      {
        id: 'edge-3',
        source: 'execution-agent',
        target: 'coordinator-agent',
        animated: true,
        label: 'Reports to',
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }
    ]
  },

  {
    id: 'parallel-fanout',
    name: 'Parallel Fanout Agent',
    description: 'Execute multiple tasks in parallel for improved efficiency',
    nodes: [
      {
        id: 'dispatcher-agent',
        type: 'agent',
        position: { x: 250, y: 50 },
        data: {
          label: 'Dispatcher Agent',
          capabilities: 'Task Distribution',
          instruction: 'Distribute tasks to worker agents for parallel processing',
          goal: 'Efficiently distribute workload',
          agentModel: 'gemini-2.0-pro-exp'
        }
      },
      // Add multiple worker agents
      ...[1, 2, 3].map(i => ({
        id: `worker-${i}`,
        type: 'agent',
        position: { x: 100 + (i-1)*150, y: 200 },
        data: {
          label: `Worker Agent ${i}`,
          capabilities: 'Task Processing',
          instruction: 'Process assigned tasks independently',
          goal: 'Execute assigned tasks',
          agentModel: 'gemini-2.0-flash-exp'
        }
      }))
    ],
    edges: [
      // Connect workers to dispatcher
      ...[1, 2, 3].map(i => ({
        id: `edge-${i}`,
        source: `worker-${i}`,
        target: 'dispatcher-agent',
        animated: true,
        label: 'Reports to',
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }))
    ]
  },

  {
    id: 'generator-critic',
    name: 'Generator-Critic Pattern',
    description: 'Two-stage pattern with generation and validation',
    nodes: [
      {
        id: 'generator-agent',
        type: 'agent',
        position: { x: 150, y: 150 },
        data: {
          label: 'Generator Agent',
          capabilities: 'Content Generation',
          instruction: 'Generate initial content or solutions for given tasks',
          goal: 'Create initial outputs',
          agentModel: 'gemini-2.0-pro-exp'
        }
      },
      {
        id: 'critic-agent',
        type: 'agent',
        position: { x: 350, y: 150 },
        data: {
          label: 'Critic Agent',
          capabilities: 'Content Validation',
          instruction: 'Review and validate generated content, provide feedback',
          goal: 'Ensure quality and accuracy',
          agentModel: 'gemini-2.0-pro-exp'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'generator-agent',
        target: 'critic-agent',
        animated: true,
        label: 'Submits for review',
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }
    ]
  },

  {
    id: 'human-in-the-loop',
    name: 'Human-in-the-Loop Agent',
    description: 'Agent system with human oversight and intervention',
    nodes: [
      {
        id: 'main-agent',
        type: 'agent',
        position: { x: 250, y: 100 },
        data: {
          label: 'Main Agent',
          capabilities: 'Task Processing with Human Oversight',
          instruction: 'Process tasks and request human approval when needed',
          goal: 'Safe and validated execution',
          agentModel: 'gemini-2.0-pro-exp'
        }
      },
      {
        id: 'human-interface',
        type: 'tool',
        position: { x: 250, y: 250 },
        data: {
          label: 'Human Interface',
          tool_type: 'long-running',
          input_type: 'Approval Request',
          description: 'Interface for human review and approval'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'human-interface',
        target: 'main-agent',
        animated: true,
        label: 'Approval Flow',
        style: { stroke: '#10b981', strokeWidth: 2 }
      }
    ]
  },

  {
    id: 'iterative-refinement',
    name: 'Iterative Refinement Agent',
    description: 'Progressive improvement through multiple iterations',
    nodes: [
      {
        id: 'controller-agent',
        type: 'agent',
        position: { x: 250, y: 50 },
        data: {
          label: 'Controller Agent',
          capabilities: 'Iteration Management',
          instruction: 'Manage the iterative refinement process',
          goal: 'Achieve optimal solution through iterations',
          agentModel: 'gemini-2.0-pro-exp'
        }
      },
      {
        id: 'refiner-agent',
        type: 'agent',
        position: { x: 250, y: 200 },
        data: {
          label: 'Refiner Agent',
          capabilities: 'Solution Refinement',
          instruction: 'Improve solutions based on feedback',
          goal: 'Enhance solution quality',
          agentModel: 'gemini-2.0-pro-exp'
        }
      },
      {
        id: 'evaluator-agent',
        type: 'agent',
        position: { x: 400, y: 200 },
        data: {
          label: 'Evaluator Agent',
          capabilities: 'Quality Assessment',
          instruction: 'Evaluate solution quality and provide feedback',
          goal: 'Assess improvement needs',
          agentModel: 'gemini-2.0-pro-exp'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'refiner-agent',
        target: 'controller-agent',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      },
      {
        id: 'edge-2',
        source: 'evaluator-agent',
        target: 'controller-agent',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }
    ]
  }
];

// Add a new array of PydanticAI templates right after the Google ADK templates
// Templates for PydanticAI quick start - using imported templates from templates.fixed.ts
const pydanticTemplates = fixedPydanticTemplates;

// Additional PydanticAI templates (these should be moved to templates.fixed.ts)
const additionalPydanticTemplates = [
  {
    id: 'pydantic-simple-agent',
    name: 'Simple PydanticAI Agent',
    description: 'A basic PydanticAI agent with structured output',
    nodes: [
      {
        id: 'agent-1',
        type: 'agent',
        position: { x: 250, y: 150 },
        data: {
          label: 'Simple Agent',
          capabilities: 'Structured Output',
          instruction: 'You are a helpful assistant built with PydanticAI. Provide helpful, accurate, and concise responses.',
          goal: 'Give clear, structured responses to user queries',
          agentModel: 'openai:gpt-4o',
          description: 'A PydanticAI agent with structured output validation'
        }
      },
      {
        id: 'tool-1',
        type: 'tool',
        position: { x: 100, y: 300 },
        data: {
          label: 'Calculator Tool',
          input_type: 'Mathematical Expression',
          tool_type: 'code-execution',
          description: 'Performs calculations on mathematical expressions'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'tool-1',
        target: 'agent-1',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }
    ]
  },
  {
    id: 'pydantic-bank-support',
    name: 'Bank Support Agent',
    description: 'Bank support agent with dependency injection',
    nodes: [
      {
        id: 'support-agent',
        type: 'agent',
        position: { x: 250, y: 100 },
        data: {
          label: 'Support Agent',
          capabilities: 'Customer Support',
          instruction: 'You are a support agent for our bank. Help customers with their queries and assess risk levels for each interaction.',
          goal: 'Provide customer support and risk assessment',
          agentModel: 'openai:gpt-4o',
          description: 'Bank support agent with risk assessment capabilities'
        }
      },
      {
        id: 'balance-tool',
        type: 'tool',
        position: { x: 100, y: 250 },
        data: {
          label: 'Balance Checker',
          input_type: 'Account Query',
          description: 'Retrieves customer account balance'
        }
      },
      {
        id: 'transaction-tool',
        type: 'tool',
        position: { x: 400, y: 250 },
        data: {
          label: 'Transaction History',
          input_type: 'Date Range',
          description: 'Gets transaction history for a date range'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'balance-tool',
        target: 'support-agent',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      },
      {
        id: 'edge-2',
        source: 'transaction-tool',
        target: 'support-agent',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }
    ]
  },
  {
    id: 'pydantic-rag',
    name: 'PydanticAI RAG Agent',
    description: 'Retrieval-Augmented Generation with PydanticAI',
    nodes: [
      {
        id: 'rag-agent',
        type: 'agent',
        position: { x: 250, y: 100 },
        data: {
          label: 'RAG Agent',
          capabilities: 'Knowledge Retrieval',
          instruction: 'You are a document retrieval agent that answers questions based on the retrieved context. Always cite your sources.',
          goal: 'Answer questions using retrieved context',
          agentModel: 'anthropic:claude-3-sonnet',
          description: 'Retrieval-augmented generation agent'
        }
      },
      {
        id: 'retrieval-tool',
        type: 'tool',
        position: { x: 250, y: 250 },
        data: {
          label: 'Document Retriever',
          tool_type: 'rag',
          input_type: 'Query String',
          description: 'Retrieves relevant document chunks from a vector database'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'retrieval-tool',
        target: 'rag-agent',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }
    ]
  },
  {
    id: 'pydantic-multi-agent',
    name: 'PydanticAI Multi-Agent System',
    description: 'Multiple specialized agents with type-safe communication',
    nodes: [
      {
        id: 'coordinator',
        type: 'agent',
        position: { x: 250, y: 50 },
        data: {
          label: 'Coordinator Agent',
          capabilities: 'Task Distribution',
          instruction: 'You are a coordinator agent responsible for breaking down tasks and delegating to specialized agents. Synthesize their responses into a cohesive answer.',
          goal: 'Coordinate multi-agent execution',
          agentModel: 'openai:gpt-4o',
          description: 'Manages task distribution with type-safe communication'
        }
      },
      {
        id: 'research-agent',
        type: 'agent',
        position: { x: 100, y: 200 },
        data: {
          label: 'Research Agent',
          capabilities: 'Information Gathering',
          instruction: 'Gather information from various sources to answer queries. Focus on facts and reliable data.',
          goal: 'Find relevant information',
          agentModel: 'anthropic:claude-3-sonnet'
        }
      },
      {
        id: 'writing-agent',
        type: 'agent',
        position: { x: 400, y: 200 },
        data: {
          label: 'Writing Agent',
          capabilities: 'Content Creation',
          instruction: 'Create well-written responses based on the provided information. Be clear, concise, and engaging.',
          goal: 'Generate quality content',
          agentModel: 'openai:gpt-4o'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'research-agent',
        target: 'coordinator',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      },
      {
        id: 'edge-2',
        source: 'writing-agent',
        target: 'coordinator',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }
    ]
  },
  {
    id: 'pydantic-streaming',
    name: 'PydanticAI Streaming Agent',
    description: 'Agent with streaming output and validation',
    nodes: [
      {
        id: 'stream-agent',
        type: 'agent',
        position: { x: 250, y: 150 },
        data: {
          label: 'Streaming Agent',
          capabilities: 'Real-time Output',
          instruction: 'You are a streaming agent that provides real-time responses with continuous validation.',
          goal: 'Deliver continuously validated streaming responses',
          agentModel: 'anthropic:claude-3-opus',
          description: 'Agent with streaming output and continuous validation'
        }
      },
      {
        id: 'web-search-tool',
        type: 'tool',
        position: { x: 250, y: 300 },
        data: {
          label: 'Web Search',
          input_type: 'Search Query',
          tool_type: 'google-search',
          description: 'Searches the web for up-to-date information'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'web-search-tool',
        target: 'stream-agent',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }
    ]
  }
];

// Using imported generateFlowCode from utils/generateFlowCode.ts
// This function is imported from utils/generateFlowCode.ts
// Commenting out the local implementation to use the imported one
/*
const generateFlowCode = (nodes: Node<NodeData>[], edges: Edge[]): string => {
  if (nodes.length === 0) return '// Add nodes to generate code';

  // Helper to sanitize names for variable naming
  const sanitizeName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Start the code with imports and setup
  let code = `// Generated Agent SDK Flow
import { Agent, Tool, Model } from '@google-labs/agent-sdk';

// Initialize components
`;

  // Generate code for each node
  const nodeVariables: Record<string, string> = {};

  // First pass: Define all nodes
  nodes.forEach(node => {
    const sanitizedName = sanitizeName(node.data.label || node.id);
    const varName = `${node.type}_${sanitizedName}`;
    nodeVariables[node.id] = varName;

    switch (node.type) {
      case 'agent':
        code += `const ${varName} = new Agent({
  name: "${node.data.label}",
  model: "${node.data.agentModel || 'gemini-2.0-flash-exp'}",
  description: "${node.data.description || 'An agent created in the flow editor'}"
});\n\n`;
        break;

      case 'tool':
        let toolSetup = '';
        if (node.data.tool_type === 'google-search') {
          toolSetup = `
  async execute(input) {
    // Simulated Google search implementation
    console.log("Searching for:", input);
    return { results: [
      { title: "Search result 1 for " + input, snippet: "This is a simulated search result" },
      { title: "Search result 2 for " + input, snippet: "This is another simulated result" }
    ]};
  }`;
        } else if (node.data.tool_type === 'rag') {
          toolSetup = `
  async execute(input) {
    // Simulated RAG implementation
    console.log("RAG query:", input);
    return { context: "This is retrieved context based on: " + input };
  }`;
        } else if (node.data.tool_type === 'code-execution') {
          toolSetup = `
  async execute(code) {
    // Simulated code execution (in production, use appropriate sandboxing)
    console.log("Executing code:", code);
    try {
      // In a real implementation, this would be properly sandboxed
      return { result: "Code execution result would appear here" };
    } catch (error) {
      return { error: error.message };
    }
  }`;
        } else {
          toolSetup = `
  async execute(input) {
    // Tool implementation
    console.log("Tool received input:", input);
    return { result: "Processed: " + input };
  }`;
        }

        code += `const ${varName} = new Tool({
  name: "${node.data.label}",
  description: "${node.data.description || 'A tool created in the flow editor'}"
});

// Tool implementation
${varName}.setExecuteFn(${toolSetup});\n\n`;
        break;

      case 'model':
        code += `const ${varName} = new Model({
  name: "${node.data.label}",
  provider: "google",
  model: "${node.data.model || 'gemini-2.0-flash-exp'}"
});\n\n`;
        break;
    }
  });

  // Second pass: Connect the nodes
  if (edges.length > 0) {
    code += "// Connect components\n";
    edges.forEach(edge => {
      const sourceVar = nodeVariables[edge.source];
      const targetVar = nodeVariables[edge.target];

      if (sourceVar && targetVar) {
        // Find source and target node types
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
          if (sourceNode.type === 'agent' && targetNode.type === 'agent') {
            code += `${sourceVar}.connectAgent(${targetVar}); // Agent to agent connection\n`;
          } else if (sourceNode.type === 'tool' && targetNode.type === 'agent') {
            code += `${targetVar}.addTool(${sourceVar}); // Tool to agent connection\n`;
          } else if (sourceNode.type === 'model' && targetNode.type === 'agent') {
            code += `${targetVar}.setModel(${sourceVar}); // Model to agent connection\n`;
          } else if (sourceNode.type === 'agent' && targetNode.type === 'tool') {
            code += `${sourceVar}.addTool(${targetVar}); // Agent to tool connection\n`;
          }
        }
      }
    });
    code += "\n";
  }

  // Add root_agent export to match the import in __init__.py
  const agentVars = Object.entries(nodeVariables)
    .filter(([nodeId]) => nodes.find(n => n.id === nodeId)?.type === 'agent')
    .map((entry) => entry[1]);

  if (agentVars.length > 0) {
    const primaryAgent = agentVars[0];
    code += `// Export the primary agent as root_agent for __init__.py import
const root_agent = ${primaryAgent};

`;
  }

  if (agentVars.length > 0) {
    const primaryAgent = agentVars[0];
    code += `// Example usage
async function main() {
  try {
    const result = await ${primaryAgent}.execute("What tasks can you help me with?");
    console.log("Result:", result);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Uncomment to run the agent
// main();
`;
  }

  return code;
};
*/

// Add the generatePydanticFlowCode function after the original generateFlowCode
// Generate PydanticAI flow code based on nodes and edges
const generatePydanticFlowCode = (nodes: Node<NodeData>[], edges: Edge[]): string => {
  if (nodes.length === 0) return '# Add nodes to generate PydanticAI code';

  // Helper to sanitize names for variable naming
  const sanitizeName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Start the code with imports and setup
  let code = `# Generated PydanticAI Flow
from typing import List, Dict, Any, Optional, TypeVar, Annotated
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext

import logfire
# Configure logging with Pydantic Logfire for monitoring
logfire.configure()

`;

  // Generate code for each node
  const nodeVariables: Record<string, string> = {};
  const agentNodes = nodes.filter(node => node.type === 'agent');
  const toolNodes = nodes.filter(node => node.type === 'tool');
  // We'll keep this commented as it's not currently used
  // const modelNodes = nodes.filter(node => node.type === 'model');

  // Create a dependencies class for dependency injection
  code += `# Define dependency types
class Dependencies(BaseModel):
    """Dependencies for the agent system"""
    api_key: Optional[str] = Field(None, description="API key for external services")
    database_url: Optional[str] = Field(None, description="Database connection URL")

`;

  // Add a structured result model for agent responses
  if (agentNodes.length > 0) {
    code += `# Define structured response model
class Result(BaseModel):
    """Result model for agent responses"""
    response: str = Field(description="The agent's response")
    confidence: Optional[float] = Field(None, description="Confidence score of the response", ge=0, le=1)
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

`;
  }

  // Generate agent nodes
  agentNodes.forEach(node => {
    const sanitizedName = sanitizeName(node.data.label || node.id);
    const varName = `${sanitizedName}_agent`;
    nodeVariables[node.id] = varName;

    // Generate agent code with proper model definition
    const modelString = node.data.agentModel || 'openai:gpt-4o';
    code += `# ${node.data.label} agent definition
${varName} = Agent(
    '${modelString}',
    deps_type=Dependencies,
    result_type=Result,
    system_prompt="""${node.data.instruction || `You are ${node.data.label}, a helpful assistant.`}
${node.data.goal ? `Your goal is to ${node.data.goal}` : ''}""",
    instrument=True  # Enable Pydantic Logfire instrumentation
)

`;
  });

  // Generate tool nodes
  toolNodes.forEach(node => {
    const sanitizedName = sanitizeName(node.data.label || node.id);
    // Find connected agent to attach this tool to
    const connectedAgentVar = findConnectedAgentVariable(node, nodes, edges, nodeVariables);

    // Generate tool code with proper PydanticAI patterns
    code += `# ${node.data.label} tool definition
@${connectedAgentVar}.tool
async def ${sanitizedName}(ctx: RunContext[Dependencies], query: str) -> Dict[str, Any]:
    """${node.data.description || `${node.data.label} implementation`}"""
`;

    // Add tool-specific implementations based on tool type
    if (node.data.tool_type === 'google-search') {
      code += `    # Web search implementation
    print(f"Searching for: {query}")
    # In a real implementation, you would use a search API
    # Example: if ctx.deps.api_key is None: raise ValueError("API key is required")

    return {
        "results": [
            {"title": f"Result 1 for {query}", "snippet": "This is a search result"},
            {"title": f"Result 2 for {query}", "snippet": "This is another result"}
        ]
    }
`;
    } else if (node.data.tool_type === 'rag') {
      code += `    # RAG implementation
    print(f"Processing RAG query: {query}")
    # In a real implementation, you would retrieve from a vector database

    return {
        "documents": [
            {"content": f"Document content related to {query}", "metadata": {"source": "knowledge_base"}},
            {"content": f"Additional information about {query}", "metadata": {"source": "wiki"}}
        ],
        "context": f"Synthesized context about {query}"
    }
`;
    } else if (node.data.tool_type === 'code-execution') {
      code += `    # Calculator/code execution implementation
    print(f"Calculating: {query}")
    try:
        # In a real implementation, this should be properly sandboxed
        if "+" in query or "-" in query or "*" in query or "/" in query:
            safe_calculation = query.replace(" ", "")
            # Simple security check - only allow basic math operations
            if all(c.isdigit() or c in "+-*/(). " for c in safe_calculation):
                result = eval(safe_calculation)
                return {"result": f"{result}"}
        return {"result": "Could not perform calculation safely"}
    except Exception as e:
        return {"error": str(e)}
`;
    } else if (node.data.tool_type === 'api') {
      code += `    # API connector implementation
    print(f"Calling API with query: {query}")
    # Access dependencies through the context
    if ctx.deps.api_key is None:
        return {"error": "API key not provided in dependencies"}

    # Simulate API call
    return {
        "status": "success",
        "data": {
            "query": query,
            "timestamp": "2023-07-22T15:30:45Z",
            "result": f"API response for {query}"
        }
    }
`;
    } else {
      code += `    # Generic tool implementation
    print(f"Processing input: {query}")\n    return {"result": f"Processed: {query}"}`;
    }

    code += `
`;
  });

  // Add dynamic system prompts for agents based on available tools
  agentNodes.forEach(node => {
    const agentVar = nodeVariables[node.id];
    const connectedTools = findConnectedTools(node, nodes, edges);

    if (connectedTools.length > 0) {
      code += `# Add dynamic system prompt for ${node.data.label} based on available tools
@${agentVar}.system_prompt
async def ${sanitizeName(node.data.label || node.id)}_capabilities(ctx: RunContext[Dependencies]) -> str:
    """Dynamic system prompt that provides information about available tools"""
    return '''You have access to the following tools:
${connectedTools.map(tool => `- ${tool.data.label}: ${tool.data.description || 'A tool'}`).join('\n')}
'''

`;
    }
  });

  // For multi-agent systems, add inter-agent communication
  if (agentNodes.length > 1) {
    // Add a section for agent communication with Pydantic models
    code += `# Agent communication setup for multi-agent system
class AgentMessage(BaseModel):
    """Message format for inter-agent communication"""
    content: str = Field(description="The message content")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Message metadata")
    sender: str = Field(description="The sending agent's identifier")

`;

    // Find connected agents
    const agentConnections = edges.filter(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      return sourceNode?.type === 'agent' && targetNode?.type === 'agent';
    });

    if (agentConnections.length > 0) {
      // For each agent connection, add agent-to-agent communication tools
      agentConnections.forEach(connection => {
        const sourceAgent = nodes.find(n => n.id === connection.source);
        const targetAgent = nodes.find(n => n.id === connection.target);

        if (sourceAgent && targetAgent) {
          const sourceVar = nodeVariables[sourceAgent.id];
          const targetName = sanitizeName(targetAgent.data.label || targetAgent.id);
          // Comment out unused variable
          // const targetVar = nodeVariables[targetAgent.id];

          code += `# Communication from ${sourceAgent.data.label} to ${targetAgent.data.label}
@${sourceVar}.tool
async def send_to_${targetName}(ctx: RunContext[Dependencies], message: str) -> Dict[str, Any]:
    """Send a message to the ${targetAgent.data.label}"""
    print(f"Sending message to ${targetAgent.data.label}: {message}")
    # In a real implementation, you would implement proper message passing

    # Create a structured message
    msg = AgentMessage(
        content=message,
        metadata={"timestamp": "2023-07-22T15:30:45Z"},
        sender="${sourceAgent.data.label}"
    )

    return {"status": "sent", "recipient": "${targetAgent.data.label}", "message_id": "msg_12345"}

`;
        }
      });
    }
  }

  // Add root_agent export to match the import in __init__.py
  if (agentNodes.length > 0) {
    const primaryAgent = nodeVariables[agentNodes[0].id];
    code += `# Export the primary agent as root_agent for __init__.py import
root_agent = ${primaryAgent}

`;

    // For multi-agent systems, create a more advanced main function
    if (agentNodes.length > 1) {
      // Find the coordinator agent (usually the one with the most connections)
      const agentConnectionCounts = agentNodes.map(node => {
        const connections = edges.filter(edge =>
          edge.source === node.id || edge.target === node.id
        ).length;
        return { node, connections };
      });

      // Sort by connection count (descending)
      agentConnectionCounts.sort((a, b) => b.connections - a.connections);

      // Use the agent with most connections as coordinator, or the first one if tied
      const coordinatorAgent = nodeVariables[agentConnectionCounts[0].node.id];
      const coordinatorName = agentConnectionCounts[0].node.data.label;

      code += `async def run_multi_agent_system():
    """Run the multi-agent system with ${coordinatorName} as coordinator"""
    # Initialize dependencies
    deps = Dependencies(
        api_key="your_api_key_here",
        database_url="sqlite:///example.db"
    )

    print("Starting multi-agent system with ${coordinatorName} as coordinator...")

    # Run the coordinator agent
    result = await ${coordinatorAgent}.run(
        "Coordinate with other agents to solve: What are the current trends in AI and how might they affect the economy?",
        deps=deps
    )

    print(f"Multi-agent result: {result}")
    return result

async def main():
    """Main function to run the agent system"""
    # Initialize dependencies
    deps = Dependencies(
        api_key="your_api_key_here",
        database_url="sqlite:///example.db"
    )

    # For simple queries, you can use any agent directly
    print("Running single agent query...")
    result = await ${primaryAgent}.run("What can you help me with?", deps=deps)
    print(f"Single agent result: {result}")

    # For complex tasks, use the multi-agent system
    await run_multi_agent_system()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
`;
    } else {
      // Simple main function for single agent
      code += `async def main():
    """Main function to run the agent system"""
    # Initialize dependencies
    deps = Dependencies(
        api_key="your_api_key_here",
        database_url="sqlite:///example.db"
    )

    # Run the primary agent
    print(f"Running ${agentNodes[0].data.label}...")
    result = await ${primaryAgent}.run("What can you help me with?", deps=deps)
    print(f"Result: {result}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
`;
    }
  }

  return code;
};

// Helper function to find the agent variable connected to a tool
function findConnectedAgentVariable(
  toolNode: Node<NodeData>,
  nodes: Node<NodeData>[],
  edges: Edge[],
  nodeVariables: Record<string, string>
): string {
  // Look for edges connecting this tool to an agent
  const connectedAgentEdge = edges.find(edge =>
    (edge.source === toolNode.id || edge.target === toolNode.id) &&
    (nodes.find(n => n.id === (edge.source === toolNode.id ? edge.target : edge.source))?.type === 'agent')
  );

  if (connectedAgentEdge) {
    const agentNodeId = connectedAgentEdge.source === toolNode.id ? connectedAgentEdge.target : connectedAgentEdge.source;
    return nodeVariables[agentNodeId] || 'agent';
  }

  // If no connected agent found, return the first agent or a default
  const firstAgentNode = nodes.find(node => node.type === 'agent');
  return firstAgentNode ? nodeVariables[firstAgentNode.id] : 'agent';
}

// Helper function to find tools connected to an agent
function findConnectedTools(
  agentNode: Node<NodeData>,
  nodes: Node<NodeData>[],
  edges: Edge[]
): Node<NodeData>[] {
  // Find all edges connected to this agent
  const connectedEdges = edges.filter(edge =>
    edge.source === agentNode.id || edge.target === agentNode.id
  );

  // Extract tool nodes from these connections
  const toolNodes: Node<NodeData>[] = [];

  connectedEdges.forEach(edge => {
    const otherNodeId = edge.source === agentNode.id ? edge.target : edge.source;
    const otherNode = nodes.find(n => n.id === otherNodeId);

    if (otherNode && otherNode.type === 'tool') {
      toolNodes.push(otherNode);
    }
  });

  return toolNodes;
}

// Confirmation Dialog Component
const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-white/10 rounded-lg shadow-xl p-6 w-96 animate-fadeIn">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-md transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// FlowEditor component to manage the overall flow editor and its state
const FlowEditor = ({ activeProjectId, projectData, onProjectDataChange, onRunAgent, onGoToProjects }: {
    activeProjectId: string;
    projectData: ProjectData;
    onRunAgent?: () => Promise<void>;
    onProjectDataChange: (data: ProjectData) => void;
    onGoToProjects: () => void;
}) => {
  // State for dialogs
  const [showRunAgentDialog, setShowRunAgentDialog] = useState<boolean>(false);
  // Use state derived from props for nodes, edges, code
  const [nodes, setNodes] = useState<Node<NodeData>[]>(projectData.nodes);
  const [edges, setEdges] = useState<Edge[]>(projectData.edges);
  const [code, setCode] = useState<string>('// Add nodes to generate code');
  const [framework, setFramework] = useState<'google-adk' | 'pydantic-ai'>(projectData.framework || 'pydantic-ai'); // Default to pydantic-ai but use project setting if available

  // Framework-specific canvases stored in local storage
  const [frameworkCanvases, setFrameworkCanvases] = useState<{
    'google-adk': { nodes: Node<NodeData>[]; edges: Edge[] };
    'pydantic-ai': { nodes: Node<NodeData>[]; edges: Edge[] };
  }>(() => {
    // Default empty canvases
    const defaultCanvases = {
      'google-adk': { nodes: [], edges: [] },
      'pydantic-ai': { nodes: [], edges: [] }
    };

    // If no active project, return defaults
    if (!activeProjectId) return defaultCanvases;

    // Try to load from localStorage first
    const savedCanvases = localStorage.getItem(`${PROJECT_DATA_PREFIX}${activeProjectId}-canvases`);
    if (savedCanvases) {
      try {
        return JSON.parse(savedCanvases);
      } catch (e) {
        console.error('Failed to parse saved canvases:', e);
      }
    }

    return defaultCanvases;
  });

  // Dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFramework, setPendingFramework] = useState<'google-adk' | 'pydantic-ai' | null>(null);

  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'templates' | 'settings'>('editor');
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);


  // Define generateCode before it's used in useEffect
  // Generate code based on the current flow
  const generateCode = useCallback(() => {
    if (framework === 'google-adk') {
      setCode(generateFlowCode(nodes, edges));
    } else {
      setCode(generatePydanticFlowCode(nodes, edges));
    }
  }, [nodes, edges, framework]);

  // Handle framework switching with confirmation dialog
  const handleFrameworkSwitch = (newFramework: 'google-adk' | 'pydantic-ai') => {
    // If already on the selected framework, do nothing
    if (newFramework === framework) return;

    // Check if there are unsaved changes by comparing current nodes/edges with saved ones
    const hasChanges = nodes.length > 0 || edges.length > 0;

    if (hasChanges) {
      // Show confirmation dialog
      setShowConfirmDialog(true);
      setPendingFramework(newFramework);
    } else {
      // No changes, switch directly
      switchFramework(newFramework);
    }
  };

  // Function to actually perform the framework switch
  const switchFramework = (newFramework: 'google-adk' | 'pydantic-ai') => {
    // Save current canvas to frameworkCanvases
    const updatedCanvases = {
      ...frameworkCanvases,
      [framework]: { nodes, edges }
    };

    // Save to localStorage
    localStorage.setItem(
      `${PROJECT_DATA_PREFIX}${activeProjectId}-canvases`,
      JSON.stringify(updatedCanvases)
    );

    // Load the canvas for the new framework
    const newFrameworkCanvas = updatedCanvases[newFramework];

    // Update state with the new framework's canvas
    setNodes(newFrameworkCanvas.nodes);
    setEdges(newFrameworkCanvas.edges);
    setFramework(newFramework);

    // Reset selection
    setSelectedNode(null);

    // Close dialog if open
    setShowConfirmDialog(false);
    setPendingFramework(null);

    // Show notification
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50`;
    notification.innerHTML = `
      <div class="flex items-center">
        <svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM3.707 5.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
        </svg>
        <p>Switched to <strong>${newFramework === 'google-adk' ? 'Google ADK' : 'PydanticAI'}</strong> framework.</p>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  };

  // Handle confirmation dialog actions
  const handleConfirmSwitch = () => {
    if (pendingFramework) {
      switchFramework(pendingFramework);
    }
  };

  const handleCancelSwitch = () => {
    setShowConfirmDialog(false);
    setPendingFramework(null);
  };

  // Update internal state when project data changes from parent (e.g., loading a new project)
  useEffect(() => {
    // Initialize framework canvases from project data
    const initialCanvases: {
      'google-adk': { nodes: Node<NodeData>[]; edges: Edge[] };
      'pydantic-ai': { nodes: Node<NodeData>[]; edges: Edge[] };
    } = {
      'google-adk': { nodes: [], edges: [] },
      'pydantic-ai': { nodes: [], edges: [] }
    };

    // Set the current framework's canvas to the project data
    const currentFramework = projectData.framework || 'pydantic-ai';
    initialCanvases[currentFramework] = {
      nodes: projectData.nodes,
      edges: projectData.edges
    };

    // Try to load saved canvases from localStorage
    const savedCanvases = localStorage.getItem(`${PROJECT_DATA_PREFIX}${activeProjectId}-canvases`);
    if (savedCanvases) {
      try {
        const parsedCanvases = JSON.parse(savedCanvases);
        // Merge with initial canvases, prioritizing saved data
        setFrameworkCanvases({
          ...initialCanvases,
          ...parsedCanvases
        });

        // Load the current framework's canvas
        setNodes(parsedCanvases[currentFramework]?.nodes || projectData.nodes);
        setEdges(parsedCanvases[currentFramework]?.edges || projectData.edges);
      } catch (e) {
        console.error('Failed to parse saved canvases:', e);
        // Fallback to project data
        setFrameworkCanvases(initialCanvases);
        setNodes(projectData.nodes);
        setEdges(projectData.edges);
      }
    } else {
      // No saved canvases, use project data
      setFrameworkCanvases(initialCanvases);
      setNodes(projectData.nodes);
      setEdges(projectData.edges);
    }

    setCode(projectData.code || `# Write your Python code here
print("Hello, World!")`);
    // Reset selection when project changes
    setSelectedNode(null);
  }, [projectData, activeProjectId]); // Depend on activeProjectId to ensure reset on project switch

  // Regenerate code when framework changes
  useEffect(() => {
    if (nodes.length > 0) {
      generateCode();
    }
  }, [framework, generateCode, nodes.length]);





  // Debounced save function
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveCurrentProjectData = useCallback(() => {
      if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
          console.log("Saving project data for:", activeProjectId);

          // Update framework canvases with current state
          const updatedCanvases = {
              ...frameworkCanvases,
              [framework]: { nodes, edges }
          };

          // Save framework canvases to localStorage
          localStorage.setItem(
              `${PROJECT_DATA_PREFIX}${activeProjectId}-canvases`,
              JSON.stringify(updatedCanvases)
          );

          // Ensure we're passing all required ProjectData properties
          onProjectDataChange({
              ...projectData, // Keep existing project metadata
              nodes,
              edges,
              code,
              framework // Save the current framework setting
          });
      }, 1000); // Debounce saves by 1 second
  }, [nodes, edges, code, framework, frameworkCanvases, onProjectDataChange, activeProjectId, projectData]);

  // Trigger save whenever nodes, edges, or code changes
  useEffect(() => {
      saveCurrentProjectData();
      // Cleanup timeout on unmount or when dependencies change
      return () => {
          if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
          }
      };
  }, [nodes, edges, code, saveCurrentProjectData]);



  // Load template function - modifies the current state
  const loadTemplate = (templateId: string) => {
    // Look in the appropriate template collection based on current framework
    const templateCollection = framework === 'google-adk' ? templates : pydanticTemplates;
    const template = templateCollection.find(t => t.id === templateId);

    if (template) {
      // Update state directly, which will trigger the save useEffect
      setNodes(template.nodes as Node<NodeData>[]);

      // Ensure all edges are properly created with correct styling
      const styledEdges = template.edges.map(edge => {
        // Find source and target nodes to determine proper styling
        const sourceNode = template.nodes.find(n => n.id === edge.source);
        const targetNode = template.nodes.find(n => n.id === edge.target);

        // Get edge style and label using the utility function
        let { edgeStyle, edgeLabel } = sourceNode && targetNode
          ? getEdgeStyleAndLabel(sourceNode.type, targetNode.type)
          : { edgeStyle: { stroke: '#6b7280', strokeWidth: 2 }, edgeLabel: '' };

        // Get edge type if it exists
        const edgeType = 'type' in edge && typeof edge.type === 'string' ? edge.type : 'smoothstep';

        // Get marker end if it exists
        const markerEnd = 'markerEnd' in edge ? edge.markerEnd : { type: 'arrow' };

        // Return edge with proper styling
        return {
          ...edge,
          animated: true,
          style: 'style' in edge ? edge.style : edgeStyle,
          label: edgeLabel,
          type: edgeType,
          markerEnd: markerEnd
        } as Edge;
      });

      setEdges(styledEdges);
      setActiveTab('editor');

      // Automatically generate appropriate code for the template
      setTimeout(() => {
        generateCode();
      }, 100);

      // Show a notification that template is loaded and can be edited
      // This could be implemented with a simple timeout-based notification
      const notification = document.createElement('div');
      notification.className = `fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50`;
      notification.innerHTML = `
        <div class="flex items-center">
          <svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM3.707 5.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
          </svg>
          <p><strong>${template.name}</strong> template loaded with ${styledEdges.length} connections. Select any node to edit its properties.</p>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
      }, 3000);
    }
  };

  // This function is handled by the useCallback version below



  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  // Context value for sharing flow data *within the editor* if needed by children
  // Note: This context now reflects the state *of the current project*
  // Use useMemo to prevent unnecessary re-renders
  const flowContextValue = useMemo(() => ({
      nodes,
      edges,
      setNodes,
      setEdges,
      activeProjectId, // Pass down active project ID
      saveCurrentProjectData, // Provide save function
      framework, // Include framework setting
      setFramework, // Include framework setter
  }), [nodes, edges, setNodes, setEdges, activeProjectId, saveCurrentProjectData, framework, setFramework]);

  // This function is not currently used but kept for future implementation
  /*
  const saveNodeChanges = (editedNodeData: NodeData) => {
    if (!selectedNode) return;

    const updatedNodes = nodes.map(node =>
      node.id === selectedNode.id
        ? {...node, data: editedNodeData}
        : node
    );

    const updatedData: ProjectData = {
      ...projectData,
      nodes: updatedNodes,
      lastModified: Date.now()
    };

    onProjectDataChange(updatedData);
  };
  */

  return (
    <FlowContext.Provider value={flowContextValue}>
      {/* Framework Switch Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelSwitch}
        onConfirm={handleConfirmSwitch}
        title="Switch Framework"
        message={`Do you want to save your progress before switching to ${pendingFramework === 'google-adk' ? 'Google ADK' : 'PydanticAI'}? Your current canvas will be saved and can be restored when you switch back.`}
      />

      {/* Run Agent Dialog */}
      <RunAgentDialog
        isOpen={showRunAgentDialog}
        onClose={() => setShowRunAgentDialog(false)}
        nodes={nodes}
        edges={edges}
      />
      <div className="flex flex-1">
        {/* Sidebar with draggable components */}
        {isSidebarVisible && (
          <div className="w-64 bg-[#111827] border-r border-white/5 p-4 overflow-y-auto flex flex-col h-full shadow-xl">
            {/* Header with logo and title */}
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-white/10">
              <div className="p-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-white text-sm font-semibold tracking-wider">Component Library</h2>
            </div>

            {/* Framework selector with improved styling */}
            <div className="mb-6 p-3 bg-black/40 rounded-lg border border-white/5 backdrop-blur-sm">
              <h3 className="text-white text-xs font-semibold mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                </svg>
                Framework
              </h3>
              <div className="flex space-x-2">
                <button
                  className={`px-3 py-1.5 text-xs rounded-md flex-1 transition-all duration-200 ${
                    framework === 'google-adk'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
                      : 'bg-black/30 text-white/70 hover:bg-black/50 border border-white/5'
                  }`}
                  onClick={() => handleFrameworkSwitch('google-adk')}
                >
                  Google ADK
                </button>
                <button
                  className={`px-3 py-1.5 text-xs rounded-md flex-1 transition-all duration-200 ${
                    framework === 'pydantic-ai'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
                      : 'bg-black/30 text-white/70 hover:bg-black/50 border border-white/5'
                  }`}
                  onClick={() => handleFrameworkSwitch('pydantic-ai')}
                >
                  Pydantic AI
                </button>
              </div>
            </div>

            {/* Core components section with improved styling */}
            <div className="mb-6 sidebar-components">
              <h2 className="text-white/80 text-xs font-semibold mb-3 uppercase tracking-wider flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-violet-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
                Core Components
              </h2>
              <div className="space-y-2 animate-fadeIn">
                <DraggableComponent
                  type="agent"
                  label="Agent"
                  description="Core processing unit"
                  className="bg-black/40 border-indigo-500/10"
                />
                <DraggableComponent
                  type="tool"
                  label="Tool"
                  description={framework === 'google-adk' ? "Functionality provider" : "PydanticAI tool function"}
                  className="bg-black/40 border-indigo-500/10"
                />
                <DraggableComponent
                  type="model"
                  label="Model"
                  description={framework === 'google-adk' ? "LLM powering agents" : "PydanticAI model config"}
                  className="bg-black/40 border-indigo-500/10"
                />
              </div>
            </div>

            {/* Agent patterns section with improved styling */}
            <div className="mb-6">
              <h2 className="text-white/80 text-xs font-semibold mb-3 uppercase tracking-wider flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-violet-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Agent Patterns
              </h2>
              <div className="space-y-2 animate-fadeIn">
                {framework === 'google-adk' ? (
                  <>
                    <DraggableComponent
                      type="agent"
                      label="Hierarchical Decomposition"
                      description="Complex task coordinator"
                      className="bg-black/40 border-indigo-500/10"
                    />
                    <DraggableComponent
                      type="agent"
                      label="Web Search Agent"
                      description="Web-enabled agent"
                      className="bg-black/40 border-indigo-500/10"
                    />
                    <DraggableComponent
                      type="agent"
                      label="Coordinator Pattern"
                      description="Multi-agent coordinator"
                      className="bg-black/40 border-indigo-500/10"
                    />
                  </>
                ) : (
                  <>
                    <DraggableComponent
                      type="agent"
                      label="Structured Output Agent"
                      description="Type-validated response agent"
                      className="bg-black/40 border-indigo-500/10"
                    />
                    <DraggableComponent
                      type="agent"
                      label="Dependency Injection Agent"
                      description="Agent with external dependencies"
                      className="bg-black/40 border-indigo-500/10"
                    />
                    <DraggableComponent
                      type="agent"
                      label="Streaming Agent"
                      description="Real-time streamed output"
                      className="bg-black/40 border-indigo-500/10"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Tool types section with improved styling */}
            <div className="mb-6">
              <h2 className="text-white/80 text-xs font-semibold mb-3 uppercase tracking-wider flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-violet-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Tool Types
              </h2>
              <div className="space-y-2 animate-fadeIn">
                {framework === 'google-adk' ? (
                  <>
                    <DraggableComponent
                      type="tool"
                      label="Google Search"
                      description="Web search capability"
                      tool_type="google-search"
                      className="bg-black/40 border-indigo-500/10"
                    />
                    <DraggableComponent
                      type="tool"
                      label="RAG Tool"
                      description="Retrieval augmented generation"
                      tool_type="rag"
                      className="bg-black/40 border-indigo-500/10"
                    />
                    <DraggableComponent
                      type="tool"
                      label="Code Execution"
                      description="Run code snippets"
                      tool_type="code-execution"
                      className="bg-black/40 border-indigo-500/10"
                    />
                  </>
                ) : (
                  <>
                    <DraggableComponent
                      type="tool"
                      label="Web Search Tool"
                      description="PydanticAI search function"
                      tool_type="google-search"
                      className="bg-black/40 border-indigo-500/10"
                    />
                    <DraggableComponent
                      type="tool"
                      label="Vector Retriever"
                      description="Document retrieval function"
                      tool_type="rag"
                      className="bg-black/40 border-indigo-500/10"
                    />
                    <DraggableComponent
                      type="tool"
                      label="Calculator Tool"
                      description="Math calculation function"
                      tool_type="code-execution"
                      className="bg-black/40 border-indigo-500/10"
                    />
                    <DraggableComponent
                      type="tool"
                      label="External API Tool"
                      description="API integration function"
                      tool_type="api"
                      className="bg-black/40 border-indigo-500/10"
                    />
                    <DraggableComponent
                      type="tool"
                      label="Validation Tool"
                      description="Response validation function"
                      tool_type="validation"
                      className="bg-black/40 border-indigo-500/10"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Footer with improved styling */}
            <div className="mt-auto pt-4 border-t border-white/10 flex justify-between">
              <button
                className="p-2 rounded-md bg-black/30 text-gray-400 hover:text-white hover:bg-black/50 transition-all duration-200"
                onClick={toggleSidebar}
                title="Hide sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="p-2 rounded-md bg-black/30 text-gray-400 hover:text-white hover:bg-black/50 transition-all duration-200"
                title="Toggle Archon Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 bg-[#111827] flex flex-col relative">
          <div className="h-full rounded-lg overflow-hidden flex flex-col">
            <div className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-sm backdrop-filter bg-black/40 shadow-lg header-bar">
              <div className="flex">
                {!isSidebarVisible && (
                  <button
                    className="m-2 p-2 rounded-md bg-black/30 text-gray-400 hover:text-white hover:bg-black/50 transition-all duration-200 border border-white/5"
                    onClick={toggleSidebar}
                    title="Show component library"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                {/* Back to Project button */}
                <button
                  className="px-4 py-3 text-gray-300 hover:text-white transition-colors flex items-center"
                  onClick={onGoToProjects}
                  title="Back to Project"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                  Back to Project
                </button>

                {/* Undo/Redo buttons in header with improved UI */}
                {activeTab === 'editor' && (
                  <div className="px-4 py-2 flex items-center">
                    <div className="flex space-x-3 mr-4">
                      {/* Undo button with state tracking */}
                      <button
                        className="px-3 py-1.5 rounded-md bg-gradient-to-b from-gray-700/80 to-gray-900/90 hover:from-violet-600/80 hover:to-violet-800/90 text-gray-200 border border-white/10 shadow-lg hover:shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-gray-700/80 disabled:hover:to-gray-900/90 disabled:hover:shadow-none flex items-center transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner btn-hover-effect relative overflow-hidden"
                        onClick={(e) => {
                          // Check if undo is available
                          const undoButton = document.getElementById('flow-undo-button') as HTMLButtonElement | null;
                          if (!undoButton || undoButton.disabled) return;

                          // Add ripple effect
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;

                          const ripple = document.createElement('span');
                          ripple.className = 'absolute rounded-full bg-white/20';
                          ripple.style.width = ripple.style.height = '100px';
                          ripple.style.left = `${x - 50}px`;
                          ripple.style.top = `${y - 50}px`;
                          ripple.style.animation = 'ripple-effect 0.6s ease-out forwards';

                          e.currentTarget.appendChild(ripple);
                          setTimeout(() => ripple.remove(), 700);

                          // Call the undo function
                          undoButton.click();
                        }}
                        title="Undo (Ctrl+Z)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-violet-300" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Undo</span>
                        <span className="ml-1.5 text-xs opacity-70 bg-black/30 px-1.5 py-0.5 rounded">⌘Z</span>
                      </button>

                      {/* Redo button with state tracking */}
                      <button
                        className="px-3 py-1.5 rounded-md bg-gradient-to-b from-gray-700/80 to-gray-900/90 hover:from-violet-600/80 hover:to-violet-800/90 text-gray-200 border border-white/10 shadow-lg hover:shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-gray-700/80 disabled:hover:to-gray-900/90 disabled:hover:shadow-none flex items-center transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner btn-hover-effect relative overflow-hidden"
                        onClick={(e) => {
                          // Check if redo is available
                          const redoButton = document.getElementById('flow-redo-button') as HTMLButtonElement | null;
                          if (!redoButton || redoButton.disabled) return;

                          // Add ripple effect
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;

                          const ripple = document.createElement('span');
                          ripple.className = 'absolute rounded-full bg-white/20';
                          ripple.style.width = ripple.style.height = '100px';
                          ripple.style.left = `${x - 50}px`;
                          ripple.style.top = `${y - 50}px`;
                          ripple.style.animation = 'ripple-effect 0.6s ease-out forwards';

                          e.currentTarget.appendChild(ripple);
                          setTimeout(() => ripple.remove(), 700);

                          // Call the redo function
                          redoButton.click();
                        }}
                        title="Redo (Ctrl+Y)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-violet-300" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Redo</span>
                        <span className="ml-1.5 text-xs opacity-70 bg-black/30 px-1.5 py-0.5 rounded">⌘Y</span>
                      </button>

                      {/* Optional: Add a small badge showing available undo/redo steps */}
                      <div className="hidden md:flex items-center space-x-1 text-xs text-gray-400 bg-black/30 px-2 py-1 rounded">
                        <span id="header-undo-count" className="text-violet-300">0</span>
                        <span>/</span>
                        <span id="header-redo-count" className="text-violet-300">0</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Help Button */}
                <div className="ml-auto mr-4 flex items-center">
                  <HelpButton className="z-[1001]" />
                </div>

                {/* Add framework selector */}
                <div className="px-4 py-2 flex items-center ml-auto">
                  <span className="text-gray-400 text-sm mr-2">Framework:</span>
                  <select
                    value={framework}
                    onChange={(e) => handleFrameworkSwitch(e.target.value as 'google-adk' | 'pydantic-ai')}
                    className="bg-black/50 text-white border border-white/10 rounded px-2 py-1 text-sm"
                  >
                    <option value="google-adk">Google ADK</option>
                    <option value="pydantic-ai">PydanticAI</option>
                  </select>
                </div>
                <button
                  className={`px-4 py-4 font-medium text-sm ${
                    activeTab === 'editor'
                      ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  } transition-all duration-200`}
                  onClick={() => setActiveTab('editor')}
                >
                  Flow Editor
                </button>
                <button
                  className={`px-4 py-4 font-medium text-sm ${
                    activeTab === 'templates'
                      ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  } transition-all duration-200`}
                  onClick={() => setActiveTab('templates')}
                >
                  Templates
                </button>
                <button
                  className={`px-4 py-4 font-medium text-sm ${
                    activeTab === 'settings'
                      ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  } transition-all duration-200`}
                  onClick={() => setActiveTab('settings')}
                >
                  Settings
                </button>

                <div className="ml-auto flex items-center pr-4">

                  <button
                    className="p-1.5 rounded-md bg-indigo-600/80 hover:bg-indigo-700 text-white mr-2 border border-indigo-500/30"
                    onClick={() => onRunAgent ? onRunAgent() : null}
                    title="Run Code"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.555 7.168A1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                    </svg>
                  </button>
                  <button
                    className="p-1.5 rounded-md bg-black/30 hover:bg-black/50 text-gray-300 border border-white/5"
                    onClick={() => setReactFlowInstance(null)}
                    title="Reset View"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4.75 12.094A1 1 0 004 15v3H1v-3a3 3 0 013.75-2.906z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'editor' && (
              <div className="flex-1 overflow-hidden relative">
                <div className="relative h-full">
                  {nodes.length > 0 && edges.length === 0 && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-black/70 text-white px-4 py-2 rounded-lg shadow-lg border border-violet-500/30 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                        </svg>
                        <span>Connect nodes by dragging from one connection point to another</span>
                      </div>
                    </div>
                  )}
                  <FlowCanvas
                    nodes={nodes}
                    edges={edges}
                    setNodes={setNodes}
                    setEdges={setEdges}
                    onNodeSelect={setSelectedNode}
                    reactFlowInstance={reactFlowInstance}
                    setReactFlowInstance={setReactFlowInstance}
                  />
                </div>

                {/* Fixed positioned property panel that always shows on the right */}
                <div className="fixed top-0 right-0 h-screen z-40 transition-all duration-300 ease-in-out shadow-2xl">
                  <PropertyPanel
                    selectedNode={selectedNode}
                    nodes={nodes}
                    edges={edges}
                  />
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="flex-1 p-6">
                <h2 className="text-white text-lg font-bold mb-2">Flow Templates</h2>
                <p className="text-gray-300 mb-6 text-sm">Select a template to get started building your {framework === 'google-adk' ? 'Google ADK' : 'PydanticAI'} flow.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Show templates based on the selected framework */}
                  {(framework === 'google-adk' ? templates : pydanticTemplates).map((template) => (
                    <div
                      key={template.id}
                      className="relative backdrop-blur-sm bg-black/30 rounded-lg p-6 border border-white/5 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer group"
                      onClick={() => loadTemplate(template.id)}
                    >
                      <div className="absolute top-0 left-0 w-full h-full rounded-lg bg-gradient-to-br from-purple-600/5 via-transparent to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                      <h3 className="text-white font-bold mb-2 text-lg">{template.name}</h3>
                      <p className="text-gray-300 mb-4 text-sm">{template.description}</p>

                      <div className="flex gap-2 mb-3">
                        <span className="text-xs bg-violet-500/20 text-violet-300 py-1 px-2 rounded-full">{template.nodes.filter(n => n.type === 'agent').length} Agents</span>
                        <span className="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">{template.nodes.filter(n => n.type === 'tool').length} Tools</span>
                        <span className="text-xs bg-indigo-500/20 text-indigo-300 py-1 px-2 rounded-full">{template.edges.length} Connections</span>
                      </div>

                      <button className="mt-2 w-full py-2 bg-white/5 hover:bg-purple-500/20 text-sm text-white/70 hover:text-white rounded border border-white/10 hover:border-purple-500/30 transition-all duration-300">
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="flex-1 p-6 overflow-y-auto backdrop-blur-sm bg-black/30 text-gray-300 relative">
                {/* Background Elements */}
                <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-purple-600/10 blur-[80px] pointer-events-none z-0"></div>
                <div className="absolute bottom-20 left-10 w-64 h-64 rounded-full bg-blue-600/10 blur-[80px] pointer-events-none z-0"></div>

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-grid-pattern mix-blend-screen"></div>

                {/* Particle noise effect */}
                <div className="absolute inset-0 z-0 pointer-events-none bg-noise-pattern opacity-5 mix-blend-overlay"></div>

                <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-purple-500 to-blue-500">Project Settings</h2>
                <div className="backdrop-blur-sm backdrop-filter bg-black/20 border border-white/10 rounded-3xl p-4">
                  <h3 className="text-md font-medium mb-3 text-white">General</h3>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Project Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter project name"
                      value={projectData.settings?.projectName as string || ''}
                      onChange={(e) =>
                        onProjectDataChange({
                          ...projectData,
                          settings: { ...projectData.settings, projectName: e.target.value }
                        })
                      }
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                    <textarea
                      className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter project description"
                      rows={3}
                      value={projectData.settings?.description as string || ''}
                      onChange={(e) =>
                        onProjectDataChange({
                          ...projectData,
                          settings: { ...projectData.settings, description: e.target.value }
                        })
                      }
                    />
                  </div>
                </div>

                <div className="backdrop-blur-sm backdrop-filter bg-black/20 border border-white/10 rounded-3xl p-4 mt-6">
                  <h3 className="text-md font-medium mb-3 text-white">Export Settings</h3>

                  <div className="mb-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 bg-black/30 border-white/30 rounded focus:ring-blue-500 text-blue-600"
                        checked={Boolean(projectData.settings?.includeTools)}
                        onChange={(e) =>
                          onProjectDataChange({
                            ...projectData,
                            settings: { ...projectData.settings, includeTools: e.target.checked }
                          })
                        }
                      />
                      <span className="text-sm text-gray-300">Include tool definitions in export</span>
                    </label>
                  </div>

                  <div>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-md hover:from-blue-700 hover:to-violet-700 font-medium text-sm transition-all duration-200">
                      Export Project
                    </button>
                  </div>
                </div>
              </div>
            )}




          </div>
        </div>
      </div>


    </FlowContext.Provider>
  );
};

// FlowCanvas component to manage the rendering of the ReactFlow canvas
const FlowCanvas = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  onNodeSelect,
  reactFlowInstance,
  setReactFlowInstance
}: {
  nodes: Node<NodeData>[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodeSelect: (node: Node<NodeData> | null) => void;
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: React.Dispatch<React.SetStateAction<ReactFlowInstance | null>>;
}) => {
  // Access the flow context
  const { saveCurrentProjectData } = useContext(FlowContext);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(reactFlowInstance);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  // We only need the setter for connection state
  const [, setConnectionInProgress] = useState<OnConnectStartParams | null>(null);

  // History state for undo/redo functionality
  const [history, setHistory] = useState<{
    past: { nodes: Node<NodeData>[]; edges: Edge[] }[];
    future: { nodes: Node<NodeData>[]; edges: Edge[] }[];
  }>({ past: [], future: [] });

  // Track if we're currently performing an undo/redo operation
  // to avoid adding these operations to history
  const isUndoRedoOperation = useRef(false);

  // Update ref when the instance changes
  useEffect(() => {
    reactFlowInstanceRef.current = reactFlowInstance;
  }, [reactFlowInstance]);

  // Helper function to show notifications
  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    // Create notification element
    const notification = document.createElement('div');

    // Set styles based on type
    let bgColor = 'bg-green-100 border-green-400 text-green-700';
    let icon = `<svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
    </svg>`;

    if (type === 'info') {
      bgColor = 'bg-blue-100 border-blue-400 text-blue-700';
      icon = `<svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
      </svg>`;
    } else if (type === 'warning') {
      bgColor = 'bg-yellow-100 border-yellow-400 text-yellow-700';
      icon = `<svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
      </svg>`;
    } else if (type === 'error') {
      bgColor = 'bg-red-100 border-red-400 text-red-700';
      icon = `<svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
      </svg>`;
    }

    notification.className = `fixed top-4 right-4 ${bgColor} border px-4 py-3 rounded z-50 animate-fadeIn shadow-lg`;
    notification.innerHTML = `
      <div class="flex items-center">
        ${icon}
        <p>${message}</p>
      </div>
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }, []);

  // Function to update header undo/redo counts
  const updateHeaderUndoRedoCounts = useCallback((past: any[], future: any[]) => {
    // Update the header undo/redo counts if the elements exist
    const headerUndoCount = document.getElementById('header-undo-count');
    const headerRedoCount = document.getElementById('header-redo-count');

    if (headerUndoCount) {
      headerUndoCount.textContent = Math.max(0, past.length - 1).toString();
    }

    if (headerRedoCount) {
      headerRedoCount.textContent = future.length.toString();
    }
  }, []);

  // Implement undo functionality
  const undo = useCallback(() => {
    if (history.past.length <= 1) return; // Need at least 2 items in history (initial state + current state)

    isUndoRedoOperation.current = true;

    // Get the previous state from past (second to last item)
    const previous = history.past[history.past.length - 2]; // Get the previous state
    const newPast = history.past.slice(0, history.past.length - 1);

    // Save current state to future
    const currentState = {
      nodes: [...nodes], // Create copies to avoid reference issues
      edges: [...edges]
    };

    const newFuture = [
      currentState,
      ...history.future
    ];

    // Update state
    setNodes([...previous.nodes]); // Use copies to ensure new references
    setEdges([...previous.edges]);

    // Update history in a separate operation
    setTimeout(() => {
      const newHistory = {
        past: newPast,
        future: newFuture
      };

      setHistory(newHistory);

      // Update header counts
      updateHeaderUndoRedoCounts(newHistory.past, newHistory.future);

      // Show notification
      showNotification('Action undone', 'info');

      // Reset flag after state updates
      isUndoRedoOperation.current = false;
    }, 0);
  }, [history, nodes, edges, setNodes, setEdges, showNotification, updateHeaderUndoRedoCounts]);

  // Implement redo functionality
  const redo = useCallback(() => {
    if (history.future.length === 0) return; // Nothing to redo

    isUndoRedoOperation.current = true;

    // Get the first state from future
    const next = history.future[0];
    const newFuture = history.future.slice(1);

    // Save current state to past
    const currentState = {
      nodes: [...nodes], // Create copies to avoid reference issues
      edges: [...edges]
    };

    const newPast = [
      ...history.past,
      currentState
    ];

    // Update state
    setNodes([...next.nodes]); // Use copies to ensure new references
    setEdges([...next.edges]);

    // Update history in a separate operation
    setTimeout(() => {
      const newHistory = {
        past: newPast,
        future: newFuture
      };

      setHistory(newHistory);

      // Update header counts
      updateHeaderUndoRedoCounts(newHistory.past, newHistory.future);

      // Show notification
      showNotification('Action redone', 'info');

      // Reset flag after state updates
      isUndoRedoOperation.current = false;
    }, 0);
  }, [history, nodes, edges, setNodes, setEdges, showNotification, updateHeaderUndoRedoCounts]);

  // Track previous nodes and edges for comparison
  const prevNodesRef = useRef<Node<NodeData>[]>([]);
  const prevEdgesRef = useRef<Edge[]>([]);

  // Initialize history with current state when component mounts - only once
  useEffect(() => {
    // Initialize with a single empty state to start with
    const initialHistory = {
      past: [{ nodes: [], edges: [] }], // Start with empty state
      future: []
    };

    setHistory(initialHistory);

    // Initialize previous refs with deep copies
    prevNodesRef.current = nodes.map(node => ({...node}));
    prevEdgesRef.current = edges.map(edge => ({...edge}));

    // Initialize header counts
    updateHeaderUndoRedoCounts(initialHistory.past, initialHistory.future);
  }, [updateHeaderUndoRedoCounts]);

  // Track changes for history
  const trackChangesForHistory = useCallback((newNodes: Node<NodeData>[], newEdges: Edge[]) => {
    if (isUndoRedoOperation.current) return;

    // Check if there's an actual change by comparing with previous values
    const nodesChanged = JSON.stringify(newNodes) !== JSON.stringify(prevNodesRef.current);
    const edgesChanged = JSON.stringify(newEdges) !== JSON.stringify(prevEdgesRef.current);

    // Only update history if there's an actual change
    if (nodesChanged || edgesChanged) {
      // Add previous state to history
      setHistory(prev => {
        // Skip if we're just starting
        if (prev.past.length === 0 && prevNodesRef.current.length === 0 && prevEdgesRef.current.length === 0) {
          return prev;
        }

        const newPast = [...prev.past, {
          nodes: [...prevNodesRef.current],
          edges: [...prevEdgesRef.current]
        }];

        // Limit history size to prevent memory issues
        if (newPast.length > 50) {
          const newHistory = {
            past: newPast.slice(newPast.length - 50),
            future: [] // Clear future when a new change is made
          };

          // Update header counts
          updateHeaderUndoRedoCounts(newHistory.past, newHistory.future);

          return newHistory;
        }

        const newHistory = {
          past: newPast,
          future: [] // Clear future when a new change is made
        };

        // Update header counts
        updateHeaderUndoRedoCounts(newHistory.past, newHistory.future);

        return newHistory;
      });
    }

    // Update refs for next comparison
    prevNodesRef.current = [...newNodes];
    prevEdgesRef.current = [...newEdges];
  }, [updateHeaderUndoRedoCounts]);

  // Update refs when nodes or edges change
  useEffect(() => {
    if (isUndoRedoOperation.current) {
      // Just update refs without modifying history
      prevNodesRef.current = [...nodes];
      prevEdgesRef.current = [...edges];
      return;
    }

    // Skip initial render
    if (prevNodesRef.current.length === 0 && prevEdgesRef.current.length === 0) {
      prevNodesRef.current = [...nodes];
      prevEdgesRef.current = [...edges];
      return;
    }

    // Track changes for history
    trackChangesForHistory(nodes, edges);
  }, [nodes, edges, trackChangesForHistory]);

  // Handle node changes (position, selection)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Skip history tracking for selection changes
      const isOnlySelection = changes.every(c => c.type === 'select');

      if (isOnlySelection) {
        isUndoRedoOperation.current = true;
        setTimeout(() => {
          isUndoRedoOperation.current = false;
        }, 0);
      }

      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);
        // Update selection state for parent component
        const selectedChange = changes.find(c => c.type === 'select');
        if (selectedChange && selectedChange.type === 'select') {
           const selected = updatedNodes.find(n => n.id === selectedChange.id);
           onNodeSelect(selectedChange.selected && selected ? selected as Node<NodeData> : null);
        } else if (changes.some(c => c.type === 'remove')) {
            onNodeSelect(null); // Deselect if node is removed
        }
        return updatedNodes as Node<NodeData>[];
      });
    },
    [setNodes, onNodeSelect] // Add onNodeSelect dependency
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Skip history tracking for selection changes
      const isOnlySelection = changes.every(c => c.type === 'select');

      if (isOnlySelection) {
        isUndoRedoOperation.current = true;
        setTimeout(() => {
          isUndoRedoOperation.current = false;
        }, 0);
      }

      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  // Validate connections based on node types
  // Explicitly type the parameter as Connection | Edge
  const isValidConnection: IsValidConnection = useCallback(
    (connection: Connection | Edge): boolean => {
      console.log('Validating connection:', connection);

      // Ensure connection has source and target
      if (!connection.source || !connection.target) {
        console.log('❌ Connection missing source or target');
        return false;
      }

      // Prevent connecting a node to itself
      if (connection.source === connection.target) {
        console.log('❌ Cannot connect node to itself');
        return false;
      }

      const sourceNode = nodes.find(node => node.id === connection.source);
      const targetNode = nodes.find(node => node.id === connection.target);

      if (!sourceNode || !targetNode) {
        console.log('❌ Source or target node not found:', {
          sourceFound: !!sourceNode,
          targetFound: !!targetNode,
          sourceId: connection.source,
          targetId: connection.target,
          availableNodeIds: nodes.map(n => n.id)
        });
        return false;
      }

      // Log connection attempt details for debugging
      console.log('Connection attempt details:', {
        sourceId: connection.source,
        sourceType: sourceNode.type,
        sourceHandle: connection.sourceHandle,
        targetId: connection.target,
        targetType: targetNode.type,
        targetHandle: connection.targetHandle
      });

      // Check for existing connection to prevent duplicates
      // Only check source and target, ignore handles to be more permissive
      const connectionExists = edges.some(
        edge => (
          edge.source === connection.source &&
          edge.target === connection.target
        )
      );

      if (connectionExists) {
        console.log('❌ Connection already exists');
        return false;
      }

      // Enforce semantic constraints between different node types
      const sourceType = sourceNode.type;
      const targetType = targetNode.type;

      // Valid connection patterns
      const validConnections = [
        // Tool can connect to Agent (Tool provides functionality to Agent)
        { source: 'tool', target: 'agent' },
        // Agent can connect to Tool (Agent uses Tool)
        { source: 'agent', target: 'tool' },
        // Model can connect to Agent (Model powers Agent)
        { source: 'model', target: 'agent' },
        // Agent can connect to Model (Agent uses Model)
        { source: 'agent', target: 'model' },
        // Agent can connect to Agent (Agents communicate with each other)
        { source: 'agent', target: 'agent' },
      ];

      // Check if the connection follows a valid pattern
      const isValid = validConnections.some(
        pattern => pattern.source === sourceType && pattern.target === targetType
      );

      if (!isValid) {
        console.log(`❌ Invalid connection: ${sourceType} → ${targetType} is not a valid connection pattern`);
        return false;
      }

      console.log(`✅ Valid connection: ${sourceType} → ${targetType}`);
      return true;
    },
    [nodes, edges]
  );

  // Handle connection start to show visual indicator
  // Using the OnConnectStart type directly
  const onConnectStart: OnConnectStart = useCallback((_, params) => {
    setConnectionInProgress(params);

    // Add visual feedback for connection in progress
    console.log('✨ Connection started from:', params);

    // Add connecting class to the source handle
    const sourceHandle = document.getElementById(params.handleId || '');
    if (sourceHandle) {
      sourceHandle.classList.add('connecting');
    }

    // Add a CSS class to the body to indicate connection mode
    document.body.classList.add('connecting-mode');

    // Highlight all potential target handles
    setTimeout(() => {
      const handles = document.querySelectorAll('.react-flow__handle');
      handles.forEach(handle => {
        if (handle.id !== params.handleId) {
          handle.classList.add('potential-target');
        }
      });
    }, 50);
  }, []);

  // Clear connection indicator when connection ends
  const onConnectEnd = useCallback(() => {
    setConnectionInProgress(null);

    // Remove connecting class from all handles
    const handles = document.querySelectorAll('.react-flow__handle');
    handles.forEach(handle => {
      handle.classList.remove('connecting');
      handle.classList.remove('potential-target');
    });

    // Remove the connection mode class from body
    document.body.classList.remove('connecting-mode');

    console.log('✨ Connection ended');
  }, []);

  // Handle new connections between nodes using the addEdge utility function
  const onConnect = useCallback(
    (connection: Connection) => {
      console.log("🔄 Connection attempt:", connection);

      try {
        // First validate the connection
        if (!isValidConnection(connection)) {
          console.log("❌ Invalid connection attempt:", connection);
          return;
        }

        const sourceNode = nodes.find(node => node.id === connection.source);
        const targetNode = nodes.find(node => node.id === connection.target);

        if (!sourceNode || !targetNode) {
          console.error("❌ Source or target node not found");
          return;
        }

        // Get edge style and label using the utility function
        const { edgeStyle, edgeLabel } = getEdgeStyleAndLabel(sourceNode.type, targetNode.type);

        // Create a unique ID for the edge
        const edgeId = `edge-${connection.source}-${connection.target}-${Date.now()}`;

        // Log the edge creation details
        console.log("✅ Creating edge with ID:", edgeId);

        // Create the new edge object
        const newEdge = {
          ...connection,
          id: edgeId,
          animated: true,
          style: {
            ...edgeStyle,
            opacity: 0.8,
          },
          label: edgeLabel,
          labelStyle: { fill: '#f1f5f9', fontSize: 12, fontWeight: 500 },
          labelBgStyle: { fill: 'rgba(0, 0, 0, 0.4)', fillOpacity: 0.7 },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: edgeStyle.stroke,
            strokeWidth: 1,
          },
        };

        // Use the addEdge utility function to create the edge with proper styling
        setEdges((eds) => {
          const newEdges = addEdge(newEdge, eds);
          console.log("✅ Edge added successfully. Total edges:", newEdges.length);
          return newEdges;
        });

        // Save the project data after adding the edge using the context function
        setTimeout(() => {
          saveCurrentProjectData();
          console.log("✅ Edge added successfully and project data saved");
        }, 100);
      } catch (error) {
        console.error("❌ Error creating edge:", error);
      }
    },
    [nodes, edges, setEdges, isValidConnection, saveCurrentProjectData]
  );

  // Handle drag over for components
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => { // Use React.DragEvent
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle dropping components on the canvas
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => { // Use React.DragEvent
      event.preventDefault();

      if (!reactFlowInstanceRef.current || !reactFlowWrapper.current) return; // Check if instance is available

      // Try to get data in the new format first
      let type = event.dataTransfer.getData('application/reactflow/type');
      let label = event.dataTransfer.getData('application/reactflow/label');
      let description = event.dataTransfer.getData('application/reactflow/description') || '';
      let tool_type = event.dataTransfer.getData('application/reactflow/tool_type') || '';

      // If type is empty, try the old format (for backward compatibility)
      if (!type) {
        try {
          const jsonData = event.dataTransfer.getData('application/reactflow');
          if (jsonData) {
            const data = JSON.parse(jsonData);
            type = data.type;
            label = data.label;
            description = data.description || '';
            tool_type = data.tool_type || '';
          }
        } catch (e) {
          console.error('Error parsing drag data:', e);
        }
      }

      if (!type) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();

      // Get the position where component was dropped
      const position = reactFlowInstanceRef.current.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Generate unique node ID
      const id = `${type}-${Date.now()}`;

      // Create new node with additional properties based on type
      const nodeData: NodeData = { label, type, description };

      if (type === 'model') {
        nodeData.model = 'gemini-2.0-flash-exp';
        nodeData.size = 'Standard Model';
      } else if (type === 'tool') {
        nodeData.input_type = 'String Input';
        if (tool_type) { // Set specific tool type if provided by DraggableComponent
            nodeData.tool_type = tool_type;
            // Pre-fill label/desc for built-in tools if label wasn't specific
            if (label === 'Tool') { // Check if generic label was used
                if (tool_type === 'google-search') {
                    nodeData.label = 'Google Search';
                    nodeData.description = nodeData.description || 'Searches the web for up-to-date information';
                } else if (tool_type === 'rag') {
                     nodeData.label = 'RAG Tool';
                     nodeData.description = nodeData.description || 'Retrieval Augmented Generation from knowledge base';
                } else if (tool_type === 'code-execution') {
                     nodeData.label = 'Code Execution';
                     nodeData.description = nodeData.description || 'Executes provided code snippets';
                }
            }
        } else {
             nodeData.tool_type = 'function'; // Default to function tool
        }
      } else if (type === 'agent') {
        nodeData.capabilities = 'Standard Capabilities';
        nodeData.agentModel = 'gemini-2.0-flash-exp'; // Default agent model
        // Check for specific agent patterns from draggable
        if (label === 'Hierarchical Decomposition') {
            nodeData.description = 'Coordinator for decomposing complex tasks';
            nodeData.instruction = `You are a coordinator agent...`; // Add template instruction
        } else if (label === 'Coordinator Pattern') {
             nodeData.description = 'Manages multiple assistant agents';
        } else if (label === 'Web Search Agent') {
             nodeData.description = 'Agent focused on web searching';
             nodeData.instruction = `You are a helpful assistant...`; // Add template instruction
        }
      }

      // We don't need to set handle positions here since they're defined in the node components
      // This allows for multiple handles in different positions

      const newNode: Node<NodeData> = {
        id,
        position,
        type,
        data: nodeData,
        // Don't set sourcePosition and targetPosition here
        // as they're defined in the node components with multiple handles
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes] // reactFlowInstance might be null initially
  );

  // Handle node selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Mark this node as click-selected to differentiate from hover-selected
    setNodes(nds => nds.map(n =>
      n.id === node.id
        ? { ...n, data: { ...n.data, __clickSelected: true } }
        : n
    ));
    onNodeSelect(node as Node<NodeData>);
  }, [onNodeSelect, setNodes]);

  // Handle keyboard shortcuts for delete, undo, redo
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Delete selected elements
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Get selected nodes and edges
        const selectedNodes = nodes.filter(node => node.selected).map(n => n.id);
        const selectedEdges = edges.filter(edge => edge.selected).map(e => e.id);

        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
            setNodes((nds) => nds.filter((node) => !node.selected));
            setEdges((eds) => eds.filter((edge) => !edge.selected));
            onNodeSelect(null); // Deselect after deleting
        }
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      // Redo: Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z
      if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
      }
    },
    [nodes, edges, setNodes, setEdges, onNodeSelect, undo, redo]
  );

  // Focus wrapper div to allow keydown events
   useEffect(() => {
    if (reactFlowWrapper.current) {
      reactFlowWrapper.current.focus();
    }
   }, []);

  return (
    <div className="h-full w-full relative focus:outline-none" ref={reactFlowWrapper} onKeyDown={onKeyDown} tabIndex={0}>
      {/* Use named import <ReactFlow /> */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection} // Pass the typed function
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onInit={setReactFlowInstance}
        fitView
        snapToGrid={snapToGrid}
        snapGrid={[15, 15]}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionMode={ConnectionMode.Strict} // Changed from Loose to Strict for better handle targeting
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Control', 'Meta']}
        selectionKeyCode={['Shift']}
        elementsSelectable={true}
        nodesDraggable={true}
        nodesConnectable={true} // Explicitly enable node connections
        zoomOnScroll={true}
        panOnScroll={false}
        panOnDrag={true}
        connectionLineStyle={{
          stroke: '#8b5cf6', // Always use purple for connection line
          strokeWidth: 3, // Increased width for better visibility
          strokeDasharray: '5 5',
          animation: 'dash 1s linear infinite',
          opacity: 0.9, // Increased opacity for better visibility
        }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#8b5cf6', strokeWidth: 2.5, opacity: 0.8 },
          labelStyle: { fill: '#f1f5f9', fontSize: 12, fontWeight: 500 },
          labelBgStyle: { fill: 'rgba(0, 0, 0, 0.4)', fillOpacity: 0.7 },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: '#8b5cf6',
            strokeWidth: 1,
          },
        }}
        proOptions={{ hideAttribution: true }}
        className="dark-flow"
      >
        <Background
          gap={24}
          color="#333"
          size={1.5}
          style={{ backgroundColor: '#111827' }}
        />
        {/* Controls */}
        {showMinimap && <Controls position="bottom-right" className="!bg-gray-800 !border-gray-700 !shadow-lg" />}

        {/* Control Buttons */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
          {/* Undo/Redo Buttons */}
          <div className="flex flex-col space-y-1">
            <div className="flex space-x-2">
              <button
                id="flow-undo-button"
                className="p-1.5 rounded-md bg-black/30 hover:bg-black/50 text-gray-300 border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                onClick={undo}
                disabled={history.past.length <= 1}
                title="Undo (Ctrl+Z)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">Undo</span>
                <span className="text-xs ml-1 opacity-60">(⌘Z)</span>
              </button>
              <button
                id="flow-redo-button"
                className="p-1.5 rounded-md bg-black/30 hover:bg-black/50 text-gray-300 border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                onClick={redo}
                disabled={history.future.length === 0}
                title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">Redo</span>
                <span className="text-xs ml-1 opacity-60">(⌘Y)</span>
              </button>
            </div>

            {/* History status indicator */}
            {(history.past.length > 1 || history.future.length > 0) && (
              <div className="text-xs text-center text-gray-400 bg-black/30 rounded px-2 py-1">
                <span title="Undo steps available">{Math.max(0, history.past.length - 1)}</span>
                <span className="mx-1">•</span>
                <span title="Redo steps available">{history.future.length}</span>
              </div>
            )}
          </div>

          {/* Grid Toggle */}
          <button
            className={`p-2 rounded-md ${snapToGrid ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-300'} shadow-md hover:shadow-violet-500/20 transition-all duration-200`}
            onClick={() => setSnapToGrid(!snapToGrid)}
            title={snapToGrid ? "Disable Snap to Grid" : "Enable Snap to Grid"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
          </button>

          {/* Minimap Toggle */}
          <button
            className={`p-2 rounded-md ${showMinimap ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-300'} shadow-md hover:shadow-violet-500/20 transition-all duration-200`}
            onClick={() => setShowMinimap(!showMinimap)}
            title={showMinimap ? "Hide Minimap" : "Show Minimap"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            className="p-2 rounded-md bg-gray-800 text-gray-300 shadow-md hover:bg-violet-600 hover:text-white transition-all duration-200"
            onClick={() => reactFlowInstanceRef.current?.fitView()}
            title="Fit view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4.75 12.094A1 1 0 004 15v3H1v-3a3 3 0 013.75-2.906z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Help Button */}
          <HelpButton />
        </div>
      </ReactFlow>
    </div>
  );
};

// App component
export default function Home() {
  // Flow States
  const [flowState, setFlowState] = useState<'landing' | 'projects' | 'editor'>('landing');
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentProjectData, setCurrentProjectData] = useState<ProjectData | null>(null);

  // Load projects on mount
  useEffect(() => {
    const loadedProjects = loadProjects();
    setProjects(loadedProjects);

    // Only check for last active project if we have projects
    if (loadedProjects.length > 0) {
      const lastActive = getLastActiveProjectId();
      if (lastActive && loadedProjects.some(p => p.id === lastActive)) {
        // Don't automatically load the last project, stay on landing page
        // Just store the ID for when user navigates to projects
        setActiveProjectId(lastActive);
      }
    }
  }, []);

  // Handle project data loading
  useEffect(() => {
    if (activeProjectId) {
      const projectData = loadProjectData(activeProjectId);
      // When loading a new project, update currentProjectData
      setCurrentProjectData(projectData ?? {
        id: activeProjectId,
        name: '',
        created: Date.now(),
        lastModified: Date.now(),
        projectType: 'nocode',
        nodes: [],
        edges: [],
        code: '# Start coding your agent here!',
        settings: {}
      });
    } else {
      setCurrentProjectData(null);
    }
  }, [activeProjectId]);

  // Handlers for user actions
  const handleProceedFromLanding = () => {
    setFlowState('projects');
  };

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    saveLastActiveProjectId(projectId);
    setFlowState('editor');
  };

  const handleCreateProject = (name: string, projectType: 'nocode' | 'code' = 'nocode') => {
    const newProjectId = addProject(name, projectType);
    setProjects([...projects, {
      id: newProjectId,
      name,
      created: Date.now(),
      lastModified: Date.now(),
      projectType
    }]);

    // Switch to the new project
    setActiveProjectId(newProjectId);
    saveLastActiveProjectId(newProjectId);
    setCurrentProjectData({
      id: newProjectId,
      name,
      created: Date.now(),
      lastModified: Date.now(),
      projectType,
      nodes: [],
      edges: [],
      code: '# Start coding your agent here!',
      settings: {}
    });
    setFlowState('editor');
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
    setProjects(projects.filter(p => p.id !== projectId));

    // If the deleted project was active, clear the active project
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
      setCurrentProjectData(null);
    }
  };

  const handleGoToProjects = () => {
    setFlowState('projects');
  };

  // Handle project data changes with proper typing
  const handleProjectDataChange = (data: Partial<ProjectData>) => {
    if (!currentProjectData) return;

    const updatedData: ProjectData = {
      ...currentProjectData,
      ...data,
      lastModified: Date.now()
    };

    // Ensure framework is always saved
    if (data.framework) {
      updatedData.framework = data.framework;
    }

    setCurrentProjectData(updatedData);
    saveProjectData(updatedData);
  };

  // Determine what to render based on flowState
  let content;
  if (flowState === 'landing') {
    content = (
      <LandingPage onGetStarted={handleProceedFromLanding} />
    );
  } else if (flowState === 'projects') {
    content = (
      <div className="min-h-screen bg-[#0A0A0A] text-[#F1F5F9] overflow-x-hidden relative">
        {/* Background Elements */}
        <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#050505] via-[#101118] to-[#0A0A0A]"></div>

        {/* Static gradient orbs */}
        <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none"></div>
        <div className="fixed bottom-1/3 right-1/3 w-80 h-80 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none"></div>

        {/* Grid pattern overlay */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-20 bg-grid-pattern mix-blend-screen"></div>

        {/* Particle noise effect */}
        <div className="fixed inset-0 z-0 pointer-events-none bg-noise-pattern opacity-5 mix-blend-overlay"></div>

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="backdrop-blur-sm backdrop-filter bg-black/20 rounded-3xl border border-white/5 shadow-2xl p-8">
            <SelectProjectScreen
              projects={projects}
              onSelectProject={handleSelectProject}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
            />
          </div>
        </div>
      </div>
    );
  } else if (flowState === 'editor' && activeProjectId && currentProjectData) {
    // Check the project type and render the appropriate editor
    if (currentProjectData.projectType === 'code') {
      // Render CodeProjectEditor for code projects
      content = (
        <CodeProjectEditor
          projectData={currentProjectData}
          onProjectDataChange={handleProjectDataChange}
          onGoToProjects={handleGoToProjects}
        />
      );
    } else {
      // Render FlowEditor for no-code projects
      content = (
        <FlowEditor
          activeProjectId={activeProjectId}
          projectData={currentProjectData}
          onProjectDataChange={handleProjectDataChange}
          onGoToProjects={handleGoToProjects}
        />
      );
    }
  }

  return content;
} // End of Home function

// Component for property editing panel
const PropertyPanel = ({ selectedNode, nodes, edges }: {
  selectedNode: Node<NodeData> | null;
  nodes: Node<NodeData>[];
  edges: Edge[];
}) => {
  const [generatedCode, setGeneratedCode] = useState<string>('# Select a node and edit properties, then click Generate');
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);
  // const [showCreateAgentDialog, setShowCreateAgentDialog] = useState<boolean>(false); // Removed as part of consolidating buttons
  const [showRunAgentDialog, setShowRunAgentDialog] = useState<boolean>(false);
  // Get context, including framework setting
  const { setNodes, framework = 'pydantic-ai' } = useContext(FlowContext); // Access framework from context
  const [editedNodeData, setEditedNodeData] = useState<NodeData | null>(null);
  // Add state to track if panel is manually closed
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(false);
  // Add ref to store the last selected node to prevent data loss
  const lastSelectedNodeRef = useRef<Node<NodeData> | null>(null);

  // Update local state when selected node changes
  useEffect(() => {
    if (selectedNode) {
      // Store a deep copy of the node data to prevent reference issues
      const nodeDataCopy = JSON.parse(JSON.stringify(selectedNode.data));

      // Ensure we preserve the node type in the data
      if (selectedNode.type && !nodeDataCopy.type) {
        nodeDataCopy.type = selectedNode.type;
      }

      setEditedNodeData(nodeDataCopy);
      setIsPanelVisible(true); // Show panel when a node is selected
      lastSelectedNodeRef.current = JSON.parse(JSON.stringify(selectedNode)); // Store a deep copy of the selected node in ref

      // Log for debugging
      console.log('PropertyPanel: Node selected', nodeDataCopy);
    } else if (!isPanelVisible) {
      // Only clear edited data if panel is not manually kept visible
      // If panel is still visible, keep the last node data
      setEditedNodeData(null);
    }
  }, [selectedNode, isPanelVisible]);

  // Add a cleanup effect to ensure we don't lose data when component unmounts
  useEffect(() => {
    return () => {
      // If we have unsaved changes and a node reference, save them before unmounting
      if (editedNodeData && lastSelectedNodeRef.current) {
        console.log('PropertyPanel: Saving changes before unmount');
        // We can't call saveNodeChanges directly in the cleanup function due to dependency issues
        // Instead, we'll manually update the nodes
        setNodes(nds => nds.map(node =>
          node.id === lastSelectedNodeRef.current?.id
            ? {...node, data: editedNodeData}
            : node
        ));
      }
    };
  }, [editedNodeData, setNodes]);

  // Handle input changes with proper type preservation
  const handleInputChange = (field: string, value: string | boolean) => {
    setEditedNodeData(prev => {
      if (!prev) return null;

      // Create a new object to ensure state updates properly trigger renders
      const updatedData = {...prev, [field]: value};

      // Ensure type information is preserved
      if (lastSelectedNodeRef.current?.type && !updatedData.type) {
        updatedData.type = lastSelectedNodeRef.current.type;
      }

      return updatedData;
    });
  };

  // Save changes to node with improved error handling
  const saveNodeChanges = () => {
    if (!editedNodeData) return;

    // Use the last selected node if the current selected node is null
    // This handles the case where the node was deselected but the panel is still open
    const nodeToUpdate = selectedNode || lastSelectedNodeRef.current;

    if (!nodeToUpdate) return;

    setNodes(nds => nds.map(node =>
      node.id === nodeToUpdate.id
        ? {...node, data: editedNodeData}
        : node
    ));

    // Update the ref with the latest data
    if (lastSelectedNodeRef.current) {
      lastSelectedNodeRef.current = {
        ...lastSelectedNodeRef.current,
        data: editedNodeData
      };
    }
  };

  // This function is no longer used since we're using the integrated workflow
  const _unused_handleNodeGenerateCode = async () => {
    if (!selectedNode) return;

    setIsGeneratingCode(true);
    setGeneratedCode('# Generating code...');

    // This is a placeholder. In a real app, you'd call an API or use a local generator
    try {
      // Mock delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const nodeType = selectedNode.type;
      let code = '';

      if (framework === 'pydantic-ai') {
        // Generate Pydantic AI code for the node
        if (nodeType === 'agent') {
          code = `from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from typing import Dict, Any, Optional

class Result(BaseModel):
    """Result model for agent responses"""
    response: str = Field(description="The agent's response")
    confidence: Optional[float] = Field(None, description="Confidence score", ge=0, le=1)

class Dependencies(BaseModel):
    """Dependencies for the agent system"""
    api_key: Optional[str] = Field(None, description="API key for external services")

# ${selectedNode.data.label} agent definition
${selectedNode.data.label.toLowerCase().replace(/ /g, '_')}_agent = Agent(
    '${selectedNode.data.agentModel || 'openai:gpt-4o'}',
    deps_type=Dependencies,
    result_type=Result,
    system_prompt="""${selectedNode.data.instruction || 'You are a helpful assistant.'}
${selectedNode.data.goal ? `Your goal is to ${selectedNode.data.goal}` : ''}""",
    instrument=True  # Enable Pydantic Logfire instrumentation
)
`;
        } else if (nodeType === 'tool') {
          code = `# Tool: ${selectedNode.data.label}
# ${selectedNode.data.description || ''}

@${selectedNode.data.label.toLowerCase().replace(/ /g, '_')}_agent.tool
async def ${selectedNode.data.label.toLowerCase().replace(/ /g, '_')}(ctx: RunContext[Dependencies], query: str) -> Dict[str, Any]:
    """${selectedNode.data.description || `${selectedNode.data.label} implementation`}"""
    ${selectedNode.data.tool_type === 'rag' ?
    '# RAG implementation\n    print(f"Processing RAG query: {query}")\n    # In a real implementation, you would retrieve from a vector database\n    return {\n        "documents": [\n            {"content": f"Document content related to {query}", "metadata": {"source": "knowledge_base"}}\n        ]\n    }'
    : selectedNode.data.tool_type === 'google-search' ?
    '# Web search implementation\n    print(f"Searching for: {query}")\n    # In a real implementation, you would use a search API\n    return {\n        "results": [\n            {"title": f"Result 1 for {query}", "snippet": "This is a search result"}\n        ]\n    }'
    : selectedNode.data.tool_type === 'code-execution' ?
    '# Code execution\n    print(f"Calculating: {query}")\n    try:\n        # Simple security check\n        if "+" in query or "-" in query or "*" in query or "/" in query:\n            safe_calculation = query.replace(" ", "")\n            if all(c.isdigit() or c in "+-*/(). " for c in safe_calculation):\n                result = eval(safe_calculation)\n                return {"result": f"{result}"}\n        return {"result": "Could not perform calculation safely"}\n    except Exception as e:\n        return {"error": str(e)}'
    : '# Generic tool implementation\n    print(f"Processing input: {query}")\n    return {"result": f"Processed: {query}"}'
    }
`;
        } else if (nodeType === 'model') {
          code = `# PydanticAI model configuration
from pydantic_ai.models import OpenAIModel, AnthropicModel, GeminiModel

# Initialize model configuration
${selectedNode.data.label.toLowerCase().replace(/ /g, '_')} = ${
            selectedNode.data.model?.includes('gpt') ? 'OpenAIModel' :
            selectedNode.data.model?.includes('claude') ? 'AnthropicModel' :
            'GeminiModel'
          }(
    model_name="${selectedNode.data.model || 'gpt-4o'}",
    temperature=${selectedNode.data.temperature || 0.7},
    max_tokens=${selectedNode.data.max_tokens || 1000}
)
`;
        }
      } else {
        // Google ADK code for the node
        if (nodeType === 'agent') {
          code = `from google.adk.agents import LlmAgent\n\n${selectedNode.data.label.toLowerCase().replace(/ /g, '_')} = LlmAgent(\n    name="${selectedNode.data.label}",\n    model="${selectedNode.data.agentModel || 'gemini-2.0-flash-exp'}"\n)\n\n# Agent Instruction:\n# ${selectedNode.data.instruction || 'Add your instruction here'}\n`;
        } else if (nodeType === 'tool') {
          code = `from google.adk.tools import ${selectedNode.data.tool_type || 'custom_tool'}\n\n# Tool: ${selectedNode.data.label}\n# ${selectedNode.data.description || ''}\n`;
        } else if (nodeType === 'model') {
          code = `# Import the model\nfrom google.ai.generativelanguage import Model\n\n# Initialize model\n${selectedNode.data.label.toLowerCase().replace(/ /g, '_')} = Model(\n    name="${selectedNode.data.model || 'gemini-2.0-flash-exp'}"\n)\n`;
        }
      }

      setGeneratedCode(code);
    } catch (error) {
      setGeneratedCode('# Error generating code');
      console.error('Error generating code:', error);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // Generate code for ALL nodes together
  // This function is kept for potential future use
  const _unused_handleGenerateAllCode = async () => {
    setIsGeneratingCode(true);
    setGeneratedCode('# Generating complete flow code...');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Use the correct code generator based on the current framework
      const code = framework === 'google-adk' ? generateFlowCode(nodes, edges) : generatePydanticFlowCode(nodes, edges);
      setGeneratedCode(code);
    } catch (error) {
      setGeneratedCode('# Error generating code for all nodes');
      console.error('Error generating code:', error);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // Function to handle the entire agent workflow: generate code, create file, run agent
  // This is the main function that runs when the user clicks "Run Agent"
  const handleRunAgentWorkflow = async () => {
    // Instead of directly generating code, show the RunAgentDialog
    // This allows the user to enter their requirements before generating the agent
    setShowRunAgentDialog(true);
  };

  // Function to create agent.py file
  // This function is now used by the RunAgentDialog component
  const handleCreateAgentFile = async (agentName: string, agentCode: string, initCode: string = 'from .agent import root_agent') => {
    try {
      // Use a path in the project directory
      // This ensures files are created in a location that's accessible
      // Use a consistent path that matches what the run-agent API expects
      const dirPath = `./app/agents/${agentName}`;

      console.log('Using directory path:', dirPath);
      console.log('Agent code length:', agentCode.length);

      // Create the directory and files using the provided agent code
      // No need for AI processing since the code is already generated by OpenAI in the RunAgentDialog component

      // Create the directory and files
      console.log('Creating agent file with path:', dirPath);

      const response = await fetch('/api/create-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dirPath,
          initPyContent: initCode,
          agentPyContent: agentCode,
        }),
      });

      // Log the raw response for debugging
      const responseText = await response.text();
      console.log('Raw API response:', responseText);

      // Parse the response back to JSON
      const result = responseText ? JSON.parse(responseText) : {};

      if (!response.ok) {
        console.error('Error response from create-agent API:', result);
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      // We already parsed the response above, so we don't need to do it again
      console.log('Agent file creation result:', result);

      // Show success notification with the actual path where the file was created and a Run Agent button
      const notification = document.createElement('div');
      notification.className = `fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 w-96`;
      notification.innerHTML = `
        <div class="flex items-center mb-2">
          <svg class="h-5 w-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM3.707 5.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
          </svg>
          <p>Agent file created successfully at <strong>${result.paths?.agentFile || `${dirPath}/agent.py`}</strong></p>
        </div>
        <div class="mt-3 flex justify-end">
          <button id="run-agent-btn" class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors" data-agent-name="${agentName}">Run Agent</button>
        </div>
      `;
      document.body.appendChild(notification);

      // Add event listener for the Run Agent button
      const runAgentBtn = notification.querySelector('#run-agent-btn');
      if (runAgentBtn) {
        runAgentBtn.addEventListener('click', async () => {
          try {
            const agentNameToRun = runAgentBtn.getAttribute('data-agent-name');
            if (!agentNameToRun) {
              throw new Error('Agent name not found');
            }

            // Update button state
            runAgentBtn.textContent = 'Starting...';
            runAgentBtn.setAttribute('disabled', 'true');
            runAgentBtn.classList.add('opacity-50', 'cursor-not-allowed');

            // Call the API to run the agent
            const runResponse = await fetch('/api/run-agent', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                agentName: agentNameToRun,
              }),
            });

            if (!runResponse.ok) {
              const errorData = await runResponse.json();
              throw new Error(errorData.error || `Server error: ${runResponse.status}`);
            }

            const runResult = await runResponse.json();
            console.log('Agent run result:', runResult);

            // Update button state
            runAgentBtn.textContent = 'Agent Running';
            runAgentBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            runAgentBtn.classList.add('bg-green-600', 'hover:bg-green-700');

            // Create a link to open the agent in the browser
            const agentLink = document.createElement('a');
            agentLink.href = runResult.url || 'http://localhost:8000';
            agentLink.target = '_blank';
            agentLink.className = 'px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors ml-2';
            agentLink.textContent = 'Open Agent';
            runAgentBtn.parentNode?.appendChild(agentLink);

          } catch (err) {
            const error = err as Error;
            console.error('Error running agent:', error);

            // Update button state to show error
            if (runAgentBtn) {
              runAgentBtn.textContent = 'Failed to Run';
              runAgentBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
              runAgentBtn.classList.add('bg-red-600', 'hover:bg-red-700');
              runAgentBtn.removeAttribute('disabled');
              runAgentBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }

            // Show error notification
            const errorNotification = document.createElement('div');
            errorNotification.className = `fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50`;
            errorNotification.innerHTML = `
              <div class="flex items-center">
                <svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.707 7.293a1 1 0 00-1.414-1.414L8.586 10l-1.293 1.293a1 1 0 00-1.414 1.414L11.414 10l4.293 4.293a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                </svg>
                <p>Error running agent: <strong>${error.message || 'Unknown error'}</strong></p>
              </div>
            `;
            document.body.appendChild(errorNotification);
            setTimeout(() => {
              errorNotification.style.opacity = '0';
              errorNotification.style.transition = 'opacity 0.5s';
              setTimeout(() => errorNotification.remove(), 500);
            }, 5000);
          }
        });
      }

      // Set a longer timeout for the notification since we have the Run Agent button
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
      }, 15000); // 15 seconds instead of 5

      // Dialog is no longer used
      // setShowCreateAgentDialog(false);
    } catch (err) {
      const error = err as Error;
      console.error('Error creating agent file:', error);

      // Show error notification
      const errorNotification = document.createElement('div');
      errorNotification.className = `fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50`;
      errorNotification.innerHTML = `
        <div class="flex items-center">
          <svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414-1.414L8.586 10l-1.293 1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
          </svg>
          <p>Error creating agent file: <strong>${error.message || 'Unknown error'}</strong></p>
        </div>
      `;
      document.body.appendChild(errorNotification);
      setTimeout(() => {
        errorNotification.style.opacity = '0';
        errorNotification.style.transition = 'opacity 0.5s';
        setTimeout(() => errorNotification.remove(), 500);
      }, 5000);
    }
  };

  if ((!selectedNode || !editedNodeData) && !isPanelVisible) {
    // Show default panel when no node is selected and panel is not manually kept visible
    return (
      <div className="h-full bg-black/30 backdrop-blur-sm border-l border-white/5 text-gray-300 p-4 w-80 flex flex-col overflow-y-auto shadow-xl">
        {/* Run Agent Dialog */}
        <RunAgentDialog
          isOpen={showRunAgentDialog}
          onClose={() => setShowRunAgentDialog(false)}
          nodes={nodes}
          edges={edges}
        />
        <div className="mb-4 pb-3 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">Flow Properties</span>
          </h3>
        </div>

        <div className="space-y-4 flex-grow">
          <div className="text-center text-sm py-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-500 mb-2" viewBox="0 0 20 20" fill="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
            <p>Select a node to edit its properties</p>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-400 mb-2">
              Node Count: <span className="font-medium text-white">{nodes.length}</span>
            </div>
            <div className="text-sm text-gray-400 mb-2">
              Edge Count: <span className="font-medium text-white">{edges.length}</span>
            </div>

            <div className="text-sm text-gray-400 mb-2">
              Agent Nodes: <span className="font-medium text-white">{nodes.filter(n => n.type === 'agent').length}</span>
            </div>
            <div className="text-sm text-gray-400 mb-2">
              Tool Nodes: <span className="font-medium text-white">{nodes.filter(n => n.type === 'tool').length}</span>
            </div>
            <div className="text-sm text-gray-400 mb-2">
              Model Nodes: <span className="font-medium text-white">{nodes.filter(n => n.type === 'model').length}</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-800 mt-4 space-y-3">
          <button
            onClick={() => handleRunAgentWorkflow()}
            disabled={isGeneratingCode || nodes.length === 0}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:hover:from-blue-600 disabled:hover:to-indigo-600"
          >
            {isGeneratingCode ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                </svg>
                Run Code
              </>
            )}
          </button>
        </div>

        {generatedCode && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <label className="block text-sm font-medium text-gray-400 mb-2">Generated Code</label>
            <div className="bg-gray-850 border border-gray-700 rounded-lg p-3 overflow-auto max-h-48">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {generatedCode}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Node editing panel (when a node is selected or panel is manually kept visible)
  // Only render if we have a node to edit or the panel is manually kept visible
  if (!editedNodeData && !isPanelVisible) {
    return null;
  }

  // Get the node type from either the selected node or the last selected node
  const nodeType = selectedNode?.type || lastSelectedNodeRef.current?.type || 'unknown';

  return (
    <div className="h-full bg-black/30 backdrop-blur-sm border-l border-white/5 text-gray-300 p-4 w-80 flex flex-col overflow-y-auto shadow-xl">
      {/* Dialogs are hidden since we're using the integrated workflow */}
      {showRunAgentDialog && (
        <RunAgentDialog
          onClose={() => setShowRunAgentDialog(false)}
          onCreateAgent={(name, code) => {
            setShowRunAgentDialog(false);
            // Handle agent creation
          }}
        />
      )}

      <div className="mb-4 pb-3 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
            {editedNodeData?.label || (lastSelectedNodeRef.current?.data?.label || 'Node')}
          </span>
          <span className="ml-2 text-xs py-0.5 px-2 bg-gray-800 rounded text-gray-400">{nodeType}</span>
        </h3>
        <button
          onClick={() => {
            setIsPanelVisible(false);
            // Don't clear the data immediately to prevent flickering if the user selects another node
            setTimeout(() => {
              if (!selectedNode) {
                setEditedNodeData(null);
              }
            }, 300);
          }}
          className="text-gray-400 hover:text-white p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l3.293-3.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
          </svg>
        </button>
      </div>

      <div className="space-y-4 flex-grow overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Label</label>
          <input
            type="text"
            value={editedNodeData?.label || ''}
            onChange={(e) => handleInputChange('label', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        {nodeType === 'agent' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Agent Model</label>
              <select
                value={editedNodeData?.agentModel || (framework === 'pydantic-ai' ? 'openai:gpt-4o' : 'gemini-2.0-flash-exp')}
                onChange={(e) => handleInputChange('agentModel', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                {framework === 'pydantic-ai' ? (
                  <>
                    <option value="openai:gpt-4o">OpenAI GPT-4o</option>
                    <option value="openai:gpt-4-turbo">OpenAI GPT-4 Turbo</option>
                    <option value="openai:gpt-3.5-turbo">OpenAI GPT-3.5 Turbo</option>
                    <option value="anthropic:claude-3-sonnet">Anthropic Claude 3 Sonnet</option>
                    <option value="anthropic:claude-3-opus">Anthropic Claude 3 Opus</option>
                    <option value="anthropic:claude-3-haiku">Anthropic Claude 3 Haiku</option>
                    <option value="google:gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                    <option value="google:gemini-1.5-flash">Google Gemini 1.5 Flash</option>
                  </>
                ) : (
                  <>
                    <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                    <option value="gemini-2.0-pro">Gemini 2.0 Pro</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Instruction</label>
              <textarea
                value={editedNodeData?.instruction || ''}
                onChange={(e) => handleInputChange('instruction', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="Instruction for the agent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Capabilities</label>
              <input
                type="text"
                value={editedNodeData?.capabilities || ''}
                onChange={(e) => handleInputChange('capabilities', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="e.g., Search & Response"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Goal</label>
              <input
                type="text"
                value={editedNodeData?.goal || ''}
                onChange={(e) => handleInputChange('goal', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="What this agent aims to achieve"
              />
            </div>
          </>
        )}

        {nodeType === 'tool' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Tool Type</label>
              <select
                value={editedNodeData?.tool_type || 'google-search'}
                onChange={(e) => handleInputChange('tool_type', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="google-search">Google Search</option>
                <option value="rag">RAG</option>
                <option value="code-execution">Code Execution</option>
                <option value="api">API Connector</option>
                <option value="function">Custom Function</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Input Type</label>
              <input
                type="text"
                value={editedNodeData?.input_type || ''}
                onChange={(e) => handleInputChange('input_type', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="e.g., Query String"
              />
            </div>
          </>
        )}

        {nodeType === 'model' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Model Name</label>
              <select
                value={editedNodeData?.model || 'gemini-2.0-flash-exp'}
                onChange={(e) => handleInputChange('model', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                <option value="gemini-2.0-pro">Gemini 2.0 Pro</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Size</label>
              <input
                type="text"
                value={editedNodeData?.size || ''}
                onChange={(e) => handleInputChange('size', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="e.g., Standard Model"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
          <textarea
            value={editedNodeData?.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            placeholder="Description"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-800 mt-4 space-y-3">
        <button
          onClick={saveNodeChanges}
          className="w-full px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-colors flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
          </svg>
          Save Changes
        </button>

        <button
          onClick={handleRunAgentWorkflow}
          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
          </svg>
          Run Code
        </button>
      </div>

      {generatedCode && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <label className="block text-sm font-medium text-gray-400 mb-2">Generated Code</label>
          <div className="bg-gray-850 border border-gray-700 rounded-lg p-3 overflow-auto max-h-48">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {generatedCode}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

// Project management dropdown for the header
const HeaderProjectManager = ({
    projects,
    activeProjectId,
    onSelectProject,
    onCreateProject,
    onDeleteProject
}: {
    projects: ProjectMeta[];
    activeProjectId: string | null;
    onSelectProject: (id: string) => void;
    onCreateProject: (name: string) => void;
    onDeleteProject: (id: string) => void;
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Element)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleCreate = () => {
        if (newProjectName.trim()) {
            onCreateProject(newProjectName.trim());
            setNewProjectName('');
            setShowCreateInput(false);
            setIsDropdownOpen(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, projectId: string, projectName: string) => {
        e.stopPropagation(); // Don't select the project when deleting
        if (window.confirm(`Are you sure you want to delete "${projectName}"? This cannot be undone.`)) {
            onDeleteProject(projectId);
            if (activeProjectId === projectId) {
                setIsDropdownOpen(false);
            }
        }
    };

    // Get active project name
    const activeProject = projects.find(p => p.id === activeProjectId);

    return (
        <div className="relative z-20" ref={dropdownRef}>
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center px-3 py-1.5 bg-black/30 hover:bg-black/50 rounded-lg text-white text-sm transition-colors border border-white/10"
            >
                <span className="mr-2">
                    {activeProject ? activeProject.name : 'Select Project'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
            </button>

            {isDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 backdrop-blur-sm backdrop-filter bg-black/40 border border-white/10 rounded-lg shadow-2xl divide-y divide-white/10 overflow-hidden">
                    {/* Projects List */}
                    <div className="max-h-64 overflow-y-auto">
                        {projects.length === 0 ? (
                            <div className="p-3 text-sm text-gray-400 text-center">
                                No projects yet
                            </div>
                        ) : (
                            <div>
                                {projects.map(project => (
                                    <div
                                        key={project.id}
                                        onClick={() => {
                                            onSelectProject(project.id);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`px-3 py-2 flex justify-between items-center hover:bg-white/5 cursor-pointer transition-colors ${project.id === activeProjectId ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-l-2 border-purple-500' : ''}`}
                                    >
                                        <div className="truncate">
                                            <div className="text-sm text-white font-medium truncate">{project.name}</div>
                                            <div className="text-xs text-gray-400">{new Date(project.lastModified).toLocaleString()}</div>
                                        </div>
                                        {project.id !== activeProjectId && (
                                            <button
                                                onClick={(e) => handleDeleteClick(e, project.id, project.name)}
                                                className="text-gray-400 hover:text-red-400 p-1 transition-colors rounded-full hover:bg-red-500/10"
                                                title={`Delete ${project.name}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4.75 12.094A1 1 0 004 15v3H1v-3a3 3 0 013.75-2.906z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Create New Project */}
                    <div className="p-3">
                        {showCreateInput ? (
                            <div className="flex items-center">
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="Project name..."
                                    className="flex-grow px-2 py-1.5 text-sm bg-black/30 border border-white/10 rounded-l text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                />
                                <button
                                    onClick={handleCreate}
                                    className="px-2 py-1.5 bg-purple-600 text-white text-sm rounded-r hover:bg-purple-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowCreateInput(true)}
                                className="w-full px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-sm text-purple-300 rounded flex items-center justify-center transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4.75 12.094A1 1 0 004 15v3H1v-3a3 3 0 013.75-2.906z" clipRule="evenodd" />
                                </svg>
                                New Project
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Component for draggable items in sidebar
// Using the imported DraggableComponent instead of defining it here
/* const DraggableComponent = ({ type, label, description = '', tool_type = '', className = '' }: {
  type: string;
  label: string;
  description?: string;
  tool_type?: string;
  className?: string
}) => {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/reactflow/type', type);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.setData('application/reactflow/description', description);
    event.dataTransfer.setData('application/reactflow/tool_type', tool_type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`p-3 backdrop-blur-sm backdrop-filter bg-black/30 border border-white/10 rounded-lg cursor-move flex items-center gap-2 hover:bg-black/50 transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-purple-500/5 transform hover:-translate-y-0.5 ${className}`}
      draggable
      onDragStart={onDragStart}
    >
      <div className={`p-1.5 rounded-full ${
        type === 'agent'
          ? 'bg-gradient-to-r from-purple-600 to-blue-600'
          : type === 'tool'
          ? 'bg-gradient-to-r from-blue-600 to-purple-600'
          : 'bg-gradient-to-r from-violet-600 to-indigo-600'} text-white shadow-md`}
      >
        {type === 'agent' && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'tool' && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'model' && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zm5 2a2 2 0 11-4 0 2 2 0 014 0zm-4 7a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zm10 10v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-white text-sm font-medium">{label}</span>
        {description && <span className="text-gray-400 text-xs">{description}</span>}
      </div>
    </div>
  );
};*/

// End of file