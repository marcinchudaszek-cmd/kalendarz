/**
 * Własny dźwięk przypomnienia wybrany z telefonu (muzyka, dzwonek, nagranie).
 * Plik trzymamy w IndexedDB — localStorage ma za mało miejsca na audio.
 */

const DB_NAME = 'kalendarz-dzwieki';
const STORE = 'pliki';
const KEY = 'przypomnienie';

/** Powyżej tego rozmiaru prosimy o krótszy plik — przypomnienie i tak gra tylko początek. */
export const MAX_CUSTOM_SOUND_BYTES = 20 * 1024 * 1024;
/** Tyle sekund utworu gra przypomnienie. */
const PLAY_SECONDS = 20;

interface StoredSound {
  name: string;
  blob: Blob;
}

let cachedUrl: string | null = null;
let cachedName: string | null = null;
let current: HTMLAudioElement | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Nazwa zapisanego pliku albo null. Przy okazji przygotowuje adres do odtwarzania. */
export async function loadCustomSound(): Promise<string | null> {
  try {
    const stored = await withStore<StoredSound | undefined>('readonly', (s) => s.get(KEY));
    if (!stored) return null;
    if (cachedUrl) URL.revokeObjectURL(cachedUrl);
    cachedUrl = URL.createObjectURL(stored.blob);
    cachedName = stored.name;
    return stored.name;
  } catch {
    return null;
  }
}

export async function saveCustomSound(file: File): Promise<void> {
  if (file.size > MAX_CUSTOM_SOUND_BYTES) {
    throw new Error('Plik jest za duży (limit 20 MB). Wybierz krótszy utwór albo dzwonek.');
  }
  await withStore('readwrite', (s) => s.put({ name: file.name, blob: file } satisfies StoredSound, KEY));
  await loadCustomSound();
}

export function customSoundName(): string | null {
  return cachedName;
}

export function stopCustomSound(): void {
  if (current) {
    current.pause();
    current = null;
  }
}

/** Gra początek wybranego utworu. Zwraca false, gdy nie ma pliku albo system zablokował odtwarzanie. */
export function playCustomSound(volume: number): boolean {
  if (!cachedUrl) return false;
  stopCustomSound();
  const audio = new Audio(cachedUrl);
  audio.volume = Math.min(1, Math.max(0, volume));
  current = audio;
  const stopAt = window.setTimeout(() => {
    if (current === audio) stopCustomSound();
  }, PLAY_SECONDS * 1000);
  audio.addEventListener('ended', () => window.clearTimeout(stopAt), { once: true });
  audio.play().catch(() => {
    if (current === audio) current = null;
  });
  return true;
}
