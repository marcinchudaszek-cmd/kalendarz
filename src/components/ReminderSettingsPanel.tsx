import React, { useEffect, useState } from 'react';
import { ReminderSettings, SoundId, REMINDER_OPTIONS } from '../types';
import {
  getNotificationPermission,
  requestNotificationPermission,
  PermissionState,
} from '../utils/notifications';
import { playReminderSound, SOUND_OPTIONS } from '../utils/sound';
import { scheduledNotificationsSupported } from '../utils/pwa';
import { isNativePlatform } from '../utils/nativeNotifications';
import { cn } from '../utils/cn';

interface ReminderSettingsPanelProps {
  settings: ReminderSettings;
  onChange: (settings: ReminderSettings) => void;
}

const PERMISSION_TEXT: Record<PermissionState, string> = {
  granted: 'Powiadomienia systemowe są włączone.',
  denied: 'Powiadomienia zablokowane w ustawieniach systemu.',
  default: 'Pozwól pokazywać przypomnienia poza aplikacją.',
  unsupported: 'To środowisko nie obsługuje powiadomień systemowych.',
};

export const ReminderSettingsPanel: React.FC<ReminderSettingsPanelProps> = ({ settings, onChange }) => {
  // Na Androidzie o stan zgody trzeba zapytać wtyczkę, więc odczyt jest asynchroniczny.
  const [permission, setPermission] = useState<PermissionState>('default');
  useEffect(() => {
    let aktualne = true;
    void getNotificationPermission().then((stan) => {
      if (aktualne) setPermission(stan);
    });
    return () => {
      aktualne = false;
    };
  }, []);

  const update = (patch: Partial<ReminderSettings>) => onChange({ ...settings, ...patch });

  const handleSoundChange = (sound: SoundId) => {
    update({ sound });
    // Wybór z listy jest interakcją użytkownika, więc dźwięk zagra od razu.
    playReminderSound(sound, settings.volume);
  };

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    update({ systemNotifications: result === 'granted' });
  };

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Przypomnienia
      </h3>

      {/* Dźwięk */}
      <label className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(e) => update({ soundEnabled: e.target.checked })}
          className="sr-only"
        />
        <div
          className={cn(
            'w-4 h-4 rounded flex items-center justify-center transition-colors border-2',
            settings.soundEnabled ? 'bg-blue-500 border-transparent' : 'border-gray-300 dark:border-gray-500'
          )}
        >
          {settings.soundEnabled && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className="text-sm text-gray-700 dark:text-gray-200">Dźwięk</span>
      </label>

      {settings.soundEnabled && (
        <div className="pl-2 pr-2 mt-2">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5" htmlFor="dzwiek-przypomnienia">
            Dźwięk przypomnienia
          </label>
          <select
            id="dzwiek-przypomnienia"
            value={settings.sound}
            onChange={(e) => handleSoundChange(e.target.value as SoundId)}
            className="w-full px-2 py-1.5 mb-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100"
          >
            {SOUND_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.volume * 100)}
              onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
              aria-label="Głośność przypomnień"
              className="flex-1 accent-blue-500"
            />
            <span className="text-xs text-gray-400 dark:text-gray-500 w-8 text-right tabular-nums">
              {Math.round(settings.volume * 100)}%
            </span>
          </div>
          <button
            type="button"
            onClick={() => playReminderSound(settings.sound, settings.volume)}
            className="mt-2 w-full px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors"
          >
            Odtwórz próbkę
          </button>
        </div>
      )}

      {/* Powiadomienia systemowe */}
      <div className="mt-4 px-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{PERMISSION_TEXT[permission]}</p>
        {permission === 'default' && (
          <button
            type="button"
            onClick={handleEnableNotifications}
            className="mt-2 w-full px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Włącz powiadomienia
          </button>
        )}
        {permission === 'granted' && (
          <>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.systemNotifications}
                onChange={(e) => update({ systemNotifications: e.target.checked })}
                className="w-3.5 h-3.5 accent-blue-500"
              />
              <span className="text-xs text-gray-600 dark:text-gray-300">Wysyłaj powiadomienia systemowe</span>
            </label>
            {settings.systemNotifications && isNativePlatform() && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">
                Android może poprosić o zgodę na „Alarmy i przypomnienia" — bez niej
                powiadomienia potrafią się spóźnić.
              </p>
            )}
            {settings.systemNotifications && !scheduledNotificationsSupported() && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">
                Tutaj pojawią się tylko przy uruchomionej aplikacji.
              </p>
            )}
          </>
        )}
      </div>

      {/* Domyślne przypomnienie */}
      <div className="mt-4 px-2">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5" htmlFor="domyslne-przypomnienie">
          Domyślnie dla nowych wydarzeń
        </label>
        <select
          id="domyslne-przypomnienie"
          value={settings.defaultMinutes === null ? '' : String(settings.defaultMinutes)}
          onChange={(e) => update({ defaultMinutes: e.target.value === '' ? null : Number(e.target.value) })}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100"
        >
          {REMINDER_OPTIONS.map((option) => (
            <option key={String(option.value)} value={option.value === null ? '' : String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
