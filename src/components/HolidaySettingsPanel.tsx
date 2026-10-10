import React from 'react';
import { GERMAN_STATES, GermanState, HolidaySettings } from '../holidays';
import { cn } from '../utils/cn';

interface HolidaySettingsPanelProps {
  settings: HolidaySettings;
  onChange: (settings: HolidaySettings) => void;
}

const Toggle: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <label className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    <div
      className={cn(
        'w-4 h-4 rounded flex items-center justify-center transition-colors border-2',
        checked ? 'bg-red-500 border-transparent' : 'border-gray-300 dark:border-gray-500'
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

export const HolidaySettingsPanel: React.FC<HolidaySettingsPanelProps> = ({ settings, onChange }) => {
  const update = (patch: Partial<HolidaySettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Święta i dni wolne
      </h3>

      <Toggle checked={settings.pl} onChange={() => update({ pl: !settings.pl })} label="Polska" />
      <Toggle checked={settings.de} onChange={() => update({ de: !settings.de })} label="Niemcy" />

      {settings.de && (
        <div className="pl-2 pr-2 mt-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5" htmlFor="kraj-zwiazkowy">
            Święta regionalne (kraj związkowy)
          </label>
          <select
            id="kraj-zwiazkowy"
            value={settings.deState ?? ''}
            onChange={(e) => update({ deState: (e.target.value || null) as GermanState | null })}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100"
          >
            <option value="">Tylko ogólnoniemieckie</option>
            {GERMAN_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
