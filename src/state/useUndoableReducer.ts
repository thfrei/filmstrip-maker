import { useCallback, useReducer, useRef, useState } from 'react';

const MAX_HISTORY = 100;
/** Window (ms) during which rapid changes are coalesced into a single undo step. */
const COALESCE_MS = 400;

export interface UndoableStore<S, A> {
  state: S;
  dispatch: (action: A) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  /** Replace the present state and clear history (e.g. initial load / reset). */
  reset: (next: S) => void;
}

/**
 * Wraps a pure reducer with undo/redo history.
 *
 * History strategy: the FIRST change in a burst is committed eagerly (so a
 * single click is immediately undoable), and any subsequent changes that
 * arrive within `COALESCE_MS` are grouped into that same step. This means a
 * slider drag produces exactly ONE history entry instead of one per tick,
 * while discrete actions each get their own entry.
 */
export function useUndoableReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initial: S
): UndoableStore<S, A> {
  const [present, setPresent] = useState<S>(initial);
  const [, forceRender] = useReducer((c: number) => c + 1, 0);

  const presentRef = useRef<S>(present);
  const pastRef = useRef<S[]>([]);
  const futureRef = useRef<S[]>([]);
  const burstingRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const endBurst = () => {
    clearTimer();
    burstingRef.current = false;
  };

  const scheduleBurstEnd = () => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      burstingRef.current = false;
    }, COALESCE_MS);
  };

  const dispatch = useCallback(
    (action: A) => {
      const prev = presentRef.current;
      const next = reducer(prev, action);
      if (next === prev) return;

      presentRef.current = next;
      setPresent(next);

      if (burstingRef.current) {
        // Coalesce into the current step; present already re-renders via setPresent.
        scheduleBurstEnd();
      } else {
        burstingRef.current = true;
        pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), prev];
        futureRef.current = [];
        forceRender();
        scheduleBurstEnd();
      }
    },
    [reducer]
  );

  const undo = useCallback(() => {
    endBurst();
    if (pastRef.current.length === 0) return;
    const target = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [presentRef.current, ...futureRef.current];
    presentRef.current = target;
    setPresent(target);
    forceRender();
  }, []);

  const redo = useCallback(() => {
    endBurst();
    if (futureRef.current.length === 0) return;
    const target = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current, presentRef.current];
    presentRef.current = target;
    setPresent(target);
    forceRender();
  }, []);

  const reset = useCallback((next: S) => {
    endBurst();
    pastRef.current = [];
    futureRef.current = [];
    presentRef.current = next;
    setPresent(next);
    forceRender();
  }, []);

  return {
    state: present,
    dispatch,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    undoCount: pastRef.current.length,
    redoCount: futureRef.current.length,
    reset,
  };
}