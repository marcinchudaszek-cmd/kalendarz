import { useEffect } from 'react';

export interface ShortcutHandlers {
  onView: (view: 'month' | 'week' | 'day' | 'agenda') => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreate: () => void;
  onSearch: () => void;
  onUndo: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/** Skróty działają tylko wtedy, gdy nic nie jest wpisywane i nie ma otwartego okna. */
export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Cofanie działa też w polach tekstowych, ale tylko gdy nic w nich nie piszemy.
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        handlers.onUndo();
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlers.onPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlers.onNext();
          break;
        case 'Home':
          e.preventDefault();
          handlers.onToday();
          break;
        case '/':
          e.preventDefault();
          handlers.onSearch();
          break;
        default:
          switch (e.key.toLowerCase()) {
            case 'm':
              handlers.onView('month');
              break;
            case 't':
              handlers.onView('week');
              break;
            case 'd':
              handlers.onView('day');
              break;
            case 'a':
              handlers.onView('agenda');
              break;
            case 'n':
              e.preventDefault();
              handlers.onCreate();
              break;
          }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handlers, enabled]);
}
