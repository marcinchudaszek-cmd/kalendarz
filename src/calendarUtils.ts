import {
  startOfMonth,
  endOfMonth,
  startOfWeek as dfStartOfWeek,
  endOfWeek as dfEndOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  format as dfFormat,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addMinutes,
  getHours,
  getMinutes,
  differenceInMinutes,
  differenceInCalendarDays,
  isToday,
  isWithinInterval,
  startOfDay,
  endOfDay,
  formatDistanceToNow as dfFormatDistanceToNow,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarEvent, ViewMode } from './types';

// Tydzień zaczyna się w poniedziałek (polska konwencja)
export const WEEK_STARTS_ON = 1 as const;

export function format(date: Date, formatStr: string): string {
  return dfFormat(date, formatStr, { locale: pl });
}

/** Np. „za 15 minut", „5 minut temu". */
export function formatDistanceToNow(date: Date): string {
  return dfFormatDistanceToNow(date, { addSuffix: true, locale: pl });
}

export function startOfWeek(date: Date): Date {
  return dfStartOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
}

export function endOfWeek(date: Date): Date {
  return dfEndOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
}

export {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addMinutes,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  endOfDay,
  getHours,
  getMinutes,
  differenceInMinutes,
  differenceInCalendarDays,
  isWithinInterval,
};

/** Zamienia „2026-08-17" na datę w czasie lokalnym, bez przesunięcia strefowego. */
export function parseDayInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Przesuwa datę o jeden krok w przód lub w tył, zależnie od widoku. */
export function shiftByView(date: Date, view: ViewMode, direction: 1 | -1): Date {
  switch (view) {
    case 'month':
      return direction === 1 ? addMonths(date, 1) : subMonths(date, 1);
    case 'week':
      return direction === 1 ? addWeeks(date, 1) : subWeeks(date, 1);
    case 'day':
      return direction === 1 ? addDays(date, 1) : subDays(date, 1);
    case 'agenda':
      return addDays(date, 7 * direction);
  }
}

/** Okres, który obejmuje dany widok — używany przy podsumowaniach. */
export function getViewRange(date: Date, view: ViewMode): { start: Date; end: Date } {
  switch (view) {
    case 'month': {
      const days = getMonthDays(date);
      return { start: startOfDay(days[0]), end: endOfDay(days[days.length - 1]) };
    }
    case 'week':
      return { start: startOfDay(startOfWeek(date)), end: endOfDay(endOfWeek(date)) };
    case 'day':
      return { start: startOfDay(date), end: endOfDay(date) };
    case 'agenda':
      return { start: startOfDay(date), end: endOfDay(addDays(date, 29)) };
  }
}

export function getMonthDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date));
  const end = endOfWeek(endOfMonth(date));
  return eachDayOfInterval({ start, end });
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  return eachDayOfInterval({ start, end });
}

/**
 * Wydarzenie należy do dnia, jeśli choć w części się z nim pokrywa —
 * dzięki temu wydarzenia wielodniowe widać w każdym dniu ich trwania.
 */
export function eventOccursOnDay(event: CalendarEvent, day: Date): boolean {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = endOfDay(day).getTime();

  if (event.allDay) {
    return startOfDay(event.start).getTime() <= dayEnd && startOfDay(event.end).getTime() >= dayStart;
  }
  // Wydarzenie kończące się dokładnie o północy nie zahacza o kolejny dzień.
  return event.start.getTime() <= dayEnd && event.end.getTime() > dayStart;
}

export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((event) => eventOccursOnDay(event, day));
}

export interface DaySegment {
  start: Date;
  end: Date;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

/** Fragment wydarzenia przypadający na dany dzień, przycięty do jego granic. */
export function getEventSegmentForDay(event: CalendarEvent, day: Date): DaySegment {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  return {
    start: event.start < dayStart ? dayStart : event.start,
    end: event.end > dayEnd ? dayEnd : event.end,
    continuesBefore: event.start < dayStart,
    continuesAfter: event.end > dayEnd,
  };
}

export function getEventsForRange(events: CalendarEvent[], start: Date, end: Date): CalendarEvent[] {
  return events.filter((event) => {
    return (
      isWithinInterval(event.start, { start, end }) ||
      isWithinInterval(event.end, { start, end }) ||
      (event.start <= start && event.end >= end)
    );
  });
}

export function getEventTopAndHeight(
  span: { start: Date; end: Date },
  hourHeight: number
): { top: number; height: number } {
  const startH = getHours(span.start);
  const startM = getMinutes(span.start);
  const durationMin = differenceInMinutes(span.end, span.start);

  const top = (startH + startM / 60) * hourHeight;
  const height = Math.max((durationMin / 60) * hourHeight, hourHeight * 0.4);

  return { top, height };
}

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}
