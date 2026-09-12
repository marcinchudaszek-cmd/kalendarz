import React from 'react';
import { CalendarEvent, Category } from '../types';
import {
  addDays,
  startOfDay,
  format,
  isToday,
  getEventsForDay,
  getEventSegmentForDay,
} from '../calendarUtils';
import { cn } from '../utils/cn';
import { EventActivate, positionFromMouse } from '../utils/eventActivation';

const DAYS_AHEAD = 30;

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  categories: Category[];
  visibleCategories: Set<string>;
  onEventClick: EventActivate;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  currentDate,
  events,
  categories,
  visibleCategories,
  onEventClick,
}) => {
  const filteredEvents = events.filter((e) => visibleCategories.has(e.categoryId));

  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(startOfDay(currentDate), i))
    .map((day) => ({
      day,
      dayEvents: getEventsForDay(filteredEvents, day).sort(
        (a, b) => a.start.getTime() - b.start.getTime()
      ),
    }))
    .filter(({ dayEvents }) => dayEvents.length > 0);

  if (days.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Brak wydarzeń w ciągu najbliższych {DAYS_AHEAD} dni.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {days.map(({ day, dayEvents }) => {
          const today = isToday(day);

          return (
            <section key={day.toISOString()} className="flex gap-4">
              {/* Kolumna z datą */}
              <div className="w-16 flex-shrink-0 text-right pt-1">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {format(day, 'EEE').replace('.', '')}
                </div>
                <div
                  className={cn(
                    'text-2xl font-light mt-0.5 inline-flex items-center justify-center w-10 h-10 rounded-full',
                    today ? 'bg-blue-500 text-white font-medium' : 'text-gray-800 dark:text-gray-100'
                  )}
                >
                  {format(day, 'd')}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">{format(day, 'LLL')}</div>
              </div>

              {/* Wydarzenia dnia */}
              <ul className="flex-1 min-w-0 space-y-1.5 pt-1">
                {dayEvents.map((event) => {
                  const category = categories.find((c) => c.id === event.categoryId);
                  const segment = getEventSegmentForDay(event, day);

                  return (
                    <li key={event.id}>
                      <button
                        onClick={(e) => onEventClick(event, positionFromMouse(e))}
                        className={cn(
                          'w-full text-left flex items-start gap-3 px-3 py-2 rounded-lg border-l-3 transition-colors hover:brightness-95',
                          category?.bgLight,
                          category?.bgDark,
                          category?.borderColor
                        )}
                      >
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-24 flex-shrink-0 pt-0.5 tabular-nums">
                          {event.allDay
                            ? 'Cały dzień'
                            : `${segment.continuesBefore ? '…' : format(segment.start, 'HH:mm')} – ${
                                segment.continuesAfter ? '…' : format(segment.end, 'HH:mm')
                              }`}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block text-sm font-medium truncate',
                              category?.textColor,
                              category?.textDark
                            )}
                          >
                            {event.title}
                          </span>
                          {event.description && (
                            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {event.description}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
};
