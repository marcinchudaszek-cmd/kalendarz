import {
  CalendarEvent,
  RecurrenceFreq,
  ReminderSettings,
  StoredCategory,
  ThemeMode,
  ViewMode,
  DEFAULT_REMINDER_SETTINGS,
  SOUND_IDS,
} from './types';
import { DEFAULT_HOLIDAY_SETTINGS, GERMAN_STATES, HolidaySettings } from './holidays';

const EVENTS_KEY = 'kalendarz.wydarzenia';
const SETTINGS_KEY = 'kalendarz.przypomnienia';
const FIRED_KEY = 'kalendarz.pokazanePrzypomnienia';
const THEME_KEY = 'kalendarz.motyw';
const CATEGORIES_KEY = 'kalendarz.kategorie';
const HOLIDAYS_KEY = 'kalendarz.swieta';
const VIEW_KEY = 'kalendarz.widok';
const VIEWS: ViewMode[] = ['year', 'month', 'week', 'day', 'agenda'];

interface StoredEvent extends Omit<CalendarEvent, 'start' | 'end' | 'recurrence'> {
  start: string;
  end: string;
  recurrence?: {
    freq: RecurrenceFreq;
    interval: number;
    until: string | null;
    weekdays?: number[];
  } | null;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Brak miejsca albo tryb prywatny — aplikacja działa dalej bez zapisu.
  }
}

export function loadEvents(): CalendarEvent[] | null {
  const stored = read<StoredEvent[]>(EVENTS_KEY);
  if (!stored) return null;

  const events: CalendarEvent[] = stored
    .map((e) => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
      recurrence: e.recurrence
        ? { ...e.recurrence, until: e.recurrence.until ? new Date(e.recurrence.until) : null }
        : null,
    }))
    .filter((e) => !Number.isNaN(e.start.getTime()) && !Number.isNaN(e.end.getTime()));

  return events.length > 0 ? events : null;
}

export function saveEvents(events: CalendarEvent[]): void {
  write(
    EVENTS_KEY,
    events.map<StoredEvent>((e) => ({
      ...e,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      recurrence: e.recurrence
        ? { ...e.recurrence, until: e.recurrence.until ? e.recurrence.until.toISOString() : null }
        : null,
    }))
  );
}

export function loadSettings(): ReminderSettings {
  const settings = {
    ...DEFAULT_REMINDER_SETTINGS,
    ...(read<Partial<ReminderSettings>>(SETTINGS_KEY) ?? {}),
  };
  // Zapis mógł pochodzić ze starszej wersji albo zostać ręcznie zepsuty.
  if (!SOUND_IDS.includes(settings.sound)) settings.sound = DEFAULT_REMINDER_SETTINGS.sound;
  return settings;
}

export function saveSettings(settings: ReminderSettings): void {
  write(SETTINGS_KEY, settings);
}

export function loadCategories(): StoredCategory[] | null {
  const stored = read<StoredCategory[]>(CATEGORIES_KEY);
  if (!Array.isArray(stored)) return null;

  const valid = stored.filter(
    (c) => c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.colorId === 'string'
  );
  return valid.length > 0 ? valid : null;
}

export function saveCategories(categories: StoredCategory[]): void {
  write(CATEGORIES_KEY, categories);
}

export function loadHolidaySettings(): HolidaySettings {
  const stored = read<Partial<HolidaySettings>>(HOLIDAYS_KEY) ?? {};
  const state = GERMAN_STATES.some((s) => s.value === stored.deState) ? stored.deState! : null;
  return {
    pl: typeof stored.pl === 'boolean' ? stored.pl : DEFAULT_HOLIDAY_SETTINGS.pl,
    de: typeof stored.de === 'boolean' ? stored.de : DEFAULT_HOLIDAY_SETTINGS.de,
    deState: state,
  };
}

export function saveHolidaySettings(settings: HolidaySettings): void {
  write(HOLIDAYS_KEY, settings);
}

export function loadView(): ViewMode | null {
  const stored = read<ViewMode>(VIEW_KEY);
  return stored && VIEWS.includes(stored) ? stored : null;
}

export function saveView(view: ViewMode): void {
  write(VIEW_KEY, view);
}

export function loadTheme(): ThemeMode {
  const stored = read<ThemeMode>(THEME_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

export function saveTheme(mode: ThemeMode): void {
  write(THEME_KEY, mode);
}

export function loadFiredIds(): Set<string> {
  return new Set(read<string[]>(FIRED_KEY) ?? []);
}

/** Zapisuje tylko identyfikatory wciąż istniejących wydarzeń, żeby lista nie rosła w nieskończoność. */
export function saveFiredIds(fired: Set<string>, events: CalendarEvent[]): void {
  const alive = new Set(events.map((e) => e.id));
  write(FIRED_KEY, [...fired].filter((id) => alive.has(id)));
}
