import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { CalendarEvent, Category } from '../types';
import { expandEvents } from '../recurrenceUtils';
import { addDays, endOfDay, startOfDay } from '../calendarUtils';
import { isNativePlatform } from './nativeNotifications';

/** Kliknięcie w widżecie: otwórz dziś, dodaj wydarzenie albo pokaż konkretny dzień. */
export interface WidgetAction {
  akcja: 'dzis' | 'nowe' | 'dzien';
  /** yyyy-MM-dd przy akcji „dzien”. */
  dzien?: string;
}

interface KalendarzWidzetPlugin {
  zapiszWydarzenia(options: { json: string }): Promise<void>;
  addListener(event: 'akcja', handler: (action: WidgetAction) => void): Promise<PluginListenerHandle>;
}

const Widzet = registerPlugin<KalendarzWidzetPlugin>('KalendarzWidzet');

/** Widżet pokazuje tydzień — z zapasem, żeby działał też, gdy aplikacja długo nie była otwierana. */
const DNI_NAPRZOD = 14;
const MAX_WYDARZEN = 120;

/**
 * Przekazuje widżetowi najbliższe wydarzenia, z rozpisanymi powtórzeniami.
 * Widżet pokazuje wszystkie kategorie — ukrycie kategorii dotyczy tylko widoku w aplikacji.
 */
export async function updateWidget(events: CalendarEvent[], categories: Category[]): Promise<void> {
  if (!isNativePlatform()) return;

  const now = new Date();
  const colors = new Map(categories.map((c) => [c.id, c.dotColor]));
  const items = expandEvents(events, startOfDay(addDays(now, -1)), endOfDay(addDays(now, DNI_NAPRZOD)))
    .filter((e) => e.end.getTime() > startOfDay(now).getTime())
    .sort((a, b) => {
      // Całodniowe na początku dnia, potem według godziny.
      const byStart = startOfDay(a.start).getTime() - startOfDay(b.start).getTime();
      if (byStart !== 0) return byStart;
      if (!!a.allDay !== !!b.allDay) return a.allDay ? -1 : 1;
      return a.start.getTime() - b.start.getTime();
    })
    .slice(0, MAX_WYDARZEN)
    .map((e) => ({
      t: e.title,
      s: e.start.getTime(),
      e: e.end.getTime(),
      a: !!e.allDay,
      c: colors.get(e.categoryId) ?? '#3b82f6',
    }));

  try {
    await Widzet.zapiszWydarzenia({ json: JSON.stringify(items) });
  } catch {
    // Starsza wersja natywna bez widżetu — nic nie tracimy.
  }
}

/** Nasłuchuje kliknięć w widżecie. Zwraca funkcję sprzątającą. */
export function onWidgetAction(handler: (action: WidgetAction) => void): () => void {
  if (!isNativePlatform()) return () => {};
  let handle: PluginListenerHandle | null = null;
  let removed = false;
  void Widzet.addListener('akcja', handler).then((h) => {
    if (removed) void h.remove();
    else handle = h;
  });
  return () => {
    removed = true;
    void handle?.remove();
  };
}
