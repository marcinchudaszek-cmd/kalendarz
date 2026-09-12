import React from 'react';
import { format, startOfWeek, endOfWeek, addDays, shiftByView } from '../calendarUtils';
import { ViewMode, CalendarEvent, Category } from '../types';
import { SearchBox } from './SearchBox';
import { cn } from '../utils/cn';

const VIEW_LABELS: Record<ViewMode, string> = {
  month: 'Miesiąc',
  week: 'Tydzień',
  day: 'Dzień',
  agenda: 'Agenda',
};

const VIEW_ORDER: ViewMode[] = ['month', 'week', 'day', 'agenda'];

interface HeaderProps {
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  events: CalendarEvent[];
  categories: Category[];
  onSearchSelect: (event: CalendarEvent) => void;
  searchFocusSignal: number;
  canUndo: boolean;
  undoLabel: string | null;
  onUndo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  setCurrentDate,
  view,
  setView,
  events,
  categories,
  onSearchSelect,
  searchFocusSignal,
  canUndo,
  undoLabel,
  onUndo,
}) => {
  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => setCurrentDate(shiftByView(currentDate, view, -1));
  const goNext = () => setCurrentDate(shiftByView(currentDate, view, 1));

  const titleText = () => {
    if (view === 'month') return format(currentDate, 'LLLL yyyy');
    if (view === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'd')} – ${format(end, 'd MMMM yyyy')}`;
      }
      return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
    }
    if (view === 'agenda') {
      return `${format(currentDate, 'd MMM')} – ${format(addDays(currentDate, 30), 'd MMM yyyy')}`;
    }
    return format(currentDate, 'EEEE, d MMMM yyyy');
  };

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Logo / Brand */}
        <div className="hidden sm:flex items-center gap-2 mr-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-gray-800 dark:text-gray-100 hidden sm:block">Kalendarz</span>
        </div>

        {/* Today Button */}
        <button
          data-print-hide
          onClick={goToday}
          className="px-2.5 sm:px-4 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 transition-colors text-gray-700 dark:text-gray-200 flex-shrink-0"
        >
          Dziś
        </button>

        {/* Navigation */}
        <div className="flex items-center gap-1" data-print-hide>
          <button
            onClick={goPrev}
            aria-label="Poprzedni okres"
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goNext}
            aria-label="Następny okres"
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h1 className="text-sm sm:text-lg font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap truncate">
          {titleText()}
        </h1>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0" data-print-hide>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title={canUndo ? `Cofnij: ${undoLabel} (Ctrl+Z)` : 'Nie ma czego cofnąć'}
          aria-label={canUndo ? `Cofnij: ${undoLabel}` : 'Nie ma czego cofnąć'}
          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>

        <SearchBox
          events={events}
          categories={categories}
          onSelect={onSearchSelect}
          focusSignal={searchFocusSignal}
        />

        {/* Na wąskim ekranie cztery przyciski się nie mieszczą. */}
        <select
          value={view}
          onChange={(e) => setView(e.target.value as ViewMode)}
          aria-label="Widok kalendarza"
          className="sm:hidden px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 outline-none"
        >
          {VIEW_ORDER.map((v) => (
            <option key={v} value={v}>
              {VIEW_LABELS[v]}
            </option>
          ))}
        </select>

        {/* View Switcher */}
        <div className="hidden sm:flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
          {VIEW_ORDER.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                view === v
                  ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
