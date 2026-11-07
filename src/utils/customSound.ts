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

/** Tyle sekund utworu trafia do dźwięku powiadomienia systemowego. */
const NOTIFICATION_SECONDS = 20;
const NOTIFICATION_RATE = 22050;

/**
 * Zamienia początek zapisanego utworu na krótki WAV (mono, 16 bit) w base64.
 *
 * Powiadomienie przy zamkniętej aplikacji odtwarza system, a nie aplikacja — trzeba mu dać
 * gotowy plik. Przycinamy go do 20 s z wyciszeniem na końcu, żeby przypomnienie nie grało
 * całej piosenki, i zapisujemy jako WAV, który Android odtworzy zawsze (MP3/M4A z telefonu
 * bywają w formatach, których odtwarzacz powiadomień nie obsługuje).
 */
export async function customSoundAsWavBase64(): Promise<string | null> {
  const stored = await withStore<StoredSound | undefined>('readonly', (s) => s.get(KEY)).catch(() => undefined);
  if (!stored) return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(await stored.blob.arrayBuffer());
    const seconds = Math.min(NOTIFICATION_SECONDS, decoded.duration);
    const offline = new OfflineAudioContext(1, Math.ceil(seconds * NOTIFICATION_RATE), NOTIFICATION_RATE);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    const gain = offline.createGain();
    // Krótkie wyciszenie na końcu zamiast ucięcia w pół dźwięku.
    const fade = Math.min(1.5, seconds / 4);
    gain.gain.setValueAtTime(1, Math.max(0, seconds - fade));
    gain.gain.linearRampToValueAtTime(0, seconds);
    src.connect(gain).connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return bytesToBase64(encodeWav(rendered.getChannelData(0), NOTIFICATION_RATE));
  } finally {
    void ctx.close();
  }
}

function encodeWav(samples: Float32Array, rate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const text = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
