import { CalendarEvent, StoredCategory } from './types';

/**
 * Unikalny identyfikator wydarzenia lub kategorii.
 *
 * Wcześniej był to licznik startujący od 100 przy każdym uruchomieniu aplikacji,
 * więc po restarcie nowe wydarzenie dostawało numer już zajęty przez starsze —
 * edycja albo usunięcie jednego trafiała w oba.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Wydarzenia demonstracyjne z dawnego przycisku „Wczytaj przykłady” (do wersji 1.3.1).
 * Rozpoznajemy je po komplecie: numer, tytuł i opis — wydarzenia użytkownika nigdy
 * nie miały numerów 1–23, więc nic prawdziwego się tu nie załapie.
 */
const SAMPLE_SIGNATURES: [string, string, string][] = [
  ['1', 'Daily zespołu', 'Codzienna synchronizacja z zespołem deweloperskim'],
  ['2', 'Przegląd projektu', 'Przegląd kamieni milowych projektu na Q2'],
  ['3', 'Siłownia', 'Trening nóg'],
  ['4', 'Obiad z Kasią', 'Spotkanie we włoskiej restauracji'],
  ['5', 'Planowanie sprintu', 'Zaplanowanie zadań na następny sprint'],
  ['6', 'Wizyta u lekarza', 'Coroczne badanie kontrolne'],
  ['7', 'Warsztaty projektowe', 'Burza mózgów nad projektem UX'],
  ['8', 'Joga', 'Poranna sesja jogi'],
  ['9', 'Rozmowa z klientem', 'Demo dla Acme Corp'],
  ['10', 'Wyjście integracyjne', 'Piątkowe spotkanie z zespołem'],
  ['11', 'Wycieczka weekendowa', 'Jednodniowy wyjazd w góry'],
  ['12', 'Code review', 'Przegląd PR-ów przed wydaniem'],
  ['13', 'Poranna medytacja', '15 minut medytacji z przewodnikiem'],
  ['14', 'Czas na skupienie', 'Głęboka praca nad funkcją X'],
  ['15', '1:1 z przełożonym', 'Cotygodniowe spotkanie'],
  ['16', 'Spacer', 'Popołudniowy spacer'],
  ['17', 'Retrospektywa', ''],
  ['18', 'Dentysta', ''],
  ['19', 'Urodziny', 'Urodziny Alka'],
  ['20', 'Konferencja', 'Konferencja technologiczna, dwa dni'],
  ['22', 'Lot do Warszawy', 'Wyjazd służbowy'],
  ['23', 'Klub książki', 'Omawiamy „Pułapki myślenia"'],
];

function isSampleEvent(event: CalendarEvent): boolean {
  return SAMPLE_SIGNATURES.some(
    ([id, title, description]) =>
      event.id === id && event.title === title && (event.description ?? '') === description
  );
}

/**
 * Porządkuje wydarzenia wczytane z pamięci: usuwa przykłady demonstracyjne
 * i nadaje nowe identyfikatory zdublowanym wydarzeniom (pozostałość po starym liczniku).
 */
export function cleanLoadedEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return events
    .filter((e) => !isSampleEvent(e))
    .map((e) => {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        return e;
      }
      const id = generateId();
      seen.add(id);
      return { ...e, id };
    });
}

/** To samo dla kategorii — dwie kategorie z tym samym numerem były nie do odróżnienia. */
export function dedupeCategories(categories: StoredCategory[]): StoredCategory[] {
  const seen = new Set<string>();
  return categories.map((c) => {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      return c;
    }
    const id = generateId();
    seen.add(id);
    return { ...c, id };
  });
}
