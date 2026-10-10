import { CalendarEvent, Category } from './types';
import { CATEGORY_COLORS } from './categoryColors';

/**
 * Dni ustawowo wolne od pracy w Polsce i Niemczech. Liczone w locie dla potrzebnych lat —
 * nie trafiają do zapisu, eksportu .ics ani historii cofania.
 */

export type GermanState =
  | 'BW' | 'BY' | 'BE' | 'BB' | 'HB' | 'HH' | 'HE' | 'MV'
  | 'NI' | 'NW' | 'RP' | 'SL' | 'SN' | 'ST' | 'SH' | 'TH';

export const GERMAN_STATES: { value: GermanState; name: string }[] = [
  { value: 'BW', name: 'Badenia-Wirtembergia' },
  { value: 'BY', name: 'Bawaria' },
  { value: 'BE', name: 'Berlin' },
  { value: 'BB', name: 'Brandenburgia' },
  { value: 'HB', name: 'Brema' },
  { value: 'HH', name: 'Hamburg' },
  { value: 'HE', name: 'Hesja' },
  { value: 'MV', name: 'Meklemburgia-Pomorze Przednie' },
  { value: 'NI', name: 'Dolna Saksonia' },
  { value: 'NW', name: 'Nadrenia Północna-Westfalia' },
  { value: 'RP', name: 'Nadrenia-Palatynat' },
  { value: 'SL', name: 'Saara' },
  { value: 'SN', name: 'Saksonia' },
  { value: 'ST', name: 'Saksonia-Anhalt' },
  { value: 'SH', name: 'Szlezwik-Holsztyn' },
  { value: 'TH', name: 'Turyngia' },
];

export interface HolidaySettings {
  pl: boolean;
  de: boolean;
  /** Kraj związkowy dla świąt regionalnych. null = tylko święta ogólnoniemieckie. */
  deState: GermanState | null;
}

export const DEFAULT_HOLIDAY_SETTINGS: HolidaySettings = { pl: true, de: false, deState: null };

export const HOLIDAY_CATEGORY_ID = 'swieta';

/** Kategoria tylko do wyświetlania — nie ma jej w zarządzaniu kategoriami. */
export const HOLIDAY_CATEGORY: Category = {
  ...(CATEGORY_COLORS.find((c) => c.id === 'red') ?? CATEGORY_COLORS[0]),
  id: HOLIDAY_CATEGORY_ID,
  name: 'Święta i dni wolne',
  colorId: 'red',
};

/** Niedziela Wielkanocna — algorytm Meeusa/Jonesa/Butchera (kalendarz gregoriański). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

interface HolidayDef {
  date: Date;
  /** Nazwa po polsku. */
  name: string;
  /** Nazwa oryginalna (dla Niemiec). */
  local?: string;
}

function plus(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function polishHolidays(year: number): HolidayDef[] {
  const easter = easterSunday(year);
  const list: HolidayDef[] = [
    { date: new Date(year, 0, 1), name: 'Nowy Rok' },
    { date: new Date(year, 0, 6), name: 'Trzech Króli' },
    { date: easter, name: 'Wielkanoc' },
    { date: plus(easter, 1), name: 'Poniedziałek Wielkanocny' },
    { date: new Date(year, 4, 1), name: 'Święto Pracy' },
    { date: new Date(year, 4, 3), name: 'Święto Konstytucji 3 Maja' },
    { date: plus(easter, 49), name: 'Zielone Świątki' },
    { date: plus(easter, 60), name: 'Boże Ciało' },
    { date: new Date(year, 7, 15), name: 'Wniebowzięcie NMP' },
    { date: new Date(year, 10, 1), name: 'Wszystkich Świętych' },
    { date: new Date(year, 10, 11), name: 'Narodowe Święto Niepodległości' },
    { date: new Date(year, 11, 25), name: 'Boże Narodzenie' },
    { date: new Date(year, 11, 26), name: 'Drugi dzień Bożego Narodzenia' },
  ];
  // Wigilia jest dniem wolnym od 2025 roku.
  if (year >= 2025) list.push({ date: new Date(year, 11, 24), name: 'Wigilia' });
  return list;
}

/** Środa przed 23 listopada. */
function bussUndBettag(year: number): Date {
  const d = new Date(year, 10, 22);
  while (d.getDay() !== 3) d.setDate(d.getDate() - 1);
  return d;
}

function germanHolidays(year: number, state: GermanState | null): (HolidayDef & { regional: boolean })[] {
  const easter = easterSunday(year);
  const all: (HolidayDef & { states?: GermanState[] })[] = [
    { date: new Date(year, 0, 1), name: 'Nowy Rok', local: 'Neujahr' },
    { date: new Date(year, 0, 6), name: 'Trzech Króli', local: 'Heilige Drei Könige', states: ['BW', 'BY', 'ST'] },
    { date: new Date(year, 2, 8), name: 'Dzień Kobiet', local: 'Internationaler Frauentag', states: ['BE', 'MV'] },
    { date: plus(easter, -2), name: 'Wielki Piątek', local: 'Karfreitag' },
    { date: easter, name: 'Wielkanoc', local: 'Ostersonntag', states: ['BB'] },
    { date: plus(easter, 1), name: 'Poniedziałek Wielkanocny', local: 'Ostermontag' },
    { date: new Date(year, 4, 1), name: 'Święto Pracy', local: 'Tag der Arbeit' },
    { date: plus(easter, 39), name: 'Wniebowstąpienie', local: 'Christi Himmelfahrt' },
    { date: plus(easter, 49), name: 'Zielone Świątki', local: 'Pfingstsonntag', states: ['BB'] },
    { date: plus(easter, 50), name: 'Poniedziałek Zielonoświątkowy', local: 'Pfingstmontag' },
    {
      date: plus(easter, 60),
      name: 'Boże Ciało',
      local: 'Fronleichnam',
      states: ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'],
    },
    { date: new Date(year, 7, 15), name: 'Wniebowzięcie NMP', local: 'Mariä Himmelfahrt', states: ['BY', 'SL'] },
    { date: new Date(year, 8, 20), name: 'Dzień Dziecka', local: 'Weltkindertag', states: ['TH'] },
    { date: new Date(year, 9, 3), name: 'Dzień Jedności Niemiec', local: 'Tag der Deutschen Einheit' },
    {
      date: new Date(year, 9, 31),
      name: 'Święto Reformacji',
      local: 'Reformationstag',
      states: ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'],
    },
    {
      date: new Date(year, 10, 1),
      name: 'Wszystkich Świętych',
      local: 'Allerheiligen',
      states: ['BW', 'BY', 'NW', 'RP', 'SL'],
    },
    { date: bussUndBettag(year), name: 'Dzień Pokuty i Modlitwy', local: 'Buß- und Bettag', states: ['SN'] },
    { date: new Date(year, 11, 25), name: 'Boże Narodzenie', local: '1. Weihnachtstag' },
    { date: new Date(year, 11, 26), name: 'Drugi dzień Bożego Narodzenia', local: '2. Weihnachtstag' },
  ];

  return all
    .filter((h) => !h.states || (state !== null && h.states.includes(state)))
    .map((h) => ({ date: h.date, name: h.name, local: h.local, regional: !!h.states }));
}

function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Święta z podanych lat jako całodniowe wydarzenia tylko do odczytu. */
export function holidayEvents(years: number[], settings: HolidaySettings): CalendarEvent[] {
  const both = settings.pl && settings.de;
  const stateName = GERMAN_STATES.find((s) => s.value === settings.deState)?.name;
  const events: CalendarEvent[] = [];

  for (const year of [...new Set(years)].sort()) {
    if (settings.pl) {
      for (const h of polishHolidays(year)) {
        events.push({
          id: `swieto-PL-${dayKey(h.date)}`,
          title: both ? `PL · ${h.name}` : h.name,
          start: h.date,
          end: h.date,
          allDay: true,
          categoryId: HOLIDAY_CATEGORY_ID,
          description: 'Dzień ustawowo wolny od pracy w Polsce',
          holiday: true,
        });
      }
    }
    if (settings.de) {
      for (const h of germanHolidays(year, settings.deState)) {
        events.push({
          id: `swieto-DE-${dayKey(h.date)}`,
          title: both ? `DE · ${h.name}` : h.name,
          start: h.date,
          end: h.date,
          allDay: true,
          categoryId: HOLIDAY_CATEGORY_ID,
          description: `${h.local} — dzień wolny w Niemczech${h.regional && stateName ? ` (${stateName})` : ' (cały kraj)'}${
            h.local === 'Mariä Himmelfahrt' && settings.deState === 'BY'
              ? '. W Bawarii tylko w gminach z przewagą katolików'
              : ''
          }`,
          holiday: true,
        });
      }
    }
  }
  return events;
}
