import { CATEGORY_COLORS } from '../categoryColors';
import { CalendarEvent, Category } from '../types';
import type { SportEvent, SportKey } from './parsers.ts';

export type { SportKey };

export interface SportSettings {
  /** Wybrane dyscypliny. Pusta lista = sport wyłączony, aplikacja nic nie pobiera. */
  selected: SportKey[];
  /** Ile minut przed meczem/wyścigiem przypomnieć. null = bez przypomnień. */
  reminderMinutes: number | null;
}

export interface SportCache {
  /** Dla jakiego wyboru pobrano dane — po zmianie wyboru pobieramy od nowa. */
  key: string;
  fetchedAt: number;
  events: SportEvent[];
  errors: string[];
}

/** Po nieudanym pobraniu części źródeł próbujemy ponownie szybciej niż zwykle. */
export const SPORT_RETRY_MS = 60 * 60 * 1000;

/**
 * Łączy świeży terminarz z poprzednim: wydarzenia dyscyplin, których źródło tym razem
 * nie odpowiedziało, bierzemy z poprzedniej kopii, zamiast je gubić do następnego odświeżenia.
 */
export function mergeSportEvents(fresh: SportEvent[], previous: SportEvent[] | undefined, failed: SportKey[]): SportEvent[] {
  if (!previous || failed.length === 0) return fresh;
  const bad = new Set(failed);
  const ids = new Set(fresh.map((e) => e.id));
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const kept = previous.filter(
    (e) => e.sports.some((s) => bad.has(s)) && !ids.has(e.id) && e.start.slice(0, 10) >= yesterday
  );
  return [...fresh, ...kept].sort((a, b) => a.start.localeCompare(b.start));
}

export const SPORT_OPTIONS: { group: string; items: { key: SportKey; label: string }[] }[] = [
  { group: 'Piłka nożna – reprezentacja Polski', items: [{ key: 'pilka_m', label: 'Mężczyźni' }, { key: 'pilka_k', label: 'Kobiety' }] },
  { group: 'Koszykówka – reprezentacja Polski', items: [{ key: 'kosz_m', label: 'Mężczyźni' }, { key: 'kosz_k', label: 'Kobiety' }] },
  { group: 'Piłka ręczna – reprezentacja Polski', items: [{ key: 'reczna_m', label: 'Mężczyźni' }, { key: 'reczna_k', label: 'Kobiety' }] },
  { group: 'Hokej na lodzie – reprezentacja Polski', items: [{ key: 'hokej_m', label: 'Mężczyźni' }, { key: 'hokej_k', label: 'Kobiety' }] },
  { group: 'Skoki narciarskie – Puchar Świata', items: [{ key: 'skoki_m', label: 'Mężczyźni' }, { key: 'skoki_k', label: 'Kobiety' }] },
  { group: 'Biatlon – Puchar Świata', items: [{ key: 'biatlon_m', label: 'Mężczyźni' }, { key: 'biatlon_k', label: 'Kobiety' }] },
  { group: 'Żużel', items: [{ key: 'zuzel', label: 'Grand Prix (mistrzostwa świata)' }] },
  { group: 'Formuła 1', items: [{ key: 'f1', label: 'Wyścigi, sprinty i kwalifikacje' }] },
];

const ALL_KEYS = new Set<SportKey>(SPORT_OPTIONS.flatMap((g) => g.items.map((i) => i.key)));

export const SPORT_CATEGORY_ID = 'sport';

/** Kategoria tylko do wyświetlania — jak święta, nie ma jej w zarządzaniu kategoriami. */
export const SPORT_CATEGORY: Category = {
  ...(CATEGORY_COLORS.find((c) => c.id === 'cyan') ?? CATEGORY_COLORS[0]),
  id: SPORT_CATEGORY_ID,
  name: 'Sport',
  colorId: 'cyan',
};

const SETTINGS_KEY = 'kalendarz.sport';
const CACHE_KEY = 'kalendarz.sportTerminarz';
export const DEFAULT_SPORT_SETTINGS: SportSettings = { selected: [], reminderMinutes: 30 };
/** Terminarz odświeżamy najwyżej co tyle — godziny meczów zmieniają się rzadko. */
export const SPORT_REFRESH_MS = 12 * 60 * 60 * 1000;
/** Wydarzenia całodniowe (skoki, biatlon, żużel) — przypomnienie wieczorem dzień wcześniej, o 20:00. */
const ALL_DAY_REMINDER_MINUTES = 4 * 60;

export function loadSportSettings(): SportSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<SportSettings> | null;
    if (!raw) return DEFAULT_SPORT_SETTINGS;
    return {
      selected: Array.isArray(raw.selected) ? raw.selected.filter((k): k is SportKey => ALL_KEYS.has(k)) : [],
      reminderMinutes:
        raw.reminderMinutes === null || typeof raw.reminderMinutes === 'number' ? raw.reminderMinutes : 30,
    };
  } catch {
    return DEFAULT_SPORT_SETTINGS;
  }
}

export function saveSportSettings(s: SportSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // brak miejsca — ustawienia wrócą do domyślnych
  }
}

export function selectionKey(selected: SportKey[]): string {
  return [...selected].sort().join(',');
}

export function loadSportCache(): SportCache | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as SportCache | null;
    return raw && Array.isArray(raw.events) ? raw : null;
  } catch {
    return null;
  }
}

export function saveSportCache(c: SportCache | null): void {
  try {
    if (c) localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // Terminarz to kopia z sieci — bez zapisu po prostu pobierzemy go znowu.
  }
}

/** Terminy z sieci → wydarzenia kalendarza (tylko do odczytu). */
export function sportCalendarEvents(events: SportEvent[], settings: SportSettings): CalendarEvent[] {
  const wanted = new Set(settings.selected);
  const out: CalendarEvent[] = [];
  for (const e of events) {
    if (!e.sports.some((s) => wanted.has(s))) continue;
    let start: Date;
    let end: Date;
    if (e.allDay) {
      const [y, m, d] = e.start.split('-').map(Number);
      start = new Date(y, m - 1, d);
      end = new Date(y, m - 1, d, 23, 59);
    } else {
      start = new Date(e.start);
      end = new Date(start.getTime() + Math.max(30, e.minutes) * 60000);
    }
    if (Number.isNaN(start.getTime())) continue;
    out.push({
      id: `sport:${e.id}`,
      title: e.title,
      start,
      end,
      allDay: e.allDay,
      categoryId: SPORT_CATEGORY_ID,
      description: e.competition,
      location: e.place,
      reminderMinutes:
        settings.reminderMinutes === null ? null : e.allDay ? ALL_DAY_REMINDER_MINUTES : settings.reminderMinutes,
      external: true,
    });
  }
  return out;
}
