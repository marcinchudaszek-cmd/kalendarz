import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarEvent, Category } from '../types';
import { format } from '../calendarUtils';
import { nextOccurrence } from '../recurrenceUtils';
import { cn } from '../utils/cn';

const MAX_RESULTS = 8;

interface SearchBoxProps {
  events: CalendarEvent[];
  categories: Category[];
  onSelect: (event: CalendarEvent) => void;
  /** Rośnie o 1, gdy użytkownik naciśnie „/" — wtedy przejmujemy kursor. */
  focusSignal: number;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ events, categories, onSelect, focusSignal }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusSignal > 0) inputRef.current?.focus();
  }, [focusSignal]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];

    const now = new Date();
    return events
      .filter(
        (e) =>
          e.title.toLowerCase().includes(needle) ||
          (e.description ?? '').toLowerCase().includes(needle) ||
          (e.location ?? '').toLowerCase().includes(needle)
      )
      // Szukamy po wydarzeniach źródłowych, a pokazujemy najbliższe wystąpienie serii,
      // żeby wynik nie zależał od tego, jaki okres akurat oglądamy.
      .map((e) => nextOccurrence(e, now) ?? e)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, MAX_RESULTS);
  }, [events, query]);

  useEffect(() => setHighlighted(0), [query]);

  const choose = (event: CalendarEvent) => {
    onSelect(event);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[highlighted]);
    }
  };

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="relative">
        <svg
          className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Szukaj wydarzeń"
          aria-label="Szukaj wydarzeń"
          className="w-52 lg:w-64 pl-8 pr-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-transparent rounded-lg focus:bg-white dark:focus:bg-gray-900 focus:border-blue-500 outline-none transition-colors"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute right-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Nic nie znaleziono.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((event, i) => {
                const category = categories.find((c) => c.id === event.categoryId);
                return (
                  <li key={event.id}>
                    <button
                      onClick={() => choose(event)}
                      onMouseEnter={() => setHighlighted(i)}
                      className={cn(
                        'w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors',
                        i === highlighted
                          ? 'bg-blue-50 dark:bg-blue-500/15'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category?.dotColor }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-gray-800 dark:text-gray-100 truncate">
                          {event.title}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {format(event.start, 'EEEE, d MMMM')}
                          {!event.allDay && ` · ${format(event.start, 'HH:mm')}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
