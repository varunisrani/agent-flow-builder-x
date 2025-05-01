
import { useCallback, useState } from 'react';

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoRedo<T>(initialPresent: T) {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;

    const { past, present, future } = state;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setState({
      past: newPast,
      present: previous,
      future: [present, ...future],
    });
  }, [state, canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    const { past, present, future } = state;
    const next = future[0];
    const newFuture = future.slice(1);

    setState({
      past: [...past, present],
      present: next,
      future: newFuture,
    });
  }, [state, canRedo]);

  const set = useCallback(
    (newPresent: T) => {
      if (newPresent === state.present) return;

      setState({
        past: [...state.past, state.present],
        present: newPresent,
        future: [],
      });
    },
    [state]
  );

  return { state: state.present, set, undo, redo, canUndo, canRedo };
}
