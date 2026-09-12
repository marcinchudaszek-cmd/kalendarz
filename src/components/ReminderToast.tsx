import React, { useEffect, useState } from 'react';
import { CalendarEvent, Category } from '../types';
import { format, formatDistanceToNow } from '../calendarUtils';
import { cn } from '../utils/cn';

interface ReminderToastProps {
  reminders: CalendarEvent[];
  categories: Category[];
  onDismiss: (eventId: string) => void;
  onSnooze: (eventId: string) => void;
  onOpen: (event: CalendarEvent) => void;
}

export const ReminderToast: React.FC<ReminderToastProps> = ({
  reminders,
  categories,
  onDismiss,
  onSnooze,
  onOpen,
}) => {
  // Tekst „za 15 minut" musi się odświeżać, póki powiadomienie wisi na ekranie.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    if (reminders.length === 0) return;
    const id = setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [reminders.length]);

  if (reminders.length === 0) return null;

  return (
    <div
      data-print-hide
      className="fixed bottom-4 right-4 z-[70] w-80 max-w-[calc(100vw-2rem)] space-y-2"
    >
      {reminders.map((event) => {
        const category = categories.find((c) => c.id === event.categoryId);

        return (
          <div
            key={event.id}
            role="alert"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in"
          >
            <div className={cn('h-1.5', category?.color ?? 'bg-blue-500')} />

            <div className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 p-1.5 rounded-lg flex-shrink-0',
                    category?.bgLight ?? 'bg-blue-50',
                    category?.bgDark ?? 'dark:bg-blue-500/15'
                  )}
                >
                  <svg
                    className={cn(
                      'w-4 h-4',
                      category?.textColor ?? 'text-blue-700',
                      category?.textDark ?? 'dark:text-blue-300'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a24 24 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24 24 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                    />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => onOpen(event)}
                    className="text-left font-semibold text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block w-full"
                  >
                    {event.title}
                  </button>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {event.allDay ? 'Całodniowe' : format(event.start, 'HH:mm')} ·{' '}
                    {formatDistanceToNow(event.start)}
                  </div>
                </div>

                <button
                  onClick={() => onDismiss(event.id)}
                  aria-label="Zamknij przypomnienie"
                  className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => onSnooze(event.id)}
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Odłóż 5 min
                </button>
                <button
                  onClick={() => onDismiss(event.id)}
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
