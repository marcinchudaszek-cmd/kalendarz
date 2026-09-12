import React, { useState, useEffect } from 'react';
import {
  CalendarEvent,
  Category,
  Recurrence,
  RecurrenceFreq,
  REMINDER_OPTIONS,
  RECURRENCE_OPTIONS,
  WEEKDAY_OPTIONS,
} from '../types';
import { format, addDays, differenceInCalendarDays, parseDayInput } from '../calendarUtils';
import { cn } from '../utils/cn';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id'>) => void;
  onDelete?: () => void;
  categories: Category[];
  initialData?: Partial<CalendarEvent>;
  editing?: boolean;
  defaultReminderMinutes?: number | null;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  categories,
  initialData,
  editing,
  defaultReminderMinutes = null,
}) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [categoryId, setCategoryId] = useState('work');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFreq | null>(null);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setLocation(initialData.location || '');
      setCategoryId(initialData.categoryId || categories[0]?.id || '');
      setAllDay(initialData.allDay || false);
      // Przy edycji zachowujemy wybór z wydarzenia, także świadomy brak przypomnienia.
      setReminderMinutes(
        initialData.reminderMinutes !== undefined ? initialData.reminderMinutes : defaultReminderMinutes
      );
      setRecurrenceFreq(initialData.recurrence?.freq ?? null);
      setRecurrenceInterval(initialData.recurrence?.interval ?? 1);
      setRecurrenceUntil(
        initialData.recurrence?.until ? format(initialData.recurrence.until, 'yyyy-MM-dd') : ''
      );
      setRecurrenceWeekdays(initialData.recurrence?.weekdays ?? []);
      if (initialData.start) {
        setStartDate(format(initialData.start, 'yyyy-MM-dd'));
        setStartTime(format(initialData.start, 'HH:mm'));
      }
      if (initialData.end) {
        setEndDate(format(initialData.end, 'yyyy-MM-dd'));
        setEndTime(format(initialData.end, 'HH:mm'));
      }
    } else {
      const now = new Date();
      setTitle('');
      setDescription('');
      setLocation('');
      setCategoryId(categories[0]?.id ?? '');
      setAllDay(false);
      setReminderMinutes(defaultReminderMinutes);
      setRecurrenceFreq(null);
      setRecurrenceInterval(1);
      setRecurrenceUntil('');
      setRecurrenceWeekdays([]);
      setStartDate(format(now, 'yyyy-MM-dd'));
      setStartTime('09:00');
      setEndDate(format(now, 'yyyy-MM-dd'));
      setEndTime('10:00');
    }
  }, [initialData, isOpen, defaultReminderMinutes, categories]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(`${endDate}T${endTime}:00`);

    const recurrence: Recurrence | null = recurrenceFreq
      ? {
          freq: recurrenceFreq,
          interval: Math.max(1, recurrenceInterval),
          until: recurrenceUntil ? new Date(`${recurrenceUntil}T23:59:59`) : null,
          ...(recurrenceFreq === 'weekly' && recurrenceWeekdays.length > 0
            ? { weekdays: [...recurrenceWeekdays].sort((a, b) => a - b) }
            : {}),
        }
      : null;

    onSave({
      title: title.trim(),
      start,
      end,
      categoryId,
      description,
      location: location.trim(),
      allDay,
      reminderMinutes,
      recurrence,
    });
  };

  const selectedCat = categories.find((c) => c.id === categoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in">
        {/* Colored top bar */}
        <div className={cn('h-2', selectedCat?.color || 'bg-blue-500')} />

        <form onSubmit={handleSubmit} className="p-6">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dodaj tytuł"
            className="w-full text-xl font-medium text-gray-800 dark:text-gray-100 bg-transparent placeholder-gray-400 dark:placeholder-gray-500 border-0 border-b-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 outline-none pb-2 mb-5 transition-colors"
            autoFocus
          />

          {/* Date/Time */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    // Przesunięcie początku przesuwa też koniec, żeby przypadkiem
                    // nie zrobić z jednodniowego wydarzenia kilkudniowego.
                    if (nextStart && startDate && endDate) {
                      const shift = differenceInCalendarDays(
                        parseDayInput(nextStart),
                        parseDayInput(startDate)
                      );
                      if (shift !== 0) {
                        setEndDate(format(addDays(parseDayInput(endDate), shift), 'yyyy-MM-dd'));
                      }
                    } else if (!endDate || nextStart > endDate) {
                      setEndDate(nextStart);
                    }
                    setStartDate(nextStart);
                  }}
                  className="px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg focus:border-blue-500 outline-none"
                />
                {!allDay && (
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg focus:border-blue-500 outline-none"
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5" />
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg focus:border-blue-500 outline-none"
                />
                {!allDay && (
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg focus:border-blue-500 outline-none"
                  />
                )}
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="w-5" />
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">Cały dzień</span>
            </label>
          </div>

          {/* Category */}
          <div className="flex items-center gap-3 mb-5">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-full border-2 transition-all',
                    categoryId === cat.id
                      ? `${cat.color} text-white border-transparent scale-105`
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Przypomnienie */}
          <div className="flex items-center gap-3 mb-5">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a24 24 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24 24 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            <select
              value={reminderMinutes === null ? '' : String(reminderMinutes)}
              onChange={(e) => setReminderMinutes(e.target.value === '' ? null : Number(e.target.value))}
              aria-label="Przypomnienie"
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-blue-500 outline-none bg-white text-gray-700"
            >
              {REMINDER_OPTIONS.map((option) => (
                <option key={String(option.value)} value={option.value === null ? '' : String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Miejsce */}
          <div className="flex items-center gap-3 mb-5">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Miejsce lub link do spotkania"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:border-blue-500 outline-none"
            />
          </div>

          {/* Powtarzanie */}
          <div className="flex items-start gap-3 mb-5">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992V4.356m-.981 9.66a8.25 8.25 0 01-13.803 3.7L3 14.7m0 0h4.992m-4.993 0v4.992m0-9.66a8.25 8.25 0 0113.803-3.7L21 9.3m0 0V4.308m0 4.992h-4.992"
              />
            </svg>
            <div className="flex-1 space-y-2">
              <select
                value={recurrenceFreq ?? ''}
                onChange={(e) => setRecurrenceFreq((e.target.value || null) as RecurrenceFreq | null)}
                aria-label="Powtarzanie"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100"
              >
                {RECURRENCE_OPTIONS.map((option) => (
                  <option key={String(option.value)} value={option.value ?? ''}>
                    {option.label}
                  </option>
                ))}
              </select>

              {recurrenceFreq === 'weekly' && (
                <div className="flex flex-wrap gap-1">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const selected = recurrenceWeekdays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        aria-pressed={selected}
                        aria-label={day.name}
                        onClick={() =>
                          setRecurrenceWeekdays((prev) =>
                            prev.includes(day.value)
                              ? prev.filter((d) => d !== day.value)
                              : [...prev, day.value]
                          )
                        }
                        className={cn(
                          'px-2 py-1 text-xs font-medium rounded-md border transition-colors',
                          selected
                            ? 'bg-blue-500 border-transparent text-white'
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                        )}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
              )}

              {recurrenceFreq === 'weekly' && recurrenceWeekdays.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Bez wyboru dni powtarza się w dniu tygodnia z daty rozpoczęcia.
                </p>
              )}

              {recurrenceFreq && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span>co</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                    aria-label="Co ile powtarzać"
                    className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                  />
                  <span>do</span>
                  <input
                    type="date"
                    value={recurrenceUntil}
                    onChange={(e) => setRecurrenceUntil(e.target.value)}
                    aria-label="Powtarzaj do dnia"
                    className="px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg focus:border-blue-500 outline-none"
                  />
                  {recurrenceUntil && (
                    <button
                      type="button"
                      onClick={() => setRecurrenceUntil('')}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      bez końca
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {editing && initialData?.recurrence && (
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-4 pl-8">
              Zmiany obejmą całą serię powtórzeń.
            </p>
          )}

          {/* Description */}
          <div className="flex items-start gap-3 mb-6">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dodaj opis"
              rows={2}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <div>
              {editing && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 rounded-lg transition-colors"
                >
                  Usuń
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm"
              >
                {editing ? 'Zapisz' : 'Utwórz'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
