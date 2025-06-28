import { useCallback, useEffect, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useUndoRedo } from './useUndoRedo';
import { BaseNodeData } from '@/components/nodes/BaseNode';

interface FlowState {
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
  timestamp: number;
  description?: string;
}

interface UseFlowHistoryProps {
  initialNodes: Node<BaseNodeData>[];
  initialEdges: Edge[];
  onNodesChange?: (nodes: Node<BaseNodeData>[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  debounceMs?: number;
  maxHistorySize?: number;
}

export function useFlowHistory({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  debounceMs = 500,
  maxHistorySize = 50
}: UseFlowHistoryProps) {
  
  const initialState: FlowState = {
    nodes: initialNodes,
    edges: initialEdges,
    timestamp: Date.now(),
    description: 'Initial state'
  };

  const {
    state: currentState,
    set: setState,
    undo,
    redo,
    canUndo,
    canRedo
  } = useUndoRedo<FlowState>(initialState);

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedStateRef = useRef<string>('');

  // Create a serializable state snapshot
  const createSnapshot = useCallback((
    nodes: Node<BaseNodeData>[], 
    edges: Edge[], 
    description?: string
  ): FlowState => {
    return {
      nodes: JSON.parse(JSON.stringify(nodes)), // Deep clone to avoid reference issues
      edges: JSON.parse(JSON.stringify(edges)),
      timestamp: Date.now(),
      description
    };
  }, []);

  // Check if state has actually changed
  const hasStateChanged = useCallback((
    nodes: Node<BaseNodeData>[], 
    edges: Edge[]
  ): boolean => {
    const currentSnapshot = JSON.stringify({ nodes, edges });
    if (currentSnapshot === lastSavedStateRef.current) {
      return false;
    }
    lastSavedStateRef.current = currentSnapshot;
    return true;
  }, []);

  // Debounced save to history
  const saveToHistory = useCallback((
    nodes: Node<BaseNodeData>[], 
    edges: Edge[], 
    description?: string
  ) => {
    if (!hasStateChanged(nodes, edges)) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      const snapshot = createSnapshot(nodes, edges, description);
      setState(snapshot);
    }, debounceMs);
  }, [hasStateChanged, createSnapshot, setState, debounceMs]);

  // Handle undo operation
  const handleUndo = useCallback(() => {
    undo();
    if (onNodesChange) {
      onNodesChange(currentState.nodes);
    }
    if (onEdgesChange) {
      onEdgesChange(currentState.edges);
    }
  }, [undo, currentState, onNodesChange, onEdgesChange]);

  // Handle redo operation
  const handleRedo = useCallback(() => {
    redo();
    if (onNodesChange) {
      onNodesChange(currentState.nodes);
    }
    if (onEdgesChange) {
      onEdgesChange(currentState.edges);
    }
  }, [redo, currentState, onNodesChange, onEdgesChange]);

  // Update external state when history state changes
  useEffect(() => {
    if (onNodesChange) {
      onNodesChange(currentState.nodes);
    }
    if (onEdgesChange) {
      onEdgesChange(currentState.edges);
    }
  }, [currentState, onNodesChange, onEdgesChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Save to history when nodes or edges change
  const updateNodes = useCallback((
    nodes: Node<BaseNodeData>[], 
    description?: string
  ) => {
    saveToHistory(nodes, currentState.edges, description || 'Nodes updated');
  }, [saveToHistory, currentState.edges]);

  const updateEdges = useCallback((
    edges: Edge[], 
    description?: string
  ) => {
    saveToHistory(currentState.nodes, edges, description || 'Edges updated');
  }, [saveToHistory, currentState.nodes]);

  const updateFlow = useCallback((
    nodes: Node<BaseNodeData>[], 
    edges: Edge[], 
    description?: string
  ) => {
    saveToHistory(nodes, edges, description || 'Flow updated');
  }, [saveToHistory]);

  // Force save current state (useful for major operations)
  const saveState = useCallback((description?: string) => {
    const snapshot = createSnapshot(currentState.nodes, currentState.edges, description);
    setState(snapshot);
  }, [createSnapshot, currentState, setState]);

  // Get history statistics
  const getHistoryStats = useCallback(() => {
    // Note: This would require access to the internal state of useUndoRedo
    // For now, we'll return basic info
    return {
      canUndo,
      canRedo,
      currentTimestamp: currentState.timestamp,
      currentDescription: currentState.description
    };
  }, [canUndo, canRedo, currentState]);

  return {
    // Current state
    nodes: currentState.nodes,
    edges: currentState.edges,
    
    // History controls
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
    
    // State updaters
    updateNodes,
    updateEdges,
    updateFlow,
    saveState,
    
    // Utilities
    getHistoryStats,
    
    // Current state info
    currentDescription: currentState.description,
    lastModified: currentState.timestamp
  };
}