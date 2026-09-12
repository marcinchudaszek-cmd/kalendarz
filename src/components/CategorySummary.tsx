import React from 'react';
import { CalendarEvent, Category } from '../types';
import { cn } from '../utils/cn';

interface CategorySummaryProps {
  events: CalendarEvent[];
  categories: Category[];
  rangeStart: Date;
  rangeEnd: Date;
  /** Opis okresu pokazywany w nagłówku, np. „17 – 23 sierpnia 2026". */
  rangeLabel: string;
}

const ALL_DAY_HOURS = 8;

function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (whole === 0) return `${minutes} min`;
  return minutes === 0 ? `${whole} h` : `${whole} h ${minutes} min`;
}

/** Ile godzin w widocznym okresie zajmuje każda kategoria. */
export const CategorySummary: React.FC<CategorySummaryProps> = ({
  events,
  categories,
  rangeStart,
  rangeEnd,
  rangeLabel,
}) => {
  const totals = new Map<string, number>();

  for (const event of events) {
    // Liczymy tylko część wydarzenia mieszczącą się w oglądanym okresie.
    const from = Math.max(event.start.getTime(), rangeStart.getTime());
    const to = Math.min(event.end.getTime(), rangeEnd.getTime());
    if (to <= from) continue;

    // Całodniowe traktujemy jako dzień pracy, inaczej przytłoczyłyby zestawienie.
    const hours = event.allDay
      ? Math.max(1, Math.round((to - from) / 86_400_000)) * ALL_DAY_HOURS
      : (to - from) / 3_600_000;

    totals.set(event.categoryId, (totals.get(event.categoryId) ?? 0) + hours);
  }

  const rows = categories
    .map((category) => ({ category, hours: totals.get(category.id) ?? 0 }))
    .filter((row) => row.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  const total = rows.reduce((sum, row) => sum + row.hours, 0);

  return (
    <details className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
      <summary className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none">
        Podsumowanie okresu
      </summary>

      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{rangeLabel}</p>

      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Brak wydarzeń w tym okresie.</p>
      ) : (
        <>
          <ul className="mt-2 space-y-1.5">
            {rows.map(({ category, hours }) => (
              <li key={category.id}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={cn('w-2.5 h-2.5 rounded-sm flex-shrink-0', category.color)} />
                    <span className="text-gray-700 dark:text-gray-200 truncate">{category.name}</span>
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 tabular-nums flex-shrink-0">
                    {formatHours(hours)}
                  </span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', category.color)}
                    style={{ width: `${total > 0 ? (hours / total) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Razem</span>
            <span className="font-medium text-gray-700 dark:text-gray-200 tabular-nums">
              {formatHours(total)}
            </span>
          </div>
        </>
      )}
    </details>
  );
};
