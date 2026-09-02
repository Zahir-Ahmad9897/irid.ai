import { useCallback, useMemo, useState } from 'react';

/**
 * Generic undo/redo history for any serializable piece of state (form
 * values, in-app navigation stack, filter selections, etc.), independent of
 * the browser's back/forward history.
 *
 * @template T
 * @param {T} initialState
 * @param {{limit?: number}} [options] - Max history entries kept (default 50).
 * @returns {{
 *   state: T,
 *   set: (next: T | ((prev: T) => T), opts?: {commit?: boolean}) => void,
 *   commit: () => void,
 *   undo: () => void,
 *   redo: () => void,
 *   reset: (next: T) => void,
 *   canUndo: boolean,
 *   canRedo: boolean,
 * }}
 */
export function useUndoRedo(initialState, options = {}) {
  const limit = options.limit ?? 50;
  const [history, setHistory] = useState({ past: [], present: initialState, future: [] });

  // Update the live value without pushing a history entry (e.g. while
  // dragging a slider or typing) — call commit() to snapshot it.
  const set = useCallback((updater, opts = {}) => {
    setHistory((h) => {
      const nextPresent = typeof updater === 'function' ? updater(h.present) : updater;
      if (opts.commit === false) {
        return { ...h, present: nextPresent };
      }
      const past = [...h.past, h.present].slice(-limit);
      return { past, present: nextPresent, future: [] };
    });
  }, [limit]);

  const commit = useCallback(() => {
    setHistory((h) => ({ past: [...h.past, h.present].slice(-limit), present: h.present, future: [] }));
  }, [limit]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const [next, ...rest] = h.future;
      return { past: [...h.past, h.present], present: next, future: rest };
    });
  }, []);

  const reset = useCallback((next) => {
    setHistory({ past: [], present: next, future: [] });
  }, []);

  return useMemo(
    () => ({
      state: history.present,
      set,
      commit,
      undo,
      redo,
      reset,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    }),
    [history, set, commit, undo, redo, reset]
  );
}
