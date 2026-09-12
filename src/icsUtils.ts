import { CalendarEvent, Category, Recurrence, RecurrenceFreq } from './types';

const FREQ_TO_ICS: Record<RecurrenceFreq, string> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  yearly: 'YEARLY',
};

const ICS_TO_FREQ: Record<string, RecurrenceFreq> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Data i godzina w czasie UTC — jednoznaczna dla każdego programu. */
function toIcsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Sam dzień, bez godziny — dla wydarzeń całodniowych. */
function toIcsDate(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/** Format iCalendar wymaga łamania linii dłuższych niż 75 znaków. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest.length > 0) parts.push(` ${rest}`);
  return parts.join('\r\n');
}

/** Numeracja dni tygodnia w iCalendar, indeksowana jak Date.getDay(). */
const ICS_WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function recurrenceToRrule(recurrence: Recurrence): string {
  const parts = [`FREQ=${FREQ_TO_ICS[recurrence.freq]}`];
  if (recurrence.interval > 1) parts.push(`INTERVAL=${recurrence.interval}`);
  if (recurrence.freq === 'weekly' && recurrence.weekdays?.length) {
    parts.push(`BYDAY=${recurrence.weekdays.map((d) => ICS_WEEKDAYS[d]).join(',')}`);
  }
  if (recurrence.until) parts.push(`UNTIL=${toIcsUtc(recurrence.until)}`);
  return parts.join(';');
}

export function eventsToIcs(events: CalendarEvent[], categories: Category[]): string {
  const stamp = toIcsUtc(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kalendarz//PL',
    'CALSCALE:GREGORIAN',
  ];

  for (const event of events) {
    const categoryName = categories.find((c) => c.id === event.categoryId)?.name;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@kalendarz.local`);
    lines.push(`DTSTAMP:${stamp}`);

    if (event.allDay) {
      // W formacie iCalendar koniec dnia całodniowego wskazuje na dzień następny.
      const endExclusive = new Date(event.end);
      endExclusive.setDate(endExclusive.getDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(event.start)}`);
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(endExclusive)}`);
    } else {
      lines.push(`DTSTART:${toIcsUtc(event.start)}`);
      lines.push(`DTEND:${toIcsUtc(event.end)}`);
    }

    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (categoryName) lines.push(`CATEGORIES:${escapeText(categoryName)}`);
    if (event.recurrence) lines.push(`RRULE:${recurrenceToRrule(event.recurrence)}`);
    if (event.exceptions?.length) {
      for (const day of event.exceptions) lines.push(`EXDATE;VALUE=DATE:${day.replace(/-/g, '')}`);
    }

    if (event.reminderMinutes != null) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${escapeText(event.title)}`);
      lines.push(`TRIGGER:-PT${event.reminderMinutes}M`);
      lines.push('END:VALARM');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n');
}

interface IcsProperty {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parseProperty(line: string): IcsProperty | null {
  const colon = line.indexOf(':');
  if (colon === -1) return null;

  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramParts] = head.split(';');
  const params: Record<string, string> = {};

  for (const part of paramParts) {
    const eq = part.indexOf('=');
    if (eq !== -1) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).toUpperCase();
  }

  return { name: name.toUpperCase(), params, value };
}

function parseIcsDate(value: string, params: Record<string, string>): Date | null {
  const raw = value.trim();

  if (params.VALUE === 'DATE' || /^\d{8}$/.test(raw)) {
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(4, 6)) - 1;
    const day = Number(raw.slice(6, 8));
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(raw);
  if (!match) return null;

  const [, y, mo, d, h, mi, s, zulu] = match;
  const numbers = [y, mo, d, h, mi, s].map(Number);
  const date = zulu
    ? new Date(Date.UTC(numbers[0], numbers[1] - 1, numbers[2], numbers[3], numbers[4], numbers[5]))
    : new Date(numbers[0], numbers[1] - 1, numbers[2], numbers[3], numbers[4], numbers[5]);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRrule(value: string): Recurrence | null {
  const parts = Object.fromEntries(
    value.split(';').map((chunk) => {
      const eq = chunk.indexOf('=');
      return eq === -1 ? [chunk.toUpperCase(), ''] : [chunk.slice(0, eq).toUpperCase(), chunk.slice(eq + 1)];
    })
  );

  const freq = ICS_TO_FREQ[(parts.FREQ ?? '').toUpperCase()];
  if (!freq) return null;

  // BYDAY potrafi mieć przedrostki w rodzaju „2MO" — bierzemy same litery dnia.
  const weekdays = (parts.BYDAY ?? '')
    .split(',')
    .map((token) => ICS_WEEKDAYS.indexOf(token.trim().toUpperCase().slice(-2)))
    .filter((index) => index >= 0);

  return {
    freq,
    interval: Math.max(1, Number(parts.INTERVAL ?? 1) || 1),
    until: parts.UNTIL ? parseIcsDate(parts.UNTIL, {}) : null,
    ...(freq === 'weekly' && weekdays.length > 0
      ? { weekdays: [...new Set(weekdays)].sort((a, b) => a - b) }
      : {}),
  };
}

/**
 * Czyta plik .ics i zwraca wydarzenia. Nieznane pola pomijamy —
 * celem jest przeniesienie planów, a nie pełna zgodność ze standardem.
 */
export function parseIcs(
  text: string,
  categories: Category[],
  makeId: () => string
): CalendarEvent[] {
  // Rozwijamy linie złamane przez format (kontynuacja zaczyna się spacją lub tabulatorem).
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events: CalendarEvent[] = [];
  let current: Partial<CalendarEvent> & { exceptions?: string[] } | null = null;
  let inAlarm = false;
  let allDayEndExclusive: Date | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === 'BEGIN:VEVENT') {
      current = { exceptions: [] };
      allDayEndExclusive = null;
      continue;
    }

    if (trimmed === 'END:VEVENT') {
      if (current?.title && current.start) {
        if (current.allDay && allDayEndExclusive) {
          // Wracamy z „dnia następnego" na ostatni dzień trwania.
          const inclusive = new Date(allDayEndExclusive);
          inclusive.setDate(inclusive.getDate() - 1);
          current.end = inclusive < current.start ? current.start : inclusive;
        }
        events.push({
          id: makeId(),
          title: current.title,
          start: current.start,
          end: current.end ?? new Date(current.start.getTime() + 60 * 60 * 1000),
          categoryId: current.categoryId ?? categories[0]?.id ?? 'work',
          description: current.description ?? '',
          location: current.location ?? '',
          allDay: current.allDay ?? false,
          reminderMinutes: current.reminderMinutes ?? null,
          recurrence: current.recurrence ?? null,
          exceptions: current.exceptions ?? [],
        });
      }
      current = null;
      continue;
    }

    if (!current) continue;

    if (trimmed === 'BEGIN:VALARM') {
      inAlarm = true;
      continue;
    }
    if (trimmed === 'END:VALARM') {
      inAlarm = false;
      continue;
    }

    const property = parseProperty(trimmed);
    if (!property) continue;

    if (inAlarm) {
      if (property.name === 'TRIGGER') {
        const match = /^-P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(property.value.trim().toUpperCase());
        if (match) {
          const [, days, hours, minutes] = match;
          current.reminderMinutes =
            Number(days ?? 0) * 1440 + Number(hours ?? 0) * 60 + Number(minutes ?? 0);
        }
      }
      continue;
    }

    switch (property.name) {
      case 'SUMMARY':
        current.title = unescapeText(property.value);
        break;
      case 'DESCRIPTION':
        current.description = unescapeText(property.value);
        break;
      case 'LOCATION':
        current.location = unescapeText(property.value);
        break;
      case 'DTSTART': {
        const date = parseIcsDate(property.value, property.params);
        if (date) {
          current.start = date;
          current.allDay = property.params.VALUE === 'DATE' || /^\d{8}$/.test(property.value.trim());
        }
        break;
      }
      case 'DTEND': {
        const date = parseIcsDate(property.value, property.params);
        if (date) {
          if (property.params.VALUE === 'DATE' || /^\d{8}$/.test(property.value.trim())) {
            allDayEndExclusive = date;
          } else {
            current.end = date;
          }
        }
        break;
      }
      case 'CATEGORIES': {
        const name = unescapeText(property.value).split(',')[0].trim().toLowerCase();
        const match = categories.find((c) => c.name.toLowerCase() === name);
        if (match) current.categoryId = match.id;
        break;
      }
      case 'RRULE':
        current.recurrence = parseRrule(property.value);
        break;
      case 'EXDATE': {
        const date = parseIcsDate(property.value.split(',')[0], property.params);
        if (date) {
          current.exceptions = [
            ...(current.exceptions ?? []),
            `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
          ];
        }
        break;
      }
    }
  }

  return events;
}
