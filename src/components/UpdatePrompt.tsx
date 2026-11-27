import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  AppUpdate,
  AppUpdateAvailability,
  FlexibleUpdateInstallStatus,
} from '@capawesome/capacitor-app-update';
import { appVersion } from '../lib/appInfo';
import { pendingChangelog, markVersionSeen, type ChangelogEntry } from '../lib/changelog';

// „Później” chowa propozycję danej wersji na 2 dni.
const SNOOZE_KEY = 'kalendarz.aktualizacjaPozniej';
const SNOOZE_MS = 2 * 24 * 3600 * 1000;

function snoozed(code: string | undefined): boolean {
  try {
    const s = JSON.parse(localStorage.getItem(SNOOZE_KEY) || 'null') as { code?: string; until?: number } | null;
    return !!s && s.code === code && (s.until ?? 0) > Date.now();
  } catch { return false; }
}
function snooze(code: string | undefined) {
  try { localStorage.setItem(SNOOZE_KEY, JSON.stringify({ code, until: Date.now() + SNOOZE_MS })); } catch { /* bez pamięci */ }
}

const Ikona = ({ d, className = 'w-[18px] h-[18px]' }: { d: string; className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);
const POBIERZ = 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14';
const ODSWIEZ = 'M4 4v5h5M20 20v-5h-5M5.5 15a7 7 0 0012.4 2M18.5 9A7 7 0 006.1 7';
const ZAMKNIJ = 'M6 18L18 6M6 6l12 12';

type Offer = { state: 'available'; version?: string; code?: string; flexible: boolean }
  | { state: 'downloading'; percent: number | null }
  | { state: 'ready' };

/**
 * Aktualizacje z Google Play (In-App Updates) + okienko „Co nowego” po aktualizacji.
 * Sprawdza Play przy starcie i przy powrocie do aplikacji; działa tylko w instalacji ze Sklepu Play.
 */
export function UpdatePrompt() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [news, setNews] = useState<ChangelogEntry[]>(() => pendingChangelog(appVersion));

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let alive = true;

    const check = async () => {
      try {
        const info = await AppUpdate.getAppUpdateInfo();
        if (!alive) return;
        if (info.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
          setOffer({ state: 'ready' });
          return;
        }
        if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE && !snoozed(info.availableVersionCode)) {
          setOffer((cur) => cur ?? {
            state: 'available',
            version: info.availableVersionName,
            code: info.availableVersionCode,
            flexible: info.flexibleUpdateAllowed !== false,
          });
        }
      } catch { /* aplikacja spoza Sklepu Play albo brak sieci — po cichu */ }
    };

    const progress = AppUpdate.addListener('onFlexibleUpdateStateChange', (s) => {
      if (s.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) setOffer({ state: 'ready' });
      else if (s.installStatus === FlexibleUpdateInstallStatus.DOWNLOADING) {
        const pct = s.totalBytesToDownload ? Math.round(((s.bytesDownloaded ?? 0) / s.totalBytesToDownload) * 100) : null;
        setOffer({ state: 'downloading', percent: pct });
      } else if (s.installStatus === FlexibleUpdateInstallStatus.FAILED || s.installStatus === FlexibleUpdateInstallStatus.CANCELED) {
        setOffer(null);
      }
    });
    const resume = CapApp.addListener('resume', () => void check());
    const t = setTimeout(() => void check(), 2500); // po starcie, żeby nie spowalniać otwarcia

    return () => {
      alive = false;
      clearTimeout(t);
      void progress.then((h) => h.remove());
      void resume.then((h) => h.remove());
    };
  }, []);

  const startUpdate = async () => {
    if (offer?.state !== 'available') return;
    try {
      if (offer.flexible) {
        setOffer({ state: 'downloading', percent: null });
        await AppUpdate.startFlexibleUpdate();
      } else {
        setOffer(null);
        await AppUpdate.performImmediateUpdate();
      }
    } catch {
      setOffer(null);
      try { await AppUpdate.openAppStore(); } catch { /* brak Sklepu Play */ }
    }
  };

  const closeNews = () => {
    markVersionSeen(appVersion);
    setNews([]);
  };

  // Systemowy przycisk Wstecz zamyka okienko zamiast całej aplikacji
  const newsOpen = news.length > 0;
  useEffect(() => {
    if (!newsOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeNews(); };
    window.addEventListener('keydown', onKey);
    const h = Capacitor.isNativePlatform() ? CapApp.addListener('backButton', closeNews) : null;
    return () => {
      window.removeEventListener('keydown', onKey);
      void h?.then((x) => x.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsOpen]);

  return (
    <>
      {offer && (
        <div className="fixed left-3 right-3 bottom-[calc(1rem+var(--sa-bottom))] z-[45] max-w-lg mx-auto">
          <div className="flex items-center gap-3 rounded-2xl bg-gray-900/95 text-white shadow-xl px-4 py-3">
            <div className="w-9 h-9 shrink-0 rounded-full bg-blue-500 flex items-center justify-center">
              {offer.state === 'ready' ? <Ikona d={ODSWIEZ} /> : <Ikona d={POBIERZ} />}
            </div>
            <div className="flex-1 min-w-0 text-sm">
              {offer.state === 'available' && (
                <>
                  <div className="font-semibold">Dostępna nowa wersja{offer.version ? ` ${offer.version}` : ''}</div>
                  <div className="text-white/70 text-xs">Zaktualizuj, żeby mieć nowości i poprawki</div>
                </>
              )}
              {offer.state === 'downloading' && (
                <>
                  <div className="font-semibold">Pobieranie aktualizacji{offer.percent !== null ? ` — ${offer.percent}%` : '…'}</div>
                  <div className="text-white/70 text-xs">Możesz dalej korzystać z aplikacji</div>
                </>
              )}
              {offer.state === 'ready' && (
                <>
                  <div className="font-semibold">Aktualizacja pobrana</div>
                  <div className="text-white/70 text-xs">Uruchom ponownie, żeby ją zainstalować</div>
                </>
              )}
            </div>
            {offer.state === 'available' && (
              <>
                <button onClick={() => void startUpdate()} className="shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 px-3 py-1.5 text-sm font-semibold">
                  Aktualizuj
                </button>
                <button
                  onClick={() => { snooze(offer.code); setOffer(null); }}
                  className="shrink-0 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"
                  aria-label="Później"
                >
                  <Ikona d={ZAMKNIJ} className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {offer.state === 'ready' && (
              <button onClick={() => void AppUpdate.completeFlexibleUpdate()} className="shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 px-3 py-1.5 text-sm font-semibold">
                Uruchom ponownie
              </button>
            )}
          </div>
        </div>
      )}

      {newsOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-3" onClick={closeNews}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="whats-new-title"
            className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-800 p-5 shadow-2xl max-h-[80dvh] overflow-y-auto mb-[var(--sa-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <span className="text-xl" aria-hidden="true">✨</span>
              </div>
              <div>
                <h2 id="whats-new-title" className="text-lg font-bold text-gray-900 dark:text-white">Co nowego w Kalendarzu</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Wersja {appVersion}</p>
              </div>
            </div>
            {news.map((e) => (
              <div key={e.version} className="mb-4 last:mb-2">
                {news.length > 1 && (
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1.5">Wersja {e.version}</div>
                )}
                <ul className="space-y-1.5">
                  {e.items.map((it) => (
                    <li key={it} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button onClick={closeNews} className="mt-3 w-full rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 transition-colors">
              Super, dzięki!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
