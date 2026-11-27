// Lista nowości pokazywana w okienku „Co nowego” po aktualizacji aplikacji.
// Przy każdym wydaniu dopisz wpis NA POCZĄTKU (wersja = versionName z android/app/build.gradle).
export interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.6.0',
    date: 'listopad 2026',
    items: [
      'Powiadomienie o nowej wersji — aktualizację pobierzesz prosto z aplikacji',
      'Okienko „Co nowego” po każdej aktualizacji',
    ],
  },
  {
    version: '1.5.1',
    date: 'listopad 2026',
    items: [
      'Hokej w terminarzach sportowych: mistrzostwa świata i igrzyska',
    ],
  },
  {
    version: '1.5.0',
    date: 'listopad 2026',
    items: [
      'Terminarze sportowe z przypomnieniami: reprezentacje Polski, Puchar Świata w skokach i biathlonie, żużel, Formuła 1',
    ],
  },
];

const KEY = 'kalendarz.ostatniaWersja';

// Czy aplikacja była już używana przed tym uruchomieniem — sprawdzane przy wczytaniu modułu
// (main.tsx importuje go jako pierwszy), zanim cokolwiek zapisze swoje klucze.
const existingUser = (() => {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('kalendarz.'));
  } catch { return false; }
})();

function cmp(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

function read(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function markVersionSeen(version: string) {
  try { localStorage.setItem(KEY, version); } catch { /* bez pamięci */ }
}

/**
 * Wpisy do pokazania po aktualizacji. Pusta lista = nic nie pokazujemy.
 * Nowa instalacja tylko zapamiętuje wersję.
 * Użytkownik sprzed wersji 1.6.0 nie ma zapisanej wersji — pokazujemy mu dwa ostatnie wydania.
 */
export function pendingChangelog(current: string): ChangelogEntry[] {
  const seen = read();
  if (seen === current) return [];
  if (!existingUser && !seen) {
    markVersionSeen(current);
    return [];
  }
  const upToCurrent = CHANGELOG.filter((e) => cmp(e.version, current) <= 0);
  if (!seen) return upToCurrent.slice(0, 2);
  return upToCurrent.filter((e) => cmp(e.version, seen) > 0).slice(0, 4);
}
