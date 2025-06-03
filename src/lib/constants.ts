interface MCPTypeConfig {
  id: string;
  name: string;
  command: string;
  defaultArgs: string[];
  defaultEnvVars: {
    'NODE_OPTIONS': string;
    'SMITHERY_API_KEY'?: string;
  };
  smitheryMcp?: string;
}

export const MCP_TYPES: MCPTypeConfig[] = [
  { 
    id: 'smithery', 
    name: 'Smithery MCP', 
    command: 'npx', 
    defaultArgs: ['-y', '@smithery/cli@latest', 'run', ''],
    defaultEnvVars: {
      'NODE_OPTIONS': '--no-warnings --experimental-fetch',
      'SMITHERY_API_KEY': ''
    },
    smitheryMcp: ''
  }
]; 