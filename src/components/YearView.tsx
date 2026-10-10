import React, { useEffect, useMemo, useRef } from 'react';
import { CalendarEvent } from '../types';
import {
  getMonthDays,
  format,
  isSameMonth,
  isToday,
  eventOccursOnDay,
  startOfDay,
} from '../calendarUtils';
import { cn } from '../utils/cn';

interface YearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  /** Dni wolne — zaznaczane czerwonym numerem, nie liczą się do zajętości. */
  holidays: CalendarEvent[];
  visibleCategories: Set<string>;
  /** Kliknięcie dnia otwiera go w widoku dnia. */
  onOpenDay: (day: Date) => void;
  /** Kliknięcie nazwy miesiąca otwiera widok miesiąca. */
  onOpenMonth: (month: Date) => void;
}

const DAY_NAMES = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'];

/** Klucz dnia w czasie lokalnym — szybsze niż porównywanie dat w pętli 365 × N. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Odcień tła zależny od liczby wydarzeń — mapa zajętości jak na GitHubie. */
function busyClass(count: number): string {
  if (count === 0) return 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700';
  if (count === 1) return 'bg-blue-100 text-blue-800 dark:bg-blue-500/25 dark:text-blue-200';
  if (count === 2) return 'bg-blue-200 text-blue-900 dark:bg-blue-500/45 dark:text-blue-100';
  return 'bg-blue-400 text-white dark:bg-blue-500/75';
}

export const YearView: React.FC<YearViewProps> = ({
  currentDate,
  events,
  holidays,
  visibleCategories,
  onOpenDay,
  onOpenMonth,
}) => {
  const year = currentDate.getFullYear();
  const months = useMemo(() => Array.from({ length: 12 }, (_, m) => new Date(year, m, 1)), [year]);

  // Liczba wydarzeń na każdy dzień roku. Wielodniowe liczą się w każdym dniu trwania.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    for (const event of events) {
      if (!visibleCategories.has(event.categoryId)) continue;
      if (event.end < yearStart || event.start >= yearEnd) continue;
      let day = startOfDay(event.start < yearStart ? yearStart : event.start);
      while (day < yearEnd && eventOccursOnDay(event, day)) {
        const key = dayKey(day);
        map.set(key, (map.get(key) ?? 0) + 1);
        day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      }
    }
    return map;
  }, [events, visibleCategories, year]);

  // Na telefonie miesiące idą jeden pod drugim — od razu pokazujemy bieżący.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = scrollRef.current?.querySelector<HTMLElement>('[data-current-month]');
    if (target && scrollRef.current) {
      scrollRef.current.scrollTop = target.offsetTop - scrollRef.current.offsetTop - 8;
    }
  }, [year]);

  const holidayNames = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const h of holidays) {
      if (h.start.getFullYear() !== year) continue;
      const key = dayKey(h.start);
      map.set(key, [...(map.get(key) ?? []), h.title]);
    }
    return map;
  }, [holidays, year]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-5 p-4 max-w-6xl mx-auto">
        {months.map((month) => {
          const days = getMonthDays(month);
          const isCurrentMonth = isSameMonth(month, new Date());

          return (
            <section
              key={month.getMonth()}
              className="min-w-0"
              data-current-month={isCurrentMonth || undefined}
            >
              <h2>
                <button
                  onClick={() => onOpenMonth(month)}
                  className={cn(
                    'px-1.5 py-0.5 -ml-1.5 mb-1 rounded-md text-sm font-semibold capitalize hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                    isCurrentMonth ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'
                  )}
                >
                  {format(month, 'LLLL')}
                </button>
              </h2>

              <div className="grid grid-cols-7">
                {DAY_NAMES.map((name, i) => (
                  <div
                    key={i}
                    className="text-center text-[11px] font-medium text-gray-400 dark:text-gray-500 py-0.5"
                  >
                    {name}
                  </div>
                ))}

                {days.map((day) => {
                  if (!isSameMonth(day, month)) return <div key={day.getTime()} aria-hidden />;

                  const count = counts.get(dayKey(day)) ?? 0;
                  const today = isToday(day);
                  const holiday = holidayNames.get(dayKey(day));
                  const label = [format(day, 'd MMMM'), ...(holiday ?? []), count ? `wydarzenia: ${count}` : '']
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <button
                      key={day.getTime()}
                      onClick={() => onOpenDay(day)}
                      title={label}
                      aria-label={`${format(day, 'EEEE, d MMMM yyyy')}${holiday ? `, ${holiday.join(', ')}` : ''}${
                        count ? `, wydarzenia: ${count}` : ''
                      }`}
                      className={cn(
                        'aspect-square w-full max-w-9 mx-auto my-px flex items-center justify-center text-xs rounded-full transition-colors',
                        today ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-300 dark:ring-blue-700' : busyClass(count),
                        holiday && !today && 'font-bold !text-red-600 dark:!text-red-400'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 pb-6 text-[11px] text-gray-500 dark:text-gray-400">
        <span>Mniej</span>
        {[0, 1, 2, 3].map((n) => (
          <span key={n} className={cn('w-3.5 h-3.5 rounded-full border border-gray-200 dark:border-gray-600', busyClass(n))} />
        ))}
        <span>Więcej wydarzeń</span>
        {holidays.length > 0 && (
          <>
            <span className="ml-3 font-bold text-red-600 dark:text-red-400">12</span>
            <span>dzień wolny</span>
          </>
        )}
      </div>
    </div>
  );
};
