// No longer need toast import
// import { toast } from '@/hooks/use-toast';

import axios, { AxiosError } from 'axios';

// Base API URL - hardcoded for browser environment
const API_BASE_URL = 'http://localhost:3001/api';

// Interface for create agent params
export interface CreateAgentParams {
  agentName: string;
  code: string;
  // Optional parameters
  dirPath?: string;
  agentPyContent?: string;
  initPyContent?: string;
}

// Interface for run agent params
export interface RunAgentParams {
  agentPath?: string;
  agentName?: string;
}

// Agent response
export interface AgentResponse {
  success: boolean;
  message: string;
  error?: string;
  paths?: {
    agentFile: string;
    initFile: string;
    venv: string | null;
  };
  urls?: {
    agentUrl: string;
    adkConsoleUrl: string;
  };
}

// Interfaces for new functions
export interface CreateAgentRequest {
  agentName: string;
  code: string;
}

export interface CreateAgentResponse {
  success: boolean;
  error?: string;
  paths?: {
    agentFile: string;
    [key: string]: string;
  };
}

export interface RunAgentRequest {
  agentName: string;
}

export interface RunAgentResponse {
  success: boolean;
  error?: string;
  urls?: {
    agentUrl: string;
    [key: string]: string;
  };
}

export interface GenerateCodeRequest {
  nodes: Array<{
    id: string;
    data: Record<string, any>;
    position?: { x: number; y: number };
    [key: string]: any;
  }>;
  edges: Array<{
    id?: string;
    source: string;
    target: string;
    [key: string]: any;
  }>;
  mcpEnabled: boolean;
}

export interface GenerateCodeResponse {
  success: boolean;
  code: string;
  error?: string;
}

/**
 * Creates an agent by saving code to files and setting up a Python environment
 */
export const createAgent = async (request: CreateAgentRequest): Promise<CreateAgentResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/agents/create`, request);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
    return { 
      success: false, 
      error: 'Unknown error occurred while creating agent' 
    };
  }
};

/**
 * Runs an agent using the ADK web command
 */
export const runAgent = async (request: RunAgentRequest): Promise<RunAgentResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/agents/run`, request);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
    return { 
      success: false, 
      error: 'Unknown error occurred while running agent' 
    };
  }
};

/**
 * Generate code using OpenAI from the flow diagram
 */
export const generateAgentCode = async (request: GenerateCodeRequest): Promise<GenerateCodeResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/agents/generate-code`, request);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { 
        success: false, 
        code: '', 
        error: error.response?.data?.error || error.message 
      };
    }
    return { 
      success: false, 
      code: '',
      error: 'Unknown error occurred while generating code' 
    };
  }
};

/**
 * Helper function to check if an agent exists
 */
export const checkAgentExists = async (agentName: string): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/check-agent?name=${agentName}`);
    return response.data.exists;
  } catch (error) {
    console.error('Error checking if agent exists:', error);
    return false;
  }
}; 