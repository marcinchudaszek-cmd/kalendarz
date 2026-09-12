import React from 'react';
import { CalendarEvent, Category } from '../types';
import { format, getEventSegmentForDay } from '../calendarUtils';
import { cn } from '../utils/cn';
import { EventActivate, positionFromMouse } from '../utils/eventActivation';

interface DayEventsPopoverProps {
  day: Date;
  events: CalendarEvent[];
  categories: Category[];
  position: { x: number; y: number };
  onClose: () => void;
  onEventClick: EventActivate;
}

/** Pełna lista wydarzeń dnia — otwierana z „+N więcej" w widoku miesiąca. */
export const DayEventsPopover: React.FC<DayEventsPopoverProps> = ({
  day,
  events,
  categories,
  position,
  onClose,
  onEventClick,
}) => {
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.max(8, Math.min(position.x, window.innerWidth - 272)),
    top: Math.max(8, Math.min(position.y, window.innerHeight - 320)),
    zIndex: 55,
  };

  return (
    <div
      ref={popoverRef}
      style={style}
      className="w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            {format(day, 'EEE').replace('.', '')}
          </div>
          <div className="text-xl font-light text-gray-800 dark:text-gray-100 leading-tight">
            {format(day, 'd')}
          </div>
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

      <ul className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
        {events.map((event) => {
          const category = categories.find((c) => c.id === event.categoryId);
          const segment = getEventSegmentForDay(event, day);

          return (
            <li key={event.id}>
              <button
                onClick={(e) => onEventClick(event, positionFromMouse(e))}
                className={cn(
                  'w-full text-left px-2 py-1 text-xs rounded truncate transition-opacity hover:opacity-80',
                  event.allDay
                    ? `${category?.color} text-white font-medium`
                    : `${category?.bgLight} ${category?.bgDark} ${category?.textColor} ${category?.textDark}`
                )}
              >
                {!event.allDay && (
                  <span className="text-[10px] mr-1 opacity-70">
                    {segment.continuesBefore ? '…' : format(segment.start, 'HH:mm')}
                  </span>
                )}
                {event.title}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
