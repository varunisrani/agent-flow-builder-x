
import React, { memo } from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';
import { Card } from '../ui/card';
import { Settings, Trash } from 'lucide-react';
import { Button } from '../ui/button';

// Modify the interface to extend Record<string, unknown>
export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  type: 'agent' | 'tool' | 'input' | 'output' | 'model';
  description?: string;
  instruction?: string;
  modelType?: string;
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
