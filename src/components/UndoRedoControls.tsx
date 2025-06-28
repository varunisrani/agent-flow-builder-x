import React, { useEffect } from 'react';
import { Undo2, Redo2, RotateCcw, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  historyLength?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline';
  showHistory?: boolean;
  className?: string;
}

export function UndoRedoControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  historyLength = 0,
  position = 'top-left',
  showHistory = false,
  className
}: UndoRedoControlsProps) {
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd on Mac or Ctrl on Windows/Linux
      const isMetaOrCtrl = event.metaKey || event.ctrlKey;
      
      if (isMetaOrCtrl && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) {
          onUndo();
        }
      } else if (isMetaOrCtrl && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        if (canRedo) {
          onRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, onUndo, onRedo]);

  const getPositionClasses = () => {
    if (position === 'inline') return '';
    
    const baseClasses = 'fixed z-30';
    switch (position) {
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      default:
        return `${baseClasses} top-4 left-4`;
    }
  };

  return (
    <TooltipProvider>
      <div className={cn(
        'flex items-center gap-2 p-2 bg-gradient-to-r from-zinc-300/10 via-gray-400/10 to-transparent backdrop-blur-xl border border-white/10 rounded-xl shadow-lg',
        getPositionClasses(),
        className
      )}>
        {/* History indicator */}
        {showHistory && historyLength > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <History className="w-3 h-3 text-blue-400" />
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              {historyLength}
            </Badge>
          </div>
        )}

        {/* Undo button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              className={cn(
                'h-8 w-8 p-0 transition-all duration-200',
                canUndo 
                  ? 'text-white hover:text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/30' 
                  : 'text-gray-500 cursor-not-allowed opacity-50'
              )}
            >
              <Undo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Undo {navigator.platform.includes('Mac') ? '(⌘Z)' : '(Ctrl+Z)'}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Redo button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              className={cn(
                'h-8 w-8 p-0 transition-all duration-200',
                canRedo 
                  ? 'text-white hover:text-green-400 hover:bg-green-500/20 hover:border-green-500/30' 
                  : 'text-gray-500 cursor-not-allowed opacity-50'
              )}
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Redo {navigator.platform.includes('Mac') ? '(⌘⇧Z)' : '(Ctrl+Y)'}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Visual state indicator */}
        <div className="flex items-center gap-1">
          {canUndo && (
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
          )}
          {canRedo && (
            <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
          )}
          {!canUndo && !canRedo && (
            <div className="w-1 h-1 bg-gray-500 rounded-full" />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// Floating version for better UX
export function FloatingUndoRedoControls(props: Omit<UndoRedoControlsProps, 'position'>) {
  return (
    <UndoRedoControls 
      {...props} 
      position="top-left"
      showHistory={true}
      className="animate-in fade-in-0 slide-in-from-left-2 duration-300"
    />
  );
}

// Inline version for toolbars
export function InlineUndoRedoControls(props: Omit<UndoRedoControlsProps, 'position' | 'showHistory'>) {
  return (
    <UndoRedoControls 
      {...props} 
      position="inline"
      showHistory={false}
      className="bg-transparent border-none shadow-none p-1"
    />
  );
}