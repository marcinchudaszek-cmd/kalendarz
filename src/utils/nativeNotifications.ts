import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ScheduledReminder } from './pwa';

/** Osobny kanał pozwala użytkownikowi sterować dźwiękiem przypomnień w ustawieniach Androida. */
const KANAL = 'przypomnienia';
/** Android ogranicza liczbę zaplanowanych alarmów — bierzemy tylko najbliższe. */
const MAX_ZAPLANOWANYCH = 64;

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
    });
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
        channelId: KANAL,
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
