interface MCPTypeConfig {
  id: string;
  name: string;
  command: string;
  defaultArgs: string[];
  defaultEnvVars: {
    'NODE_OPTIONS': string;
    'GITHUB_PERSONAL_ACCESS_TOKEN'?: string;
    'LOCAL_TIMEZONE'?: string;
  };
}

export const MCP_TYPES: MCPTypeConfig[] = [
  { 
    id: 'github', 
    name: 'GitHub MCP', 
    command: 'npx', 
    defaultArgs: ['-y', '@modelcontextprotocol/server-github'],
    defaultEnvVars: {
      'NODE_OPTIONS': '--no-warnings --experimental-fetch',
      'GITHUB_PERSONAL_ACCESS_TOKEN': ''
    }
  },
  { 
    id: 'time', 
    name: 'Time MCP', 
    command: 'uvx', 
    defaultArgs: ['mcp-server-time'],
    defaultEnvVars: {
      'NODE_OPTIONS': '--no-warnings --experimental-fetch',
      'LOCAL_TIMEZONE': Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  },
  { 
    id: 'filesystem', 
    name: 'Filesystem MCP', 
    command: 'npx', 
    defaultArgs: ['-y', '@modelcontextprotocol/server-filesystem'],
    defaultEnvVars: {
      'NODE_OPTIONS': '--no-warnings --experimental-fetch'
    }
  },
]; 