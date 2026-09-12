export type ViewMode = 'month' | 'week' | 'day' | 'agenda';

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Recurrence {
  freq: RecurrenceFreq;
  /** Co ile jednostek się powtarza (co 2 tygodnie itd.). */
  interval: number;
  /** Ostatni dzień powtarzania. null = bez końca. */
  until: Date | null;
  /**
   * Tylko dla powtarzania co tydzień: dni tygodnia w numeracji JavaScriptu
   * (0 = niedziela, 1 = poniedziałek …). Pusta lista albo brak = dzień z daty rozpoczęcia.
   */
  weekdays?: number[];
}

/** Kolejność zgodna z polskim tygodniem — od poniedziałku. */
export const WEEKDAY_OPTIONS: { value: number; short: string; name: string }[] = [
  { value: 1, short: 'Pon', name: 'poniedziałek' },
  { value: 2, short: 'Wt', name: 'wtorek' },
  { value: 3, short: 'Śr', name: 'środa' },
  { value: 4, short: 'Czw', name: 'czwartek' },
  { value: 5, short: 'Pt', name: 'piątek' },
  { value: 6, short: 'Sob', name: 'sobota' },
  { value: 0, short: 'Niedz', name: 'niedziela' },
];

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  categoryId: string;
  description?: string;
  /** Adres albo link do spotkania online. */
  location?: string;
  allDay?: boolean;
  /** Ile minut przed rozpoczęciem przypomnieć. null = bez przypomnienia. */
  reminderMinutes?: number | null;
  recurrence?: Recurrence | null;
  /** Dni (yyyy-MM-dd) wystąpień usuniętych z serii. */
  exceptions?: string[];
  /** Ustawiane tylko na wystąpieniach wygenerowanych z serii. */
  seriesId?: string;
  /** Dzień wystąpienia (yyyy-MM-dd) — klucz wyjątków i przypomnień. */
  occurrenceDate?: string;
}

export const RECURRENCE_OPTIONS: { value: RecurrenceFreq | null; label: string }[] = [
  { value: null, label: 'Nie powtarza się' },
  { value: 'daily', label: 'Codziennie' },
  { value: 'weekly', label: 'Co tydzień' },
  { value: 'monthly', label: 'Co miesiąc' },
  { value: 'yearly', label: 'Co rok' },
];

const FREQ_LABELS: Record<RecurrenceFreq, [string, string, string]> = {
  // [co 1, co 2–4, co 5+]
  daily: ['dzień', 'dni', 'dni'],
  weekly: ['tydzień', 'tygodnie', 'tygodni'],
  monthly: ['miesiąc', 'miesiące', 'miesięcy'],
  yearly: ['rok', 'lata', 'lat'],
};

export function recurrenceLabel(recurrence: Recurrence | null | undefined): string | null {
  if (!recurrence) return null;

  const { freq, interval, weekdays } = recurrence;

  let base: string;
  if (interval === 1) {
    base = RECURRENCE_OPTIONS.find((o) => o.value === freq)?.label ?? '';
  } else {
    const [, few, many] = FREQ_LABELS[freq];
    const lastDigit = interval % 10;
    const lastTwo = interval % 100;
    const useFew = lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
    base = `Co ${interval} ${useFew ? few : many}`;
  }

  if (freq === 'weekly' && weekdays && weekdays.length > 0) {
    const names = WEEKDAY_OPTIONS.filter((o) => weekdays.includes(o.value)).map((o) =>
      o.short.toLowerCase()
    );
    return `${base}: ${names.join(', ')}`;
  }

  return base || null;
}

/** To, co trafia do zapisu — bez klas CSS, które mogą się zmienić między wersjami. */
export interface StoredCategory {
  id: string;
  name: string;
  colorId: string;
}

/** Zestaw klas jednego koloru z palety. */
export interface CategoryColor {
  id: string;
  name: string;
  color: string;        // tailwind bg class
  textColor: string;     // tailwind text class
  bgLight: string;       // light background
  bgDark: string;        // tło kafelka w trybie ciemnym
  textDark: string;      // kolor tekstu w trybie ciemnym
  borderColor: string;   // left border color
  dotColor: string;      // dot/indicator color hex
}

export interface Category extends CategoryColor {
  /** Identyfikator kategorii, nie koloru. */
  id: string;
  /** Nazwa kategorii nadana przez użytkownika. */
  name: string;
  colorId: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type SoundId = 'chime' | 'ping' | 'marimba' | 'gong' | 'beep';

export const SOUND_IDS: SoundId[] = ['chime', 'ping', 'marimba', 'gong', 'beep'];

export interface ReminderSettings {
  soundEnabled: boolean;
  /** Który dźwięk odtwarzamy przy przypomnieniu. */
  sound: SoundId;
  /** Głośność dzwonka w zakresie 0–1. */
  volume: number;
  systemNotifications: boolean;
  /** Przypomnienie proponowane dla nowych wydarzeń. null = brak. */
  defaultMinutes: number | null;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  soundEnabled: true,
  sound: 'chime',
  volume: 0.6,
  systemNotifications: false,
  defaultMinutes: 10,
};

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Brak' },
  { value: 0, label: 'O czasie' },
  { value: 5, label: '5 min przed' },
  { value: 10, label: '10 min przed' },
  { value: 15, label: '15 min przed' },
  { value: 30, label: '30 min przed' },
  { value: 60, label: 'Godzinę przed' },
  { value: 120, label: '2 godziny przed' },
  { value: 1440, label: 'Dzień przed' },
];

export function reminderLabel(minutes: number | null | undefined): string {
  const option = REMINDER_OPTIONS.find((o) => o.value === (minutes ?? null));
  return option ? option.label : `${minutes} min przed`;
}
