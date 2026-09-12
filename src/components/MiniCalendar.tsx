import React from 'react';
import { getMonthDays, format, isSameDay, isSameMonth, isToday, addMonths, subMonths } from '../calendarUtils';
import { cn } from '../utils/cn';

interface MiniCalendarProps {
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ currentDate, setCurrentDate }) => {
  const [miniDate, setMiniDate] = React.useState(currentDate);

  React.useEffect(() => {
    setMiniDate(currentDate);
  }, [currentDate]);

  const days = getMonthDays(miniDate);
  const dayNames = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'];

  return (
    <div className="p-3">
      {/* Mini header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {format(miniDate, 'LLLL yyyy')}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => setMiniDate(subMonths(miniDate, 1))}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setMiniDate(addMonths(miniDate, 1))}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isSelected = isSameDay(day, currentDate);
          const isCurrentMonth = isSameMonth(day, miniDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={i}
              onClick={() => setCurrentDate(day)}
              className={cn(
                'w-7 h-7 flex items-center justify-center text-xs rounded-full transition-colors mx-auto',
                !isCurrentMonth && 'text-gray-300 dark:text-gray-600',
                isCurrentMonth &&
                  !isSelected &&
                  !isTodayDate &&
                  'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
                isTodayDate && !isSelected && 'bg-blue-100 dark:bg-blue-500/25 text-blue-600 dark:text-blue-300 font-bold',
                isSelected && 'bg-blue-500 text-white font-bold'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};
