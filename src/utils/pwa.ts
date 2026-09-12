import { isNativePlatform, scheduleNativeReminders } from './nativeNotifications';

export interface ScheduledReminder {
  id: string;
  title: string;
  body: string;
  /** Moment pokazania powiadomienia (ms od epoki). */
  timestamp: number;
}

export function serviceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Czy przeglądarka potrafi pokazać powiadomienie zaplanowane z wyprzedzeniem,
 * także gdy aplikacja nie jest otwarta.
 */
export function scheduledNotificationsSupported(): boolean {
  // W aplikacji natywnej planuje je Android, w przeglądarce potrzebny jest TimestampTrigger.
  if (isNativePlatform()) return true;
  return 'Notification' in window && 'showTrigger' in Notification.prototype;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!serviceWorkerSupported()) return null;
  try {
    return await navigator.serviceWorker.register('./sw.js');
  } catch {
    return null;
  }
}

export async function scheduleReminderNotifications(items: ScheduledReminder[]): Promise<void> {
  // W aplikacji Androida planowaniem zajmuje się system, nie Service Worker.
  if (isNativePlatform()) {
    await scheduleNativeReminders(items);
    return;
  }

  if (!serviceWorkerSupported() || !scheduledNotificationsSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: 'ZAPLANUJ_PRZYPOMNIENIA', items });
  } catch {
    // Brak Service Workera — zostają przypomnienia w otwartej karcie.
  }
}
