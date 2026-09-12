import { CalendarEvent } from './types';

/**
 * Po tym czasie od rozpoczęcia wydarzenia nie pokazujemy już przypomnienia.
 * Dzięki temu po powrocie do aplikacji nie wysypuje się seria starych powiadomień.
 */
export const REMINDER_GRACE_MS = 5 * 60 * 1000;

export function reminderFireTime(event: CalendarEvent): Date | null {
  if (event.reminderMinutes == null) return null;
  return new Date(event.start.getTime() - event.reminderMinutes * 60_000);
}

export function getDueReminders(
  events: CalendarEvent[],
  now: Date,
  fired: Set<string>,
  snoozed: Map<string, number>
): CalendarEvent[] {
  const t = now.getTime();

  return events.filter((event) => {
    const fireAt = reminderFireTime(event);
    if (!fireAt) return false;

    // Odłożone przypomnienie wraca o wyznaczonej godzinie, niezależnie od reszty warunków.
    const snoozedUntil = snoozed.get(event.id);
    if (snoozedUntil != null) return t >= snoozedUntil;

    if (fired.has(event.id)) return false;
    return t >= fireAt.getTime() && t <= event.start.getTime() + REMINDER_GRACE_MS;
  });
}
