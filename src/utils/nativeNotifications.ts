import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ScheduledReminder } from './pwa';
import { customSoundAsWavBase64, customSoundName } from './customSound';

/**
 * Osobny kanał pozwala użytkownikowi sterować dźwiękiem przypomnień w ustawieniach Androida.
 *
 * Kanał ma własny, wbudowany dźwięk (res/raw/przypomnienie.wav). Pierwszy kanał „przypomnienia”
 * korzystał z domyślnego dźwięku powiadomień telefonu — gdy ktoś ma go ustawionego na „Brak”,
 * przypomnienia przychodziły bez dźwięku. Dźwięku istniejącego kanału Android nie pozwala zmienić,
 * stąd nowy identyfikator i usunięcie starego kanału.
 */
const KANAL = 'przypomnienia-dzwiek';
const STARY_KANAL = 'przypomnienia';
const DZWIEK = 'przypomnienie.wav';
/** Android ogranicza liczbę zaplanowanych alarmów — bierzemy tylko najbliższe. */
const MAX_ZAPLANOWANYCH = 64;

/**
 * Kanał z dźwiękiem wybranym przez użytkownika (tworzy go wtyczka KalendarzSystem).
 * Zapamiętujemy go, żeby nie przerabiać utworu przy każdym uruchomieniu.
 */
const WLASNY_KANAL_KEY = 'kalendarz.kanalWlasnegoDzwieku';
let uzyjWlasnego = false;

function zapisanyWlasnyKanal(): string | null {
  try {
    return localStorage.getItem(WLASNY_KANAL_KEY);
  } catch {
    return null;
  }
}

/** Kanał, którym planujemy przypomnienia — zależy od wybranego dźwięku. */
function aktywnyKanal(): string {
  const wlasny = zapisanyWlasnyKanal();
  return uzyjWlasnego && wlasny ? wlasny : KANAL;
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** Identyfikator powiadomienia musi być liczbą — robimy z tekstu stabilny skrót. */
function numericId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2_000_000_000;
}

async function ensureChannel(): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id: KANAL,
      name: 'Przypomnienia o wydarzeniach',
      description: 'Powiadomienia o zbliżających się wydarzeniach z kalendarza',
      importance: 5,
      visibility: 1,
      sound: DZWIEK,
      vibration: true,
    });
    await LocalNotifications.deleteChannel({ id: STARY_KANAL }).catch(() => undefined);
  } catch {
    // Kanały istnieją tylko na Androidzie 8+; gdzie indziej to nie problem.
  }
}

export async function checkNativePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  const status = await LocalNotifications.checkPermissions();
  if (status.display === 'granted') return 'granted';
  if (status.display === 'denied') return 'denied';
  return 'prompt';
}

export async function requestNativePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  const status = await LocalNotifications.requestPermissions();
  if (status.display === 'granted') {
    await ensureChannel();
    return 'granted';
  }
  return status.display === 'denied' ? 'denied' : 'prompt';
}

/**
 * Przekazuje systemowi listę nadchodzących przypomnień. System pokaże je nawet wtedy,
 * gdy aplikacja jest zamknięta — dlatego przy każdej zmianie kasujemy poprzedni plan
 * i ustawiamy go od nowa.
 */
export async function scheduleNativeReminders(items: ScheduledReminder[]): Promise<void> {
  try {
    await ensureChannel();

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    const doZaplanowania = items
      .filter((item) => item.timestamp > Date.now())
      .slice(0, MAX_ZAPLANOWANYCH);
    if (doZaplanowania.length === 0) return;

    await LocalNotifications.schedule({
      notifications: doZaplanowania.map((item) => ({
        id: numericId(item.id),
        title: item.title,
        body: item.body,
        channelId: aktywnyKanal(),
        // Dla Androida 7 (bez kanałów) dźwięk podaje się przy samym powiadomieniu.
        sound: DZWIEK,
        smallIcon: 'ic_stat_kalendarz',
        schedule: { at: new Date(item.timestamp), allowWhileIdle: true },
      })),
    });
  } catch {
    // Brak uprawnień albo starszy Android — zostają przypomnienia w aplikacji.
  }
}

export async function cancelAllNativeReminders(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
  } catch {
    // nic do posprzątania
  }
}

interface KalendarzSystemPlugin {
  otworzUstawieniaDzwieku(options: { kanal: string }): Promise<void>;
  ustawWlasnyDzwiek(options: { dane: string; nazwa: string }): Promise<{ kanal: string }>;
  usunWlasnyDzwiek(): Promise<void>;
}

const KalendarzSystem = registerPlugin<KalendarzSystemPlugin>('KalendarzSystem');

/**
 * Ustawia dźwięk powiadomień systemowych zgodnie z wyborem w aplikacji.
 *
 * Przy własnym pliku przerabiamy jego początek na WAV i zakładamy dla niego kanał — tylko tak
 * zagra on przy zamkniętej aplikacji. `nowyPlik` wymusza przygotowanie kanału od nowa
 * (użytkownik wskazał inny utwór). Zwraca false, gdy własnego dźwięku nie dało się ustawić
 * i przypomnienia zagrają wbudowanym dźwiękiem.
 */
let kolejka: Promise<unknown> = Promise.resolve();

/** Zdarzenie dla aplikacji: dźwięk powiadomień się zmienił, trzeba przeplanować przypomnienia. */
export const NATIVE_SOUND_CHANGED = 'kalendarz-dzwiek-powiadomien';

export function applyNativeReminderSound(wlasny: boolean, nowyPlik = false): Promise<boolean> {
  // Po kolei — inaczej planowanie mogłoby wziąć kanał, który za chwilę zostanie usunięty.
  const zadanie = kolejka.then(() => ustawDzwiek(wlasny, nowyPlik));
  kolejka = zadanie.catch(() => undefined);
  return zadanie;
}

async function ustawDzwiek(wlasny: boolean, nowyPlik: boolean): Promise<boolean> {
  if (!isNativePlatform()) return true;
  if (!wlasny) {
    uzyjWlasnego = false;
    if (zapisanyWlasnyKanal()) {
      try {
        localStorage.removeItem(WLASNY_KANAL_KEY);
      } catch {
        // bez znaczenia
      }
      await KalendarzSystem.usunWlasnyDzwiek().catch(() => undefined);
    }
    return true;
  }
  if (!nowyPlik && zapisanyWlasnyKanal()) {
    uzyjWlasnego = true;
    return true;
  }
  try {
    const dane = await customSoundAsWavBase64();
    if (!dane) throw new Error('Brak zapisanego pliku');
    const { kanal } = await KalendarzSystem.ustawWlasnyDzwiek({ dane, nazwa: customSoundName() ?? 'własny plik' });
    localStorage.setItem(WLASNY_KANAL_KEY, kanal);
    uzyjWlasnego = true;
    window.dispatchEvent(new Event(NATIVE_SOUND_CHANGED));
    return true;
  } catch {
    uzyjWlasnego = false;
    return false;
  }
}

/**
 * Otwiera systemowe ustawienia kanału przypomnień — tam użytkownik wybiera dźwięk
 * powiadomień (dzwonki, muzyka z telefonu). Kanał tworzymy najpierw, żeby było co otworzyć.
 */
export async function openNotificationSoundSettings(): Promise<boolean> {
  try {
    await ensureChannel();
    await KalendarzSystem.otworzUstawieniaDzwieku({ kanal: aktywnyKanal() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Próbne przypomnienie za kilka sekund — tym samym kanałem i dźwiękiem co prawdziwe.
 * Pozwala sprawdzić, czy telefon zadzwoni, bez ustawiania wydarzenia „na wyścigi”.
 */
export async function scheduleTestReminder(seconds = 10): Promise<boolean> {
  try {
    await kolejka; // poczekaj, aż kanał z własnym dźwiękiem będzie gotowy
    await ensureChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1_999_999_999,
          title: 'Próbne przypomnienie',
          body: 'Tak zabrzmi przypomnienie o wydarzeniu',
          channelId: aktywnyKanal(),
          sound: DZWIEK,
          smallIcon: 'ic_stat_kalendarz',
          schedule: { at: new Date(Date.now() + seconds * 1000), allowWhileIdle: true },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}
