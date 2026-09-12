import React from 'react';
import { CalendarEvent, Category, reminderLabel, recurrenceLabel } from '../types';
import { format } from '../calendarUtils';
import { cn } from '../utils/cn';

/** Tylko http(s) — nie chcemy zrobić klikalnego odnośnika z czegokolwiek innego. */
function isLink(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

interface EventPopoverProps {
  event: CalendarEvent;
  category: Category;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Dostępne tylko dla wydarzeń z serii. */
  onDeleteSeries?: () => void;
}

export const EventPopover: React.FC<EventPopoverProps> = ({
  event,
  category,
  position,
  onClose,
  onEdit,
  onDelete,
  onDeleteSeries,
}) => {
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Adjust position to stay within viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 320),
    top: Math.min(position.y, window.innerHeight - 250),
    zIndex: 60,
  };

  return (
    <div
      ref={popoverRef}
      style={style}
      className="w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
    >
      {/* Color header */}
      <div className={cn('h-2', category.color)} />

      <div className="p-4">
        {/* Close button */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', category.color)} />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{category.name}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{event.title}</h3>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-1">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {event.allDay
              ? format(event.start, 'EEEE, d MMMM')
              : `${format(event.start, 'EEEE, d MMMM · HH:mm')} – ${format(event.end, 'HH:mm')}`}
          </span>
        </div>

        {/* Miejsce */}
        {event.location && (
          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            {isLink(event.location) ? (
              <a
                href={event.location}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                {event.location}
              </a>
            ) : (
              <span className="break-words">{event.location}</span>
            )}
          </div>
        )}

        {/* Powtarzanie */}
        {event.recurrence && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992V4.356m-.981 9.66a8.25 8.25 0 01-13.803 3.7L3 14.7m0 0h4.992m-4.993 0v4.992m0-9.66a8.25 8.25 0 0113.803-3.7L21 9.3m0 0V4.308m0 4.992h-4.992"
              />
            </svg>
            <span>{recurrenceLabel(event.recurrence)}</span>
          </div>
        )}

        {/* Przypomnienie */}
        {event.reminderMinutes != null && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a24 24 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24 24 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            <span>{reminderLabel(event.reminderMinutes)}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-3 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Actions */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors"
            >
              Edytuj
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/15 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/25 transition-colors"
            >
              {onDeleteSeries ? 'Usuń to' : 'Usuń'}
            </button>
          </div>
          {onDeleteSeries && (
            <button
              onClick={onDeleteSeries}
              className="w-full px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 rounded-lg transition-colors"
            >
              Usuń całą serię
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
