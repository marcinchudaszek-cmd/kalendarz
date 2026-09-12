import React, { useState } from 'react';
import { CalendarEvent, Category } from '../types';
import { DayEventsPopover } from './DayEventsPopover';
import {
  getMonthDays,
  isSameMonth,
  isToday,
  format,
  getEventsForDay,
  getEventSegmentForDay,
} from '../calendarUtils';
import { cn } from '../utils/cn';
import { eventActivationProps, EventActivate } from '../utils/eventActivation';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  categories: Category[];
  visibleCategories: Set<string>;
  onEventClick: EventActivate;
  onDayClick: (day: Date) => void;
  setView: (v: 'day') => void;
  setCurrentDate: (d: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  categories,
  visibleCategories,
  onEventClick,
  onDayClick,
  setView,
  setCurrentDate,
}) => {
  const days = getMonthDays(currentDate);
  const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];

  // Dzień rozwinięty przyciskiem „+N więcej".
  const [expandedDay, setExpandedDay] = useState<{
    day: Date;
    events: CalendarEvent[];
    position: { x: number; y: number };
  } | null>(null);

  const getCategoryForEvent = (event: CalendarEvent) =>
    categories.find((c) => c.id === event.categoryId);

  const filteredEvents = events.filter((e) => visibleCategories.has(e.categoryId));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day names header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {dayNames.map((name) => (
          <div
            key={name}
            className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Days grid */}
      {/*
        Liczba wierszy musi być podana wprost. `auto-fill` z `minmax(0,1fr)` nie ma
        czego policzyć przy minimum 0 i tworzy setki wierszy o wysokości ułamka piksela,
        przez co siatka robi się niewidoczna.
      */}
      <div
        className="flex-1 grid grid-cols-7 overflow-hidden"
        style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))` }}
      >
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(filteredEvents, day)
            .sort((a, b) => a.start.getTime() - b.start.getTime());
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);
          const maxShow = 3;
          const extraCount = dayEvents.length - maxShow;

          return (
            <div
              key={i}
              className={cn(
                'border-b border-r border-gray-100 dark:border-gray-700 min-h-0 flex flex-col overflow-hidden cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/40 transition-colors',
                !isCurrentMonth && 'bg-gray-50/70 dark:bg-gray-900/40'
              )}
              onClick={() => onDayClick(day)}
            >
              {/* Day number */}
              <div className="flex justify-center pt-1.5 pb-0.5">
                <span
                  className={cn(
                    'w-7 h-7 flex items-center justify-center text-sm rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors',
                    isTodayDate && 'bg-blue-500 text-white font-bold hover:bg-blue-600',
                    !isTodayDate && isCurrentMonth && 'text-gray-800 dark:text-gray-100',
                    !isTodayDate && !isCurrentMonth && 'text-gray-400 dark:text-gray-500'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentDate(day);
                    setView('day');
                  }}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events */}
              <div className="flex-1 overflow-hidden px-1 space-y-0.5">
                {dayEvents.slice(0, maxShow).map((event) => {
                  const cat = getCategoryForEvent(event);
                  const segment = getEventSegmentForDay(event, day);
                  return (
                    <div
                      key={event.id}
                      {...eventActivationProps(event, onEventClick)}
                      className={cn(
                        'px-1.5 py-0.5 text-xs rounded truncate cursor-pointer transition-opacity hover:opacity-80',
                        'focus:outline-none focus:ring-2 focus:ring-blue-400',
                        event.allDay
                          ? `${cat?.color} text-white font-medium`
                          : `${cat?.bgLight} ${cat?.bgDark} ${cat?.textColor} ${cat?.textDark}`
                      )}
                    >
                      {!event.allDay && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 flex-shrink-0 align-middle" style={{ backgroundColor: cat?.dotColor }} />
                      )}
                      {!event.allDay && (
                        <span className="text-[10px] mr-1 opacity-70">
                          {segment.continuesBefore ? '…' : format(segment.start, 'HH:mm')}
                        </span>
                      )}
                      {event.title}
                    </div>
                  );
                })}
                {extraCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setExpandedDay({
                        day,
                        events: dayEvents,
                        position: { x: rect.left, y: rect.bottom + 4 },
                      });
                    }}
                    className="w-full text-left px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    +{extraCount} więcej
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {expandedDay && (
        <DayEventsPopover
          day={expandedDay.day}
          events={expandedDay.events}
          categories={categories}
          position={expandedDay.position}
          onClose={() => setExpandedDay(null)}
          onEventClick={(event, position) => {
            setExpandedDay(null);
            onEventClick(event, position);
          }}
        />
      )}
    </div>
  );
};
