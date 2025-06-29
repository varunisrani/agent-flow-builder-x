import React, { memo } from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';
import { Card } from '../ui/card.js';
import { Settings, Trash } from 'lucide-react';
import { Button } from '../ui/button.js';

// Modify the interface to extend Record<string, unknown>
export interface BaseNodeData extends Record<string, unknown> {
  id?: string;
  label: string;
  type: 'agent' | 'tool' | 'input' | 'output' | 'model' | 'mcp-client' | 'mcp-server' | 'mcp-tool' | 'langfuse' | 'memory' | 'event-handling';
  nodeType?: 'agent' | 'tool' | 'input' | 'output' | 'model' | 'mcp-client' | 'mcp-server' | 'mcp-tool' | 'langfuse' | 'memory' | 'event-handling';
  description?: string;
  instruction?: string;
  prompt?: string;
  modelType?: string;
  // Agent-specific properties
  agentName?: string;
  agentDescription?: string;
  agentInstruction?: string;
  agentModel?: string;
  // Model-specific properties
  modelName?: string;
  // Tool-specific properties
  toolName?: string;
  toolDescription?: string;
  // Server-specific properties
  serverName?: string;
  serverDescription?: string;
  // Available functions
  availableFunctions?: string;
  mcpUrl?: string;
  mcpToolId?: string;
  mcpCommand?: string;
  mcpArgs?: string | string[];
  mcpEnvVars?: string | { [key: string]: string };
  smitheryMcp?: string;
  smitheryApiKey?: string;
  mcpType?: string;
  profileId?: string;
  // Langfuse-specific properties
  langfusePublicKey?: string;
  langfuseSecretKey?: string;
  langfuseHost?: string;
  langfuseProjectName?: string;
  langfuseEnabled?: boolean;
  // Memory-specific properties
  memoryApiKey?: string;
  memoryHost?: string;
  memoryUserId?: string;
  memoryOrganization?: string;
  memoryEnabled?: boolean;
  memoryType?: 'preferences' | 'conversation' | 'knowledge' | 'all';
  memoryRetention?: number;
  // Event handling-specific properties
  eventHandlingEnabled?: boolean;
  eventTypes?: string[];
  eventMiddleware?: string[];
  eventListeners?: { [key: string]: boolean };
  eventHistoryEnabled?: boolean;
  eventAnalyticsEnabled?: boolean;
}



export interface BaseNodeProps {
  id: string;
  data: BaseNodeData;
  selected: boolean;
}

const BaseNode = ({ id, data, selected }: BaseNodeProps) => {
  const { label, type, description } = data;
  
  // Define node colors based on type
  const getNodeColor = () => {
    switch (type) {
      case 'agent':
        return 'bg-primary/20 border-primary/40';
      case 'tool':
        return 'bg-blue-500/20 border-blue-500/40';
      case 'model':
        return 'bg-purple-500/20 border-purple-500/40';
      case 'input':
        return 'bg-green-500/20 border-green-500/40';
      case 'output':
        return 'bg-orange-500/20 border-orange-500/40';
      case 'mcp-client':
        return 'bg-yellow-500/20 border-yellow-500/40';
      case 'mcp-server':
        return 'bg-red-500/20 border-red-500/40';
      case 'mcp-tool':
        return 'bg-indigo-500/20 border-indigo-500/40';
      case 'langfuse':
        return 'bg-violet-500/20 border-violet-500/40';
      case 'memory':
        return 'bg-pink-500/20 border-pink-500/40';
      case 'event-handling':
        return 'bg-amber-500/20 border-amber-500/40';
      default:
        return 'bg-secondary/20 border-secondary/40';
    }
  };
  
  return (
    <div className="relative">
      {selected && (
        <NodeToolbar className="absolute -top-10 glass-card rounded-md p-1 border border-white/10">
          <Button size="icon" variant="ghost" className="h-7 w-7">
            <Settings className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500">
            <Trash className="h-4 w-4" />
          </Button>
        </NodeToolbar>
      )}
      
      <Card className={`w-48 p-3 shadow-md ${getNodeColor()}`}>
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-1">{description}</div>
        )}
        <div className="text-xs text-muted-foreground mt-2 py-0.5 px-1.5 bg-background/40 rounded inline-block">
          {type}
        </div>
      </Card>
      
      {/* Add the right handle for source */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-background border-2 border-foreground/40" 
      />
      
      {/* Add the left handle for target */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-background border-2 border-foreground/40" 
      />
    </div>
  );
};

// Export the component as default
export default memo(BaseNode);
