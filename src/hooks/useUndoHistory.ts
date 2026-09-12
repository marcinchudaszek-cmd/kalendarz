import { useCallback, useRef, useState } from 'react';
import { CalendarEvent, Category } from '../types';

const MAX_STEPS = 25;

export interface Snapshot {
  events: CalendarEvent[];
  categories: Category[];
}

interface HistoryEntry extends Snapshot {
  /** Krótki opis tego, co da się cofnąć, np. „Usunięcie serii". */
  label: string;
}

export interface UndoHistory {
  /** Zapisuje bieżący stan i nakłada zmianę. */
  commit: (label: string, next: Partial<Snapshot>) => void;
  undo: () => void;
  canUndo: boolean;
  /** Opis operacji, którą cofnie najbliższe wywołanie undo. */
  undoLabel: string | null;
}

/**
 * Historia zmian kalendarza. Trzymamy pełne migawki wydarzeń i kategorii —
 * przy tej skali danych to prostsze i pewniejsze niż odwracanie pojedynczych operacji.
 */
export function useUndoHistory(
  current: Snapshot,
  apply: (snapshot: Partial<Snapshot>) => void
): UndoHistory {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Odczyty robimy z referencji, żeby wywołania nie zależały od świeżości domknięcia.
  const currentRef = useRef(current);
  currentRef.current = current;
  const historyRef = useRef(history);
  historyRef.current = history;
  const applyRef = useRef(apply);
  applyRef.current = apply;

  const commit = useCallback((label: string, next: Partial<Snapshot>) => {
    const before = currentRef.current;
    setHistory((prev) => [
      ...prev.slice(-(MAX_STEPS - 1)),
      { label, events: before.events, categories: before.categories },
    ]);
    applyRef.current(next);
  }, []);

  const undo = useCallback(() => {
    const entries = historyRef.current;
    if (entries.length === 0) return;

    const last = entries[entries.length - 1];
    applyRef.current({ events: last.events, categories: last.categories });
    setHistory(entries.slice(0, -1));
  }, []);

  return {
    commit,
    undo,
    canUndo: history.length > 0,
    undoLabel: history.length > 0 ? history[history.length - 1].label : null,
  };
}
