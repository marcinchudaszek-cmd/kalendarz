import { CalendarEvent } from './types';
import {
  startOfWeek,
  addDays,
  setHours,
  setMinutes,
  addHours,
  startOfDay,
} from 'date-fns';

function makeEvent(
  id: string,
  title: string,
  day: Date,
  startHour: number,
  startMin: number,
  durationHours: number,
  categoryId: string,
  allDay = false,
  description = '',
  reminderMinutes: number | null = null
): CalendarEvent {
  const start = setMinutes(setHours(startOfDay(day), startHour), startMin);
  const end = addHours(start, durationHours);
  return { id, title, start, end, categoryId, allDay, description, reminderMinutes };
}

export function generateSampleEvents(): CalendarEvent[] {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const events: CalendarEvent[] = [
    // Wydarzenia w tym tygodniu
    makeEvent('1', 'Daily zespołu', addDays(weekStart, 0), 9, 0, 0.5, 'meeting', false, 'Codzienna synchronizacja z zespołem deweloperskim'),
    makeEvent('2', 'Przegląd projektu', addDays(weekStart, 0), 14, 0, 1.5, 'work', false, 'Przegląd kamieni milowych projektu na Q2'),
    makeEvent('3', 'Siłownia', addDays(weekStart, 0), 7, 0, 1, 'health', false, 'Trening nóg'),
    makeEvent('4', 'Obiad z Kasią', addDays(weekStart, 1), 12, 0, 1, 'social', false, 'Spotkanie we włoskiej restauracji'),
    makeEvent('5', 'Planowanie sprintu', addDays(weekStart, 1), 10, 0, 2, 'meeting', false, 'Zaplanowanie zadań na następny sprint'),
    makeEvent('6', 'Wizyta u lekarza', addDays(weekStart, 2), 15, 0, 1, 'health', false, 'Coroczne badanie kontrolne'),
    makeEvent('7', 'Warsztaty projektowe', addDays(weekStart, 2), 9, 30, 2, 'work', false, 'Burza mózgów nad projektem UX'),
    makeEvent('8', 'Joga', addDays(weekStart, 3), 6, 30, 1, 'health', false, 'Poranna sesja jogi'),
    makeEvent('9', 'Rozmowa z klientem', addDays(weekStart, 3), 11, 0, 1, 'meeting', false, 'Demo dla Acme Corp'),
    makeEvent('10', 'Wyjście integracyjne', addDays(weekStart, 4), 17, 0, 2, 'social', false, 'Piątkowe spotkanie z zespołem'),
    makeEvent('11', 'Wycieczka weekendowa', addDays(weekStart, 5), 8, 0, 8, 'travel', true, 'Jednodniowy wyjazd w góry'),
    makeEvent('12', 'Code review', addDays(weekStart, 3), 14, 0, 1.5, 'work', false, 'Przegląd PR-ów przed wydaniem'),

    // Dzisiejsze wydarzenia
    makeEvent('13', 'Poranna medytacja', today, 6, 0, 0.5, 'personal', false, '15 minut medytacji z przewodnikiem'),
    makeEvent('14', 'Czas na skupienie', today, 10, 0, 2, 'work', false, 'Głęboka praca nad funkcją X'),
    makeEvent('15', '1:1 z przełożonym', today, 13, 0, 0.5, 'meeting', false, 'Cotygodniowe spotkanie'),
    makeEvent('16', 'Spacer', today, 15, 30, 0.5, 'health', false, 'Popołudniowy spacer'),

    // Poprzedni tydzień
    makeEvent('17', 'Retrospektywa', addDays(weekStart, -3), 14, 0, 1, 'meeting'),
    makeEvent('18', 'Dentysta', addDays(weekStart, -4), 9, 0, 1, 'health'),
    makeEvent('19', 'Urodziny', addDays(weekStart, -2), 18, 0, 3, 'social', false, 'Urodziny Alka'),

    // Następny tydzień
    // Wydarzenie wielodniowe — widoczne w każdym dniu trwania
    makeEvent('20', 'Konferencja', addDays(weekStart, 7), 9, 0, 32, 'work', true, 'Konferencja technologiczna, dwa dni', 1440),
    makeEvent('22', 'Lot do Warszawy', addDays(weekStart, 9), 6, 0, 3, 'travel', false, 'Wyjazd służbowy', 120),
    makeEvent('23', 'Klub książki', addDays(weekStart, 10), 19, 0, 1.5, 'social', false, 'Omawiamy „Pułapki myślenia"', 30),
  ];

  return events;
}

let nextId = 100;
export function generateId(): string {
  return String(nextId++);
}
