import React, { useRef, useState } from 'react';
import { CalendarEvent, Category, ThemeMode } from '../types';
import { eventsToIcs, parseIcs } from '../icsUtils';
import { format } from '../calendarUtils';
import { cn } from '../utils/cn';

const SHORTCUTS: [string, string][] = [
  ['M', 'Miesiąc'],
  ['T', 'Tydzień'],
  ['D', 'Dzień'],
  ['A', 'Agenda'],
  ['← →', 'Poprzedni, następny'],
  ['Home', 'Dziś'],
  ['N', 'Nowe wydarzenie'],
  ['/', 'Szukaj'],
  ['Ctrl+Z', 'Cofnij'],
];

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Jasny' },
  { value: 'dark', label: 'Ciemny' },
  { value: 'system', label: 'System' },
];

interface CalendarToolsPanelProps {
  events: CalendarEvent[];
  categories: Category[];
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onImport: (events: CalendarEvent[]) => void;
  makeId: () => string;
}

export const CalendarToolsPanel: React.FC<CalendarToolsPanelProps> = ({
  events,
  categories,
  theme,
  onThemeChange,
  onImport,
  makeId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = () => {
    const ics = eventsToIcs(events, categories);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kalendarz-${format(new Date(), 'yyyy-MM-dd')}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Wyeksportowano ${events.length} wydarzeń.`);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = parseIcs(text, categories, makeId);
      if (imported.length === 0) {
        setStatus('Nie znaleziono wydarzeń w pliku.');
      } else {
        onImport(imported);
        setStatus(`Zaimportowano ${imported.length} wydarzeń.`);
      }
    } catch {
      setStatus('Nie udało się odczytać pliku.');
    } finally {
      // Bez tego wybranie tego samego pliku drugi raz nic by nie zrobiło.
      e.target.value = '';
    }
  };

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Wygląd i dane
      </h3>

      {/* Motyw */}
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 mb-3">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onThemeChange(option.value)}
            className={cn(
              'flex-1 px-2 py-1 text-xs font-medium rounded-md transition-all',
              theme === option.value
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Eksport i import */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Eksportuj .ics
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Importuj .ics
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,text/calendar"
        onChange={handleFile}
        className="hidden"
      />

      {status && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{status}</p>}

      <details className="mt-4">
        <summary className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none">
          Skróty klawiszowe
        </summary>
        <dl className="mt-2 space-y-1">
          {SHORTCUTS.map(([keys, description]) => (
            <div key={keys} className="flex items-center justify-between gap-2">
              <dt className="text-xs text-gray-600 dark:text-gray-300">{description}</dt>
              <dd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
                  {keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
};
