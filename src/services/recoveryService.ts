import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '@/components/nodes/BaseNode';
import { MCPConfig } from '@/lib/codeGeneration';

interface ProjectState {
  id: string;
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
  mcpConfig?: MCPConfig[];
  timestamp: number;
  version: string;
  userId?: string;
}

interface RecoverySnapshot {
  projectId: string;
  state: ProjectState;
  reason: 'auto-save' | 'manual-save' | 'error-recovery' | 'session-backup';
  timestamp: number;
  browserSession: string;
}

interface RecoveryMetadata {
  snapshots: RecoverySnapshot[];
  lastCleanup: number;
  version: string;
}

class RecoveryService {
  private readonly STORAGE_KEY = 'cogentx-recovery';
  private readonly METADATA_KEY = 'cogentx-recovery-metadata';
  private readonly MAX_SNAPSHOTS = 20;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly RECOVERY_VERSION = '1.0.0';
  private readonly sessionId: string;

  constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.initializeRecovery();
  }

  private initializeRecovery(): void {
    // Clean up old snapshots on initialization
    this.cleanupOldSnapshots();

    // Set up auto-cleanup interval
    setInterval(() => {
      this.cleanupOldSnapshots();
    }, this.CLEANUP_INTERVAL);

    // Handle page visibility changes for session backup
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden();
      }
    });

    // Handle before unload for emergency backup
    window.addEventListener('beforeunload', () => {
      this.handleBeforeUnload();
    });
  }

  private getStorageKey(projectId: string): string {
    return `${this.STORAGE_KEY}-${projectId}`;
  }

  private getMetadata(): RecoveryMetadata {
    try {
      const stored = localStorage.getItem(this.METADATA_KEY);
      if (stored) {
        const metadata = JSON.parse(stored) as RecoveryMetadata;
        if (metadata.version === this.RECOVERY_VERSION) {
          return metadata;
        }
      }
    } catch (error) {
      console.warn('Failed to load recovery metadata:', error);
    }

    return {
      snapshots: [],
      lastCleanup: Date.now(),
      version: this.RECOVERY_VERSION
    };
  }

  private saveMetadata(metadata: RecoveryMetadata): void {
    try {
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save recovery metadata:', error);
      // If storage is full, try to free up space
      this.emergencyCleanup();
    }
  }

  private emergencyCleanup(): void {
    const metadata = this.getMetadata();
    // Keep only the 5 most recent snapshots
    metadata.snapshots = metadata.snapshots
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    
    // Remove old snapshot data
    metadata.snapshots.forEach(snapshot => {
      try {
        localStorage.removeItem(this.getStorageKey(snapshot.projectId));
      } catch (error) {
        console.warn('Failed to remove snapshot:', error);
      }
    });

    this.saveMetadata(metadata);
  }

  private cleanupOldSnapshots(): void {
    const metadata = this.getMetadata();
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Remove snapshots older than 7 days
    const validSnapshots = metadata.snapshots.filter(snapshot => {
      const isValid = (now - snapshot.timestamp) < maxAge;
      if (!isValid) {
        try {
          localStorage.removeItem(this.getStorageKey(snapshot.projectId));
        } catch (error) {
          console.warn('Failed to remove old snapshot:', error);
        }
      }
      return isValid;
    });

    // Keep only the most recent snapshots per project
    const snapshotsByProject = new Map<string, RecoverySnapshot[]>();
    validSnapshots.forEach(snapshot => {
      const existing = snapshotsByProject.get(snapshot.projectId) || [];
      existing.push(snapshot);
      snapshotsByProject.set(snapshot.projectId, existing);
    });

    const finalSnapshots: RecoverySnapshot[] = [];
    snapshotsByProject.forEach((snapshots, projectId) => {
      // Keep only the 5 most recent snapshots per project
      const recent = snapshots
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
      finalSnapshots.push(...recent);
    });

    metadata.snapshots = finalSnapshots;
    metadata.lastCleanup = now;
    this.saveMetadata(metadata);
  }

  public saveSnapshot(
    projectId: string,
    nodes: Node<BaseNodeData>[],
    edges: Edge[],
    mcpConfig?: MCPConfig[],
    reason: RecoverySnapshot['reason'] = 'auto-save',
    userId?: string
  ): boolean {
    try {
      const state: ProjectState = {
        id: projectId,
        nodes: JSON.parse(JSON.stringify(nodes)), // Deep clone
        edges: JSON.parse(JSON.stringify(edges)),
        mcpConfig: mcpConfig ? JSON.parse(JSON.stringify(mcpConfig)) : undefined,
        timestamp: Date.now(),
        version: this.RECOVERY_VERSION,
        userId
      };

      const snapshot: RecoverySnapshot = {
        projectId,
        state,
        reason,
        timestamp: Date.now(),
        browserSession: this.sessionId
      };

      // Save the snapshot data
      const storageKey = this.getStorageKey(projectId);
      localStorage.setItem(storageKey, JSON.stringify(snapshot));

      // Update metadata
      const metadata = this.getMetadata();
      
      // Remove any existing snapshot for this project from this session
      metadata.snapshots = metadata.snapshots.filter(
        s => !(s.projectId === projectId && s.browserSession === this.sessionId)
      );
      
      metadata.snapshots.push(snapshot);
      
      // Keep only the most recent snapshots
      if (metadata.snapshots.length > this.MAX_SNAPSHOTS) {
        const toRemove = metadata.snapshots
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(0, metadata.snapshots.length - this.MAX_SNAPSHOTS);
        
        toRemove.forEach(snap => {
          try {
            localStorage.removeItem(this.getStorageKey(snap.projectId));
          } catch (error) {
            console.warn('Failed to remove old snapshot:', error);
          }
        });

        metadata.snapshots = metadata.snapshots
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, this.MAX_SNAPSHOTS);
      }

      this.saveMetadata(metadata);
      return true;
    } catch (error) {
      console.error('Failed to save recovery snapshot:', error);
      
      // If storage failed, try emergency cleanup and retry once
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.emergencyCleanup();
        try {
          return this.saveSnapshot(projectId, nodes, edges, mcpConfig, 'error-recovery', userId);
        } catch (retryError) {
          console.error('Failed to save snapshot after cleanup:', retryError);
        }
      }
      
      return false;
    }
  }

  public loadSnapshot(projectId: string): RecoverySnapshot | null {
    try {
      const storageKey = this.getStorageKey(projectId);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const snapshot = JSON.parse(stored) as RecoverySnapshot;
        if (snapshot.state.version === this.RECOVERY_VERSION) {
          return snapshot;
        }
      }
    } catch (error) {
      console.error('Failed to load recovery snapshot:', error);
    }
    return null;
  }

  public getAvailableSnapshots(): { projectId: string; timestamp: number; reason: string }[] {
    const metadata = this.getMetadata();
    return metadata.snapshots.map(snapshot => ({
      projectId: snapshot.projectId,
      timestamp: snapshot.timestamp,
      reason: snapshot.reason
    }));
  }

  public hasRecoveryData(projectId: string): boolean {
    return this.loadSnapshot(projectId) !== null;
  }

  public clearRecoveryData(projectId: string): void {
    try {
      const storageKey = this.getStorageKey(projectId);
      localStorage.removeItem(storageKey);

      const metadata = this.getMetadata();
      metadata.snapshots = metadata.snapshots.filter(s => s.projectId !== projectId);
      this.saveMetadata(metadata);
    } catch (error) {
      console.error('Failed to clear recovery data:', error);
    }
  }

  public clearAllRecoveryData(): void {
    try {
      const metadata = this.getMetadata();
      metadata.snapshots.forEach(snapshot => {
        try {
          localStorage.removeItem(this.getStorageKey(snapshot.projectId));
        } catch (error) {
          console.warn('Failed to remove snapshot:', error);
        }
      });

      localStorage.removeItem(this.METADATA_KEY);
    } catch (error) {
      console.error('Failed to clear all recovery data:', error);
    }
  }

  private handlePageHidden(): void {
    // Save session backup when page becomes hidden
    // This will be called when user switches tabs or minimizes browser
    try {
      const activeProject = this.getActiveProject();
      if (activeProject) {
        // Session backup logic would go here
        console.log('Page hidden - session backup triggered');
      }
    } catch (error) {
      console.warn('Failed to handle page hidden:', error);
    }
  }

  private handleBeforeUnload(): void {
    // Emergency backup before page unload
    try {
      const activeProject = this.getActiveProject();
      if (activeProject) {
        // Emergency backup logic would go here
        console.log('Before unload - emergency backup triggered');
      }
    } catch (error) {
      console.warn('Failed to handle before unload:', error);
    }
  }

  private getActiveProject(): string | null {
    // This would need to be integrated with your project service
    // For now, return null as placeholder
    return null;
  }

  public getStorageStats(): {
    totalSnapshots: number;
    totalSize: number;
    oldestSnapshot: number | null;
    newestSnapshot: number | null;
  } {
    const metadata = this.getMetadata();
    
    let totalSize = 0;
    const timestamps = metadata.snapshots.map(s => s.timestamp);
    
    // Estimate size (this is approximate)
    metadata.snapshots.forEach(snapshot => {
      try {
        const data = localStorage.getItem(this.getStorageKey(snapshot.projectId));
        if (data) {
          totalSize += data.length;
        }
      } catch (error) {
        console.warn('Failed to calculate snapshot size:', error);
      }
    });

    return {
      totalSnapshots: metadata.snapshots.length,
      totalSize,
      oldestSnapshot: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestSnapshot: timestamps.length > 0 ? Math.max(...timestamps) : null
    };
  }
}

// Create singleton instance
export const recoveryService = new RecoveryService();

// Recovery hook for React components
export function useRecovery() {
  return {
    saveSnapshot: recoveryService.saveSnapshot.bind(recoveryService),
    loadSnapshot: recoveryService.loadSnapshot.bind(recoveryService),
    hasRecoveryData: recoveryService.hasRecoveryData.bind(recoveryService),
    clearRecoveryData: recoveryService.clearRecoveryData.bind(recoveryService),
    getAvailableSnapshots: recoveryService.getAvailableSnapshots.bind(recoveryService),
    getStorageStats: recoveryService.getStorageStats.bind(recoveryService)
  };
}