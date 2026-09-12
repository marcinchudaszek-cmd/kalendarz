import { addDays, addWeeks, addMonths, addYears, endOfDay } from 'date-fns';
import { CalendarEvent, Recurrence } from './types';
import { format, startOfWeek } from './calendarUtils';

/** Zabezpieczenie przed pętlą bez końca przy dziwnych danych. */
const MAX_OCCURRENCES = 2000;

export function occurrenceKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function step(date: Date, recurrence: Recurrence): Date {
  const n = Math.max(1, recurrence.interval);
  switch (recurrence.freq) {
    case 'daily':
      return addDays(date, n);
    case 'weekly':
      return addWeeks(date, n);
    case 'monthly':
      return addMonths(date, n);
    case 'yearly':
      return addYears(date, n);
  }
}

/** Ta sama godzina co w wydarzeniu źródłowym, ale w podanym dniu. */
function atTimeOf(day: Date, source: Date): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    source.getHours(),
    source.getMinutes(),
    0,
    0
  );
}

/**
 * Kolejne początki wystąpień, od pierwszego w serii. Leniwie, bo serie bywają bez końca —
 * to odbiorca decyduje, kiedy przestać pobierać.
 */
function* occurrenceStarts(master: CalendarEvent, recurrence: Recurrence): Generator<Date> {
  const weekdays = recurrence.freq === 'weekly' ? recurrence.weekdays ?? [] : [];

  if (weekdays.length > 0) {
    const unique = [...new Set(weekdays)].sort((a, b) => a - b);
    const interval = Math.max(1, recurrence.interval);
    let weekStart = startOfWeek(master.start);

    for (let i = 0; i < MAX_OCCURRENCES; i++) {
      for (const weekday of unique) {
        // Tydzień liczymy od poniedziałku, a niedziela ma numer 0 — stąd przesunięcie.
        const offset = (weekday + 6) % 7;
        const start = atTimeOf(addDays(weekStart, offset), master.start);
        if (start.getTime() >= master.start.getTime()) yield start;
      }
      weekStart = addWeeks(weekStart, interval);
    }
    return;
  }

  let start = master.start;
  for (let i = 0; i < MAX_OCCURRENCES; i++) {
    yield start;
    start = step(start, recurrence);
  }
}

/** Rozwija serię na pojedyncze wystąpienia mieszczące się w podanym zakresie. */
export function expandSeries(master: CalendarEvent, rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  const recurrence = master.recurrence;
  if (!recurrence) return [];

  const durationMs = master.end.getTime() - master.start.getTime();
  const lastAllowed = recurrence.until ? endOfDay(recurrence.until).getTime() : null;
  const exceptions = new Set(master.exceptions ?? []);
  const occurrences: CalendarEvent[] = [];

  for (const start of occurrenceStarts(master, recurrence)) {
    if (start.getTime() > rangeEnd.getTime()) break;
    if (lastAllowed !== null && start.getTime() > lastAllowed) break;

    const end = new Date(start.getTime() + durationMs);
    const key = occurrenceKey(start);

    if (end.getTime() >= rangeStart.getTime() && !exceptions.has(key)) {
      occurrences.push({
        ...master,
        id: `${master.id}::${key}`,
        start,
        end,
        seriesId: master.id,
        occurrenceDate: key,
      });
    }
  }

  return occurrences;
}

/**
 * Pierwsze wystąpienie serii kończące się nie wcześniej niż podana chwila.
 * Używane przez wyszukiwarkę, żeby seria była znajdowana niezależnie od oglądanej daty.
 */
export function nextOccurrence(master: CalendarEvent, from: Date): CalendarEvent | null {
  const recurrence = master.recurrence;
  if (!recurrence) return master.end >= from ? master : null;

  const durationMs = master.end.getTime() - master.start.getTime();
  const lastAllowed = recurrence.until ? endOfDay(recurrence.until).getTime() : null;
  const exceptions = new Set(master.exceptions ?? []);

  for (const start of occurrenceStarts(master, recurrence)) {
    if (lastAllowed !== null && start.getTime() > lastAllowed) return null;

    const end = new Date(start.getTime() + durationMs);
    const key = occurrenceKey(start);

    if (end.getTime() >= from.getTime() && !exceptions.has(key)) {
      return { ...master, id: `${master.id}::${key}`, start, end, seriesId: master.id, occurrenceDate: key };
    }
  }

  return null;
}

/** Zamienia listę wydarzeń na listę konkretnych wystąpień w danym zakresie. */
export function expandEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const result: CalendarEvent[] = [];

  for (const event of events) {
    if (event.recurrence) {
      result.push(...expandSeries(event, rangeStart, rangeEnd));
    } else {
      result.push(event);
    }
  }

  return result;
}
