import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ViewMode, CalendarEvent, Category, ReminderSettings } from './types';
import { generateSampleEvents, generateId } from './data';
import {
  DEFAULT_CATEGORIES,
  hydrateCategories,
  dehydrateCategories,
} from './categoryColors';
import {
  loadEvents,
  saveEvents,
  loadSettings,
  saveSettings,
  loadCategories,
  saveCategories,
} from './storage';
import { useReminders } from './hooks/useReminders';
import { playReminderSound, unlockAudioOnFirstGesture } from './utils/sound';
import { showSystemNotification } from './utils/notifications';
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  shiftByView,
  getViewRange,
} from './calendarUtils';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTheme } from './hooks/useTheme';
import { useUndoHistory, Snapshot } from './hooks/useUndoHistory';
import { expandEvents } from './recurrenceUtils';
import { cn } from './utils/cn';
import { reminderFireTime } from './reminderUtils';
import { scheduleReminderNotifications } from './utils/pwa';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { DayView } from './components/DayView';
import { AgendaView } from './components/AgendaView';
import { EventModal } from './components/EventModal';
import { EventPopover } from './components/EventPopover';
import { EmptyState } from './components/EmptyState';
import { ReminderToast } from './components/ReminderToast';
import { CategoryManager } from './components/CategoryManager';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Siedem kolumn na telefonie zostawia na tytuł kilka znaków, więc tam zaczynamy od dnia.
  const [view, setView] = useState<ViewMode>(() => (window.innerWidth < 640 ? 'day' : 'week'));
  // Po instalacji kalendarz jest pusty — wypełnianie go zmyślonymi wydarzeniami
  // wyglądałoby jak cudze dane. Przykłady użytkownik wczytuje sam, gdy zechce.
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents() ?? []);
  const [categories, setCategories] = useState<Category[]>(() =>
    hydrateCategories(loadCategories() ?? DEFAULT_CATEGORIES)
  );
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.id))
  );
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(() => loadSettings());
  const [theme, setTheme] = useTheme();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [modalInitial, setModalInitial] = useState<Partial<CalendarEvent> | undefined>();

  // Popover state
  const [popoverEvent, setPopoverEvent] = useState<CalendarEvent | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });

  // Na wąskim ekranie panel boczny nachodzi na kalendarz, więc startuje zamknięty.
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

  // Aktywne przypomnienia widoczne na ekranie
  const [activeReminders, setActiveReminders] = useState<CalendarEvent[]>([]);

  /**
   * Serie rozwijamy na konkretne wystąpienia. Zakres pokrywa i to, co widać na ekranie,
   * i najbliższe tygodnie, żeby przypomnienia miały o czym przypominać.
   */
  const expandedEvents = useMemo(() => {
    const now = new Date();
    const viewStart = startOfDay(subDays(currentDate, 45));
    const viewEnd = endOfDay(addDays(currentDate, 45));
    const rangeStart = viewStart < subDays(now, 1) ? viewStart : startOfDay(subDays(now, 1));
    const rangeEnd = viewEnd > addDays(now, 60) ? viewEnd : endOfDay(addDays(now, 60));
    return expandEvents(events, rangeStart, rangeEnd);
  }, [events, currentDate]);

  const eventsRef = useRef(events);
  eventsRef.current = events;

  const applySnapshot = useCallback((snapshot: Partial<Snapshot>) => {
    if (snapshot.events) setEvents(snapshot.events);
    if (snapshot.categories) setCategories(snapshot.categories);
  }, []);

  const { commit, undo, canUndo, undoLabel } = useUndoHistory({ events, categories }, applySnapshot);

  /** Skrót do najczęstszego przypadku: zmiana samych wydarzeń, liczona z bieżącego stanu. */
  const commitEvents = useCallback(
    (label: string, updater: (prev: CalendarEvent[]) => CalendarEvent[]) => {
      commit(label, { events: updater(eventsRef.current) });
    },
    [commit]
  );

  useEffect(() => saveEvents(events), [events]);
  useEffect(() => saveCategories(dehydrateCategories(categories)), [categories]);

  // Nowo dodana kategoria ma być od razu widoczna w kalendarzu.
  useEffect(() => {
    setVisibleCategories((prev) => {
      const missing = categories.filter((c) => !prev.has(c.id));
      if (missing.length === 0) return prev;
      const next = new Set(prev);
      missing.forEach((c) => next.add(c.id));
      return next;
    });
  }, [categories]);
  useEffect(() => saveSettings(reminderSettings), [reminderSettings]);
  useEffect(() => unlockAudioOnFirstGesture(), []);

  // Dzwonek i powiadomienia czytają ustawienia w chwili zadziałania, nie z domknięcia sprzed godziny.
  const settingsRef = useRef(reminderSettings);
  settingsRef.current = reminderSettings;

  const handleReminderFire = useCallback((event: CalendarEvent) => {
    setActiveReminders((prev) => (prev.some((e) => e.id === event.id) ? prev : [...prev, event]));

    const settings = settingsRef.current;
    if (settings.soundEnabled) playReminderSound(settings.sound, settings.volume);
    if (settings.systemNotifications) {
      const when = event.allDay ? 'Całodniowe' : format(event.start, 'HH:mm');
      showSystemNotification(event.title, `${when} · ${event.description || 'Zbliża się wydarzenie'}`);
    }
  }, []);

  const { snooze, clearFired } = useReminders(expandedEvents, handleReminderFire);

  /**
   * Przekazujemy nadchodzące przypomnienia Service Workerowi. Tam, gdzie przeglądarka
   * to wspiera, pokaże je nawet przy zamkniętej aplikacji.
   */
  useEffect(() => {
    if (!reminderSettings.systemNotifications) return;

    const now = Date.now();
    const horizon = now + 30 * 24 * 60 * 60 * 1000;
    const items = expandedEvents
      .map((event) => ({ event, fireAt: reminderFireTime(event) }))
      .filter((x): x is { event: CalendarEvent; fireAt: Date } => x.fireAt !== null)
      .map(({ event, fireAt }) => ({
        id: event.id,
        title: event.title,
        body: `${event.allDay ? 'Całodniowe' : format(event.start, 'HH:mm')} · ${
          event.description || 'Zbliża się wydarzenie'
        }`,
        timestamp: fireAt.getTime(),
      }))
      .filter((item) => item.timestamp > now && item.timestamp < horizon)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 50);

    void scheduleReminderNotifications(items);
  }, [expandedEvents, reminderSettings.systemNotifications]);

  const dismissReminder = useCallback((eventId: string) => {
    setActiveReminders((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const snoozeReminder = useCallback(
    (eventId: string) => {
      snooze(eventId, 5);
      dismissReminder(eventId);
    },
    [snooze, dismissReminder]
  );

  const toggleCategory = useCallback((id: string) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Event handlers
  const handleEventClick = useCallback((event: CalendarEvent, position: { x: number; y: number }) => {
    setPopoverEvent(event);
    setPopoverPos(position);
  }, []);

  const handleCreateFromDrag = useCallback((start: Date, end: Date) => {
    setEditingEvent(null);
    setModalInitial({ start, end, categoryId: 'work' });
    setModalOpen(true);
  }, []);

  const handleDayClick = useCallback((day: Date) => {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(day);
    end.setHours(10, 0, 0, 0);
    setEditingEvent(null);
    setModalInitial({ start, end, categoryId: 'work' });
    setModalOpen(true);
  }, []);

  const handleCreateButton = useCallback(() => {
    setEditingEvent(null);
    setModalInitial(undefined);
    setModalOpen(true);
  }, []);

  /** Wystąpienie serii wskazuje na wydarzenie źródłowe — to jego edytujemy. */
  const resolveMaster = useCallback(
    (event: CalendarEvent): CalendarEvent =>
      event.seriesId ? events.find((e) => e.id === event.seriesId) ?? event : event,
    [events]
  );

  const openEventForEditing = useCallback(
    (event: CalendarEvent) => {
      const master = resolveMaster(event);
      setEditingEvent(master);
      setModalInitial(master);
      setModalOpen(true);
      setPopoverEvent(null);
    },
    [resolveMaster]
  );

  const handleSaveEvent = useCallback(
    (eventData: Omit<CalendarEvent, 'id'>) => {
      if (editingEvent) {
        // Rozpisujemy na istniejący wpis, żeby nie zgubić listy usuniętych wystąpień.
        commitEvents('Zmianę wydarzenia', (prev) =>
          prev.map((e) => (e.id === editingEvent.id ? { ...e, ...eventData } : e))
        );
        // Zmieniona godzina lub przypomnienie ma zadziałać ponownie.
        clearFired(editingEvent.id);
        dismissReminder(editingEvent.id);
      } else {
        const newEvent: CalendarEvent = { ...eventData, id: generateId() };
        commitEvents('Dodanie wydarzenia', (prev) => [...prev, newEvent]);
      }
      setModalOpen(false);
      setEditingEvent(null);
    },
    [editingEvent, clearFired, dismissReminder, commitEvents]
  );

  /**
   * Zapisuje wydarzenie przesunięte lub rozciągnięte myszą.
   * Przy serii przesuwamy wydarzenie źródłowe o tę samą różnicę, więc zmiana obejmuje wszystkie powtórzenia.
   */
  const handleEventChange = useCallback(
    (event: CalendarEvent, start: Date, end: Date) => {
      const masterId = event.seriesId ?? event.id;
      const deltaStart = start.getTime() - event.start.getTime();
      const deltaEnd = end.getTime() - event.end.getTime();
      if (deltaStart === 0 && deltaEnd === 0) return;

      commitEvents('Przesunięcie wydarzenia', (prev) =>
        prev.map((e) =>
          e.id === masterId
            ? {
                ...e,
                start: new Date(e.start.getTime() + deltaStart),
                end: new Date(e.end.getTime() + deltaEnd),
              }
            : e
        )
      );
      clearFired(event.id);
      dismissReminder(event.id);
    },
    [clearFired, dismissReminder, commitEvents]
  );

  const handleDeleteEvent = useCallback(
    (id: string) => {
      commitEvents('Usunięcie wydarzenia', (prev) => prev.filter((e) => e.id !== id));
      setModalOpen(false);
      setEditingEvent(null);
      setPopoverEvent(null);
      dismissReminder(id);
    },
    [dismissReminder, commitEvents]
  );

  /** Usuwa pojedyncze wystąpienie serii, zostawiając resztę powtórzeń. */
  const deleteOccurrence = useCallback(
    (event: CalendarEvent) => {
      if (!event.seriesId || !event.occurrenceDate) {
        handleDeleteEvent(event.id);
        return;
      }
      const { seriesId, occurrenceDate } = event;
      commitEvents('Usunięcie wystąpienia', (prev) =>
        prev.map((e) =>
          e.id === seriesId ? { ...e, exceptions: [...(e.exceptions ?? []), occurrenceDate] } : e
        )
      );
      setPopoverEvent(null);
      dismissReminder(event.id);
    },
    [handleDeleteEvent, dismissReminder, commitEvents]
  );

  const deleteSeries = useCallback(
    (event: CalendarEvent) => {
      const masterId = event.seriesId ?? event.id;
      commitEvents('Usunięcie serii', (prev) => prev.filter((e) => e.id !== masterId));
      setPopoverEvent(null);
      dismissReminder(event.id);
    },
    [dismissReminder, commitEvents]
  );

  const handleEditFromPopover = useCallback(() => {
    if (!popoverEvent) return;
    openEventForEditing(popoverEvent);
  }, [popoverEvent, openEventForEditing]);

  const handleSaveCategories = useCallback(
    (next: Category[]) => {
      const fallback = next[0]?.id;
      const alive = new Set(next.map((c) => c.id));
      // Wydarzenia po usuniętej kategorii muszą gdzieś trafić, inaczej zniknęłyby z widoku.
      const movedEvents = fallback
        ? eventsRef.current.map((e) => (alive.has(e.categoryId) ? e : { ...e, categoryId: fallback }))
        : eventsRef.current;

      commit('Zmianę kategorii', { categories: next, events: movedEvents });
    },
    [commit]
  );

  const countEventsInCategory = useCallback(
    (categoryId: string) => events.filter((e) => e.categoryId === categoryId).length,
    [events]
  );

  const handleImport = useCallback(
    (imported: CalendarEvent[]) => {
      commitEvents('Import wydarzeń', (prev) => [...prev, ...imported]);
    },
    [commitEvents]
  );

  const handleLoadSamples = useCallback(() => {
    commitEvents('Wczytanie przykładów', (prev) => (prev.length > 0 ? prev : generateSampleEvents()));
    setCurrentDate(new Date());
  }, [commitEvents]);

  const summaryRange = useMemo(() => getViewRange(currentDate, view), [currentDate, view]);
  const summaryLabel = useMemo(
    () =>
      view === 'day'
        ? format(summaryRange.start, 'EEEE, d MMMM yyyy')
        : `${format(summaryRange.start, 'd MMM')} – ${format(summaryRange.end, 'd MMM yyyy')}`,
    [summaryRange, view]
  );

  // Rośnie przy naciśnięciu „/", żeby wyszukiwarka przejęła kursor.
  const [searchFocusSignal, setSearchFocusSignal] = useState(0);

  const handleSearchSelect = useCallback((event: CalendarEvent) => {
    setCurrentDate(event.start);
    setView('day');
  }, []);

  const shortcutHandlers = useMemo(
    () => ({
      onView: setView,
      onPrev: () => setCurrentDate((d) => shiftByView(d, view, -1)),
      onNext: () => setCurrentDate((d) => shiftByView(d, view, 1)),
      onToday: () => setCurrentDate(new Date()),
      onCreate: handleCreateButton,
      onSearch: () => setSearchFocusSignal((n) => n + 1),
      onUndo: undo,
    }),
    [view, handleCreateButton, undo]
  );

  // Przy otwartym oknie edycji skróty tylko przeszkadzałyby.
  useKeyboardShortcuts(shortcutHandlers, !modalOpen);

  const popoverCategory = useMemo(
    () => (popoverEvent ? categories.find((c) => c.id === popoverEvent.categoryId) : null),
    [popoverEvent, categories]
  );

  return (
    <div className="app-shell flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <Header
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        view={view}
        setView={setView}
        events={events}
        categories={categories}
        onSearchSelect={handleSearchSelect}
        searchFocusSignal={searchFocusSignal}
        canUndo={canUndo}
        undoLabel={undoLabel}
        onUndo={undo}
      />

      {/* relative — panel boczny pozycjonuje się względem obszaru treści */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar toggle for mobile */}
        {/* Przy otwartym panelu chowamy przycisk, bo leżał na jego zawartości. */}
        <button
          data-print-hide
          onClick={() => setSidebarOpen(true)}
          aria-label="Pokaż panel boczny"
          className={cn(
            'fixed bottom-4 left-4 z-40 lg:hidden w-12 h-12 bg-blue-500 text-white rounded-full shadow-lg items-center justify-center hover:bg-blue-600 transition-colors',
            sidebarOpen ? 'hidden' : 'flex'
          )}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar */}
        <div data-print-hide className={cn('sidebar-panel', sidebarOpen && 'is-open')}>
          <Sidebar
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            categories={categories}
            visibleCategories={visibleCategories}
            toggleCategory={toggleCategory}
            onCreateEvent={handleCreateButton}
            onClose={() => setSidebarOpen(false)}
            onManageCategories={() => setCategoryManagerOpen(true)}
            reminderSettings={reminderSettings}
            onReminderSettingsChange={setReminderSettings}
            events={events}
            theme={theme}
            onThemeChange={setTheme}
            onImport={handleImport}
            makeId={generateId}
            summaryEvents={expandedEvents.filter((e) => visibleCategories.has(e.categoryId))}
            summaryRange={summaryRange}
            summaryLabel={summaryLabel}
          />
        </div>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main calendar view */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900 relative">
          {events.length === 0 && (
            <EmptyState onCreate={handleCreateButton} onLoadSamples={handleLoadSamples} />
          )}
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={expandedEvents}
              categories={categories}
              visibleCategories={visibleCategories}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
              setView={setView}
              setCurrentDate={setCurrentDate}
            />
          )}
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={expandedEvents}
              categories={categories}
              visibleCategories={visibleCategories}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateFromDrag}
              onEventChange={handleEventChange}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={expandedEvents}
              categories={categories}
              visibleCategories={visibleCategories}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateFromDrag}
              onEventChange={handleEventChange}
            />
          )}
          {view === 'agenda' && (
            <AgendaView
              currentDate={currentDate}
              events={expandedEvents}
              categories={categories}
              visibleCategories={visibleCategories}
              onEventClick={handleEventClick}
            />
          )}
        </main>
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        onDelete={editingEvent ? () => handleDeleteEvent(editingEvent.id) : undefined}
        categories={categories}
        initialData={modalInitial}
        editing={!!editingEvent}
        defaultReminderMinutes={reminderSettings.defaultMinutes}
      />

      {/* Event Popover */}
      {popoverEvent && popoverCategory && (
        <EventPopover
          event={popoverEvent}
          category={popoverCategory}
          position={popoverPos}
          onClose={() => setPopoverEvent(null)}
          onEdit={handleEditFromPopover}
          onDelete={() => deleteOccurrence(popoverEvent)}
          onDeleteSeries={popoverEvent.seriesId ? () => deleteSeries(popoverEvent) : undefined}
        />
      )}

      {/* Kategorie */}
      <CategoryManager
        isOpen={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        categories={categories}
        onSave={handleSaveCategories}
        usageCount={countEventsInCategory}
        makeId={generateId}
      />

      {/* Przypomnienia */}
      <ReminderToast
        reminders={activeReminders}
        categories={categories}
        onDismiss={dismissReminder}
        onSnooze={snoozeReminder}
        onOpen={openEventForEditing}
      />
    </div>
  );
}

export default App;
