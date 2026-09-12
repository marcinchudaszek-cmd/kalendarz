import React from 'react';
import { CalendarEvent, Category, ReminderSettings, ThemeMode } from '../types';
import { MiniCalendar } from './MiniCalendar';
import { ReminderSettingsPanel } from './ReminderSettingsPanel';
import { CalendarToolsPanel } from './CalendarToolsPanel';
import { CategorySummary } from './CategorySummary';
import { cn } from '../utils/cn';

interface SidebarProps {
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  categories: Category[];
  visibleCategories: Set<string>;
  toggleCategory: (id: string) => void;
  onCreateEvent: () => void;
  /** Zamknięcie panelu — potrzebne tylko na wąskim ekranie, gdzie panel nakłada się na kalendarz. */
  onClose: () => void;
  onManageCategories: () => void;
  reminderSettings: ReminderSettings;
  onReminderSettingsChange: (settings: ReminderSettings) => void;
  events: CalendarEvent[];
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onImport: (events: CalendarEvent[]) => void;
  makeId: () => string;
  /** Wydarzenia i okres do podsumowania — już rozwinięte z serii. */
  summaryEvents: CalendarEvent[];
  summaryRange: { start: Date; end: Date };
  summaryLabel: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDate,
  setCurrentDate,
  categories,
  visibleCategories,
  toggleCategory,
  onCreateEvent,
  onClose,
  onManageCategories,
  reminderSettings,
  onReminderSettingsChange,
  events,
  theme,
  onThemeChange,
  onImport,
  makeId,
  summaryEvents,
  summaryRange,
  summaryLabel,
}) => {
  return (
    <aside className="w-60 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col overflow-y-auto">
      {/* Zamknięcie panelu — tylko tam, gdzie panel przykrywa kalendarz. */}
      <div className="lg:hidden flex justify-end px-3 pt-3">
        <button
          onClick={onClose}
          aria-label="Zamknij panel boczny"
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Create button */}
      <div className="p-4 pt-0 lg:pt-4 pb-0">
        <button
          onClick={onCreateEvent}
          className="w-full flex items-center gap-2 px-5 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-md hover:shadow-lg transition-shadow text-sm font-medium text-gray-700 dark:text-gray-100"
        >
          <svg className="w-8 h-8 text-blue-500" viewBox="0 0 36 36" fill="none">
            <path d="M18 12v12M12 18h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Utwórz
        </button>
      </div>

      {/* Mini Calendar */}
      <MiniCalendar currentDate={currentDate} setCurrentDate={setCurrentDate} />

      {/* Categories */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Kategorie
          </h3>
          <button
            type="button"
            onClick={onManageCategories}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Zarządzaj
          </button>
        </div>
        <div className="space-y-1">
          {categories.map((cat) => {
            const isVisible = visibleCategories.has(cat.id);
            return (
              <label
                key={cat.id}
                className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleCategory(cat.id)}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      'w-4 h-4 rounded flex items-center justify-center transition-colors border-2',
                      isVisible ? `${cat.color} border-transparent` : 'border-gray-300 dark:border-gray-500'
                    )}
                  >
                    {isVisible && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-200">{cat.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      <CategorySummary
        events={summaryEvents}
        categories={categories}
        rangeStart={summaryRange.start}
        rangeEnd={summaryRange.end}
        rangeLabel={summaryLabel}
      />

      <ReminderSettingsPanel settings={reminderSettings} onChange={onReminderSettingsChange} />

      <CalendarToolsPanel
        events={events}
        categories={categories}
        theme={theme}
        onThemeChange={onThemeChange}
        onImport={onImport}
        makeId={makeId}
      />
    </aside>
  );
};
