
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { memo } from 'react';

export interface BaseNodeData {
  label: string;
  icon?: React.ReactNode;
  type: 'agent' | 'model' | 'tool' | 'function' | 'input' | 'output';
  description?: string;
  [key: string]: unknown;
}

// Use memo to optimize rendering performance for nodes
export const BaseNode = memo(({ 
  data, 
  selected,
  id 
}: NodeProps<BaseNodeData>) => {
  // If data is completely missing, provide a default object
  const safeData: BaseNodeData = data || {
    label: 'Unnamed Node',
    type: 'input',
    description: ''
  };
  
  const nodeStyles = {
    agent: 'border-purple-500/30 bg-purple-500/10',
    model: 'border-blue-500/30 bg-blue-500/10',
    tool: 'border-green-500/30 bg-green-500/10',
    function: 'border-yellow-500/30 bg-yellow-500/10',
    input: 'border-gray-500/30 bg-gray-500/10',
    output: 'border-gray-500/30 bg-gray-500/10'
  };
  
  return (
    <div 
      className={cn(
        "px-4 py-3 rounded-md border min-w-48 backdrop-blur-md",
        nodeStyles[safeData.type],
        selected && "ring-2 ring-primary"
      )}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-primary border-2 border-background" 
      />
      
      <div className="flex items-center space-x-2">
        {safeData.icon && <div className="text-lg text-primary">{safeData.icon}</div>}
        <div className="text-sm font-medium">{safeData.label}</div>
      </div>
      
      {safeData.description && (
        <div className="mt-1 text-xs text-muted-foreground">{safeData.description}</div>
      )}
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-accent border-2 border-background" 
      />
    </div>
  );
});

BaseNode.displayName = 'BaseNode';
