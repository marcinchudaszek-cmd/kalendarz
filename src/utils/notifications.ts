import {
  isNativePlatform,
  checkNativePermission,
  requestNativePermission,
} from './nativeNotifications';

export type PermissionState = NotificationPermission | 'unsupported';

/**
 * Stan zgody na powiadomienia. W aplikacji Androida pyta wtyczkę systemową,
 * w przeglądarce — Notification API.
 */
export async function getNotificationPermission(): Promise<PermissionState> {
  if (isNativePlatform()) {
    const stan = await checkNativePermission();
    return stan === 'prompt' ? 'default' : stan;
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (isNativePlatform()) {
    const stan = await requestNativePermission();
    return stan === 'prompt' ? 'default' : stan;
  }
  if (!('Notification' in window)) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Powiadomienie „tu i teraz", gdy przypomnienie zadziała przy działającej aplikacji. */
export async function showSystemNotification(title: string, body: string): Promise<void> {
  // Na Androidzie powiadomienia są zaplanowane z wyprzedzeniem przez system,
  // więc pokazywanie drugiego w tym momencie tylko by je dublowało.
  if (isNativePlatform()) return;
  if ((await getNotificationPermission()) !== 'granted') return;

  // Service Worker pokazuje powiadomienie także wtedy, gdy karta nie jest aktywna.
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: 'POKAZ_PRZYPOMNIENIE',
        title,
        body,
        tag: `kalendarz-${title}`,
      });
      return;
    } catch {
      // Spadamy do zwykłego powiadomienia poniżej.
    }
  }

  try {
    new Notification(title, { body, tag: `kalendarz-${title}` });
  } catch {
    // Zostaje samo powiadomienie w aplikacji.
  }
}
