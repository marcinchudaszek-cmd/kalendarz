import { useCallback, useEffect, useRef } from 'react';
import { CalendarEvent } from '../types';
import { getDueReminders } from '../reminderUtils';
import { loadFiredIds, saveFiredIds } from '../storage';

const TICK_MS = 15_000;

/**
 * Pilnuje czasu i zgłasza wydarzenia, o których trzeba przypomnieć.
 * Pokazane przypomnienia zapisujemy, żeby po odświeżeniu strony nie wróciły.
 */
export function useReminders(events: CalendarEvent[], onFire: (event: CalendarEvent) => void) {
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;

  const firedRef = useRef<Set<string>>(loadFiredIds());
  const snoozedRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const tick = () => {
      const due = getDueReminders(eventsRef.current, new Date(), firedRef.current, snoozedRef.current);
      if (due.length === 0) return;

      due.forEach((event) => {
        snoozedRef.current.delete(event.id);
        firedRef.current.add(event.id);
      });
      saveFiredIds(firedRef.current, eventsRef.current);
      due.forEach((event) => onFireRef.current(event));
    };

    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const snooze = useCallback((eventId: string, minutes: number) => {
    snoozedRef.current.set(eventId, Date.now() + minutes * 60_000);
  }, []);

  /** Po zmianie godziny wydarzenia przypomnienie ma zadziałać ponownie. */
  const clearFired = useCallback((eventId: string) => {
    firedRef.current.delete(eventId);
    snoozedRef.current.delete(eventId);
    saveFiredIds(firedRef.current, eventsRef.current);
  }, []);

  return { snooze, clearFired };
}
