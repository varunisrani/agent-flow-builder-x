import React, { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, Trash2, Clock, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecovery } from '@/services/recoveryService';
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '@/components/nodes/BaseNode';
import { MCPConfig } from '@/lib/codeGeneration';

interface RecoveryDialogProps {
  projectId: string;
  isOpen: boolean;
  onRecover: (nodes: Node<BaseNodeData>[], edges: Edge[], mcpConfig?: MCPConfig[]) => void;
  onClose: () => void;
  onDiscard: () => void;
}

export function RecoveryDialog({
  projectId,
  isOpen,
  onRecover,
  onClose,
  onDiscard
}: RecoveryDialogProps) {
  const [recoveryData, setRecoveryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const recovery = useRecovery();

  useEffect(() => {
    if (isOpen && projectId) {
      const snapshot = recovery.loadSnapshot(projectId);
      setRecoveryData(snapshot);
    }
  }, [isOpen, projectId]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const getReasonColor = (reason: string): string => {
    switch (reason) {
      case 'auto-save':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'manual-save':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'error-recovery':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'session-backup':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'auto-save':
        return <Save className="w-3 h-3" />;
      case 'manual-save':
        return <Save className="w-3 h-3" />;
      case 'error-recovery':
        return <AlertTriangle className="w-3 h-3" />;
      case 'session-backup':
        return <Clock className="w-3 h-3" />;
      default:
        return <RotateCcw className="w-3 h-3" />;
    }
  };

  const handleRecover = async () => {
    if (!recoveryData) return;

    setLoading(true);
    try {
      const { nodes, edges, mcpConfig } = recoveryData.state;
      onRecover(nodes, edges, mcpConfig);
      onClose();
    } catch (error) {
      console.error('Failed to recover data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    recovery.clearRecoveryData(projectId);
    onDiscard();
    onClose();
  };

  if (!isOpen || !recoveryData) return null;

  const { state, reason, timestamp } = recoveryData;
  const nodeCount = state.nodes?.length || 0;
  const edgeCount = state.edges?.length || 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md"
        >
          <Card className="bg-gradient-to-br from-zinc-300/10 via-orange-400/10 to-transparent backdrop-blur-xl border-[2px] border-orange-500/20 shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-tr from-orange-500/20 via-yellow-500/20 to-transparent border border-orange-500/30 rounded-xl">
                    <RotateCcw className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-white">
                      Recover Your Work
                    </CardTitle>
                    <p className="text-sm text-gray-300 mt-1">
                      We found unsaved changes from your previous session
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Recovery Details */}
              <div className="p-4 bg-gradient-to-r from-gray-500/10 to-transparent rounded-lg border border-gray-500/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-300">Last Saved</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getReasonColor(reason)}`}
                  >
                    {getReasonIcon(reason)}
                    <span className="ml-1 capitalize">{reason.replace('-', ' ')}</span>
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>Time:</span>
                    <span className="text-gray-300">{formatTimestamp(timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Components:</span>
                    <span className="text-gray-300">{nodeCount} nodes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Connections:</span>
                    <span className="text-gray-300">{edgeCount} edges</span>
                  </div>
                  {state.mcpConfig && (
                    <div className="flex items-center justify-between">
                      <span>MCP Config:</span>
                      <span className="text-gray-300">Available</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning */}
              <div className="p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-400/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-yellow-300 mb-1">Important</p>
                    <p className="text-xs text-yellow-400 leading-relaxed">
                      Recovering will replace your current work. Make sure you don't have unsaved changes you want to keep.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleRecover}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                >
                  <RotateCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Recovering...' : 'Recover Work'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleDiscard}
                  className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30 hover:text-red-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Discard
                </Button>
              </div>

              {/* Additional Options */}
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  Continue without recovering
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to check for recovery data on component mount
export function useRecoveryCheck(projectId: string) {
  const [hasRecovery, setHasRecovery] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const recovery = useRecovery();

  useEffect(() => {
    if (projectId) {
      const hasData = recovery.hasRecoveryData(projectId);
      setHasRecovery(hasData);
      if (hasData) {
        // Auto-show dialog after a short delay
        setTimeout(() => setShowDialog(true), 1000);
      }
    }
  }, [projectId]);

  return {
    hasRecovery,
    showDialog,
    setShowDialog
  };
}