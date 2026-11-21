import React from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { SPORT_OPTIONS, SportKey, SportSettings } from '../sport/sportStore';
import { cn } from '../utils/cn';

interface SportSettingsPanelProps {
  settings: SportSettings;
  onChange: (settings: SportSettings) => void;
  /** Stan pobierania terminarza. */
  loading: boolean;
  fetchedAt: number | null;
  count: number;
  error: string | null;
  onRefresh: () => void;
}

const REMINDER_CHOICES: { value: number | null; label: string }[] = [
  { value: null, label: 'Bez przypomnień' },
  { value: 15, label: '15 minut przed' },
  { value: 30, label: '30 minut przed' },
  { value: 60, label: '1 godzinę przed' },
  { value: 120, label: '2 godziny przed' },
];

function odmiana(n: number): string {
  if (n === 1) return 'wydarzenie';
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && !(t >= 12 && t <= 14) ? 'wydarzenia' : 'wydarzeń';
}

const Check: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({ checked, onChange, label }) => (
  <label className="relative flex items-center gap-2.5 py-1 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    <div
      className={cn(
        'w-4 h-4 flex-shrink-0 rounded flex items-center justify-center transition-colors border-2',
        checked ? 'bg-cyan-500 border-transparent' : 'border-gray-300 dark:border-gray-500'
      )}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
    <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
  </label>
);

export const SportSettingsPanel: React.FC<SportSettingsPanelProps> = ({
  settings,
  onChange,
  loading,
  fetchedAt,
  count,
  error,
  onRefresh,
}) => {
  const selected = new Set(settings.selected);
  const toggle = (key: SportKey) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange({ ...settings, selected: [...next] });
  };

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Sport</h3>
      <p className="px-2 mb-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        Terminarze z internetu (Wikipedia, jolpica-f1). Aplikacja tylko je pobiera — nie wysyła żadnych Twoich danych.
      </p>

      {SPORT_OPTIONS.map((g) => (
        <div key={g.group} className="mb-1.5">
          <p className="px-2 pt-1 text-xs font-medium text-gray-600 dark:text-gray-300">{g.group}</p>
          {g.items.map((i) => (
            <Check key={i.key} checked={selected.has(i.key)} onChange={() => toggle(i.key)} label={i.label} />
          ))}
        </div>
      ))}

      {settings.selected.length > 0 && (
        <div className="px-2 mt-2">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5" htmlFor="sport-przypomnienie">
            Przypomnienie
          </label>
          <select
            id="sport-przypomnienie"
            value={settings.reminderMinutes === null ? '' : String(settings.reminderMinutes)}
            onChange={(e) => onChange({ ...settings, reminderMinutes: e.target.value === '' ? null : Number(e.target.value) })}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100"
          >
            {REMINDER_CHOICES.map((c) => (
              <option key={c.label} value={c.value === null ? '' : String(c.value)}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Zawody bez podanej godziny (skoki, biatlon, żużel) przypominają się dzień wcześniej o 20:00.
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
              {loading
                ? 'Pobieranie terminarza…'
                : fetchedAt
                  ? `${count} ${odmiana(count)} · ${format(fetchedAt, 'd MMM, HH:mm', { locale: pl })}`
                  : 'Jeszcze nie pobrano'}
            </p>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              Odśwież
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
};
