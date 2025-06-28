import { useCallback, useEffect, useRef, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '@/components/nodes/BaseNode';
import { MCPConfig } from '@/lib/codeGeneration';
import { useRecovery } from '@/services/recoveryService';
import { toast } from '@/hooks/use-toast';

interface AutoSaveOptions {
  debounceMs?: number;
  enableRecovery?: boolean;
  enableConflictDetection?: boolean;
  maxRetries?: number;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
  onConflictDetected?: () => void;
}

interface SaveState {
  isSaving: boolean;
  lastSaved: number | null;
  saveError: Error | null;
  conflictDetected: boolean;
  retryCount: number;
}

export function useAutoSave(
  projectId: string,
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  mcpConfig: MCPConfig[] | undefined,
  saveFunction: (projectId: string, nodes: Node<BaseNodeData>[], edges: Edge[]) => Promise<void> | void,
  options: AutoSaveOptions = {}
) {
  const {
    debounceMs = 2000,
    enableRecovery = true,
    enableConflictDetection = false,
    maxRetries = 3,
    onSaveSuccess,
    onSaveError,
    onConflictDetected
  } = options;

  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSaved: null,
    saveError: null,
    conflictDetected: false,
    retryCount: 0
  });

  const recovery = useRecovery();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedDataRef = useRef<string>('');
  const saveInProgressRef = useRef(false);
  const conflictCheckRef = useRef<NodeJS.Timeout>();

  // Generate a hash of the current state for comparison
  const generateStateHash = useCallback((
    nodes: Node<BaseNodeData>[],
    edges: Edge[],
    mcpConfig?: MCPConfig[]
  ): string => {
    const state = { nodes, edges, mcpConfig };
    return JSON.stringify(state);
  }, []);

  // Check if the state has actually changed
  const hasStateChanged = useCallback((): boolean => {
    const currentHash = generateStateHash(nodes, edges, mcpConfig);
    if (currentHash === lastSavedDataRef.current) {
      return false;
    }
    return true;
  }, [nodes, edges, mcpConfig, generateStateHash]);

  // Perform the actual save operation
  const performSave = useCallback(async (
    reason: 'auto-save' | 'manual-save' | 'recovery' = 'auto-save'
  ): Promise<boolean> => {
    if (!projectId || saveInProgressRef.current || !hasStateChanged()) {
      return false;
    }

    saveInProgressRef.current = true;
    setSaveState(prev => ({ 
      ...prev, 
      isSaving: true, 
      saveError: null 
    }));

    try {
      // Save to main storage
      const saveResult = saveFunction(projectId, nodes, edges);
      if (saveResult instanceof Promise) {
        await saveResult;
      }

      // Save recovery snapshot if enabled
      if (enableRecovery) {
        recovery.saveSnapshot(
          projectId,
          nodes,
          edges,
          mcpConfig,
          reason
        );
      }

      // Update state tracking
      const currentHash = generateStateHash(nodes, edges, mcpConfig);
      lastSavedDataRef.current = currentHash;

      setSaveState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: Date.now(),
        saveError: null,
        retryCount: 0
      }));

      onSaveSuccess?.();
      return true;

    } catch (error) {
      const saveError = error instanceof Error ? error : new Error('Save failed');
      
      setSaveState(prev => ({
        ...prev,
        isSaving: false,
        saveError,
        retryCount: prev.retryCount + 1
      }));

      // Retry logic
      if (saveState.retryCount < maxRetries) {
        console.warn(`Save failed, retrying in 5 seconds (attempt ${saveState.retryCount + 1}/${maxRetries}):`, saveError);
        setTimeout(() => {
          performSave(reason);
        }, 5000);
      } else {
        console.error('Save failed after all retries:', saveError);
        onSaveError?.(saveError);
        
        // Show error toast
        toast({
          title: "Auto-save failed",
          description: "Your changes may not be saved. Please save manually.",
          variant: "destructive",
        });
      }

      return false;
    } finally {
      saveInProgressRef.current = false;
    }
  }, [
    projectId,
    nodes,
    edges,
    mcpConfig,
    saveFunction,
    enableRecovery,
    hasStateChanged,
    generateStateHash,
    recovery,
    saveState.retryCount,
    maxRetries,
    onSaveSuccess,
    onSaveError
  ]);

  // Debounced auto-save
  const scheduleAutoSave = useCallback(() => {
    if (!hasStateChanged()) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      performSave('auto-save');
    }, debounceMs);
  }, [hasStateChanged, performSave, debounceMs]);

  // Manual save function
  const saveNow = useCallback(async (): Promise<boolean> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    return await performSave('manual-save');
  }, [performSave]);

  // Force save (bypasses change detection)
  const forceSave = useCallback(async (): Promise<boolean> => {
    const originalRef = lastSavedDataRef.current;
    lastSavedDataRef.current = ''; // Force change detection
    const result = await performSave('manual-save');
    if (!result) {
      lastSavedDataRef.current = originalRef; // Restore if save failed
    }
    return result;
  }, [performSave]);

  // Conflict detection
  const checkForConflicts = useCallback(() => {
    if (!enableConflictDetection || !projectId) return;

    // This would integrate with a backend service to detect conflicts
    // For now, it's a placeholder for future implementation
    const hasConflict = false; // Placeholder logic

    if (hasConflict) {
      setSaveState(prev => ({ ...prev, conflictDetected: true }));
      onConflictDetected?.();
    }
  }, [enableConflictDetection, projectId, onConflictDetected]);

  // Effect to trigger auto-save on state changes
  useEffect(() => {
    if (projectId && (nodes.length > 0 || edges.length > 0)) {
      scheduleAutoSave();
    }
  }, [nodes, edges, mcpConfig, projectId, scheduleAutoSave]);

  // Effect for periodic conflict checking
  useEffect(() => {
    if (enableConflictDetection) {
      conflictCheckRef.current = setInterval(checkForConflicts, 30000); // Check every 30 seconds
      return () => {
        if (conflictCheckRef.current) {
          clearInterval(conflictCheckRef.current);
        }
      };
    }
  }, [enableConflictDetection, checkForConflicts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (conflictCheckRef.current) {
        clearInterval(conflictCheckRef.current);
      }
    };
  }, []);

  // Save on page visibility change (when user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasStateChanged()) {
        // Save immediately when page becomes hidden
        performSave('auto-save');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasStateChanged, performSave]);

  // Emergency save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasStateChanged()) {
        // Attempt synchronous save for emergency
        try {
          const result = saveFunction(projectId, nodes, edges);
          if (!(result instanceof Promise)) {
            // Only for synchronous saves
            if (enableRecovery) {
              recovery.saveSnapshot(projectId, nodes, edges, mcpConfig, 'session-backup');
            }
          }
        } catch (error) {
          console.error('Emergency save failed:', error);
        }

        // Show browser warning
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasStateChanged, projectId, nodes, edges, mcpConfig, saveFunction, enableRecovery, recovery]);

  // Get time since last save
  const getTimeSinceLastSave = useCallback((): number | null => {
    if (!saveState.lastSaved) return null;
    return Date.now() - saveState.lastSaved;
  }, [saveState.lastSaved]);

  // Check if data needs saving
  const needsSaving = useCallback((): boolean => {
    return hasStateChanged() && !saveState.isSaving;
  }, [hasStateChanged, saveState.isSaving]);

  return {
    // State
    isSaving: saveState.isSaving,
    lastSaved: saveState.lastSaved,
    saveError: saveState.saveError,
    conflictDetected: saveState.conflictDetected,
    retryCount: saveState.retryCount,
    
    // Actions
    saveNow,
    forceSave,
    
    // Utilities
    getTimeSinceLastSave,
    needsSaving,
    hasUnsavedChanges: hasStateChanged
  };
}