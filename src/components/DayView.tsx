import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CalendarEvent, Category } from '../types';
import {
  isToday,
  format,
  getEventsForDay,
  getEventSegmentForDay,
  getEventTopAndHeight,
  addMinutes,
  DaySegment,
  HOURS,
  formatHour,
  getHours,
  getMinutes,
} from '../calendarUtils';
import { cn } from '../utils/cn';
import { eventActivationProps, EventActivate } from '../utils/eventActivation';

const HOUR_HEIGHT = 64;
const SNAP_MINUTES = 15;
/** Dopiero po takim ruchu myszy uznajemy, że to przeciąganie, a nie kliknięcie. */
const DRAG_THRESHOLD_PX = 4;
/** Przez tyle milisekund po przeciągnięciu ignorujemy aktywację kafelka. */
const CLICK_SUPPRESS_MS = 300;

interface DayItem {
  event: CalendarEvent;
  segment: DaySegment;
}

interface EventDragState {
  event: CalendarEvent;
  mode: 'move' | 'resize';
  originY: number;
  currentY: number;
  active: boolean;
}

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  categories: Category[];
  visibleCategories: Set<string>;
  onEventClick: EventActivate;
  onCreateEvent: (start: Date, end: Date) => void;
  onEventChange: (event: CalendarEvent, start: Date, end: Date) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  categories,
  visibleCategories,
  onEventClick,
  onCreateEvent,
  onEventChange,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    startY: number;
    currentY: number;
  } | null>(null);
  const dragRef = useRef(dragState);
  dragRef.current = dragState;

  const [eventDrag, setEventDrag] = useState<EventDragState | null>(null);
  const eventDragRef = useRef(eventDrag);
  eventDragRef.current = eventDrag;
  /** Po przeciągnięciu pochłaniamy kliknięcie; blokada wygasa sama, żeby nie zawiesić kafelka. */
  const dragEndedAtRef = useRef(0);

  const filteredEvents = events.filter((e) => visibleCategories.has(e.categoryId));
  const isTodayDay = isToday(currentDate);

  const getCategoryForEvent = (event: CalendarEvent) =>
    categories.find((c) => c.id === event.categoryId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
    }
  }, []);

  // Nagłówki nie przewijają się razem z siatką, więc muszą zarezerwować
  // tyle samo miejsca co pasek przewijania, inaczej kolumny się rozjeżdżają.
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  useEffect(() => {
    const measure = () => {
      const el = scrollRef.current;
      if (el) setScrollbarWidth(el.offsetWidth - el.clientWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getNowPosition = () => {
    const h = getHours(now);
    const m = getMinutes(now);
    return (h + m / 60) * HOUR_HEIGHT;
  };

  const yToTime = useCallback((y: number) => {
    const totalMinutes = (y / HOUR_HEIGHT) * 60;
    const snapped = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
    return Math.max(0, Math.min(snapped, 24 * 60 - SNAP_MINUTES));
  }, []);

  /** Nowe godziny przeciąganego wydarzenia — używane i do podglądu, i do zapisu. */
  const computeDraggedTimes = useCallback((state: EventDragState) => {
    const rawMinutes = ((state.currentY - state.originY) / HOUR_HEIGHT) * 60;
    const deltaMinutes = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;

    if (state.mode === 'resize') {
      const end = addMinutes(state.event.end, deltaMinutes);
      const minEnd = addMinutes(state.event.start, SNAP_MINUTES);
      return { start: state.event.start, end: end < minEnd ? minEnd : end };
    }

    const durationMs = state.event.end.getTime() - state.event.start.getTime();
    const start = addMinutes(state.event.start, deltaMinutes);
    return { start, end: new Date(start.getTime() + durationMs) };
  }, []);

  const handleEventMouseDown = useCallback(
    (event: CalendarEvent, mode: 'move' | 'resize', e: React.MouseEvent) => {
      e.stopPropagation();
      setEventDrag({ event, mode, originY: e.clientY, currentY: e.clientY, active: false });
    },
    []
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDragState({ startY: y, currentY: y });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const moving = eventDragRef.current;
    if (moving) {
      const passedThreshold = Math.abs(e.clientY - moving.originY) > DRAG_THRESHOLD_PX;
      setEventDrag({ ...moving, currentY: e.clientY, active: moving.active || passedThreshold });
      return;
    }

    if (!dragRef.current) return;
    const dayCol = document.querySelector('[data-day-col="main"]');
    if (!dayCol) return;
    const rect = dayCol.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDragState((prev) => (prev ? { ...prev, currentY: y } : null));
  }, []);

  const handleMouseUp = useCallback(() => {
    const moving = eventDragRef.current;
    if (moving) {
      if (moving.active) {
        const { start, end } = computeDraggedTimes(moving);
        onEventChange(moving.event, start, end);
        dragEndedAtRef.current = Date.now();
      }
      setEventDrag(null);
      return;
    }

    if (!dragRef.current) return;
    const { startY, currentY } = dragRef.current;
    const minY = Math.min(startY, currentY);
    const maxY = Math.max(startY, currentY);
    const startMin = yToTime(minY);
    const endMin = yToTime(maxY);

    if (endMin - startMin >= SNAP_MINUTES) {
      const start = new Date(currentDate);
      start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const end = new Date(currentDate);
      end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
      onCreateEvent(start, end);
    }
    setDragState(null);
  }, [onCreateEvent, onEventChange, yToTime, currentDate, computeDraggedTimes]);

  const handleEventActivate = useCallback<EventActivate>(
    (event, position) => {
      if (Date.now() - dragEndedAtRef.current < CLICK_SUPPRESS_MS) return;
      onEventClick(event, position);
    },
    [onEventClick]
  );

  // Podczas przeciągania podmieniamy wydarzenie na wersję z nowymi godzinami,
  // dzięki czemu podgląd przechodzi przez tę samą logikę układu co reszta.
  const previewTimes = eventDrag?.active ? computeDraggedTimes(eventDrag) : null;
  const eventsForRender = previewTimes
    ? filteredEvents.map((e) =>
        e.id === eventDrag!.event.id ? { ...e, start: previewTimes.start, end: previewTimes.end } : e
      )
    : filteredEvents;

  const eventsToday = getEventsForDay(eventsForRender, currentDate);
  const dayItems: DayItem[] = eventsToday
    .filter((e) => !e.allDay)
    .map((event) => ({ event, segment: getEventSegmentForDay(event, currentDate) }));
  const allDayEvents = eventsToday.filter((e) => e.allDay);

  // Compute overlapping positions
  const computeEventPositions = (items: DayItem[]) => {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => a.segment.start.getTime() - b.segment.start.getTime());
    const positions: { item: DayItem; column: number; totalColumns: number }[] = [];
    const columns: DayItem[][] = [];

    for (const item of sorted) {
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        const lastInCol = columns[col][columns[col].length - 1];
        if (lastInCol.segment.end <= item.segment.start) {
          columns[col].push(item);
          positions.push({ item, column: col, totalColumns: 0 });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([item]);
        positions.push({ item, column: columns.length - 1, totalColumns: 0 });
      }
    }
    positions.forEach((p) => {
      p.totalColumns = columns.length;
    });
    return positions;
  };

  const positioned = computeEventPositions(dayItems);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day header */}
      <div
        className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0"
        style={{ paddingRight: scrollbarWidth }}
      >
        <div className="w-16 flex-shrink-0" />
        <div className="flex-1 min-w-0 text-center py-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            {format(currentDate, 'EEEE')}
          </div>
          <div
            className={cn(
              'text-3xl font-light mt-0.5 inline-flex items-center justify-center w-12 h-12 rounded-full',
              isTodayDay ? 'bg-blue-500 text-white font-medium' : 'text-gray-800 dark:text-gray-100'
            )}
          >
            {format(currentDate, 'd')}
          </div>
        </div>
      </div>

      {/* All-day */}
      {allDayEvents.length > 0 && (
        <div
          className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0"
          style={{ paddingRight: scrollbarWidth }}
        >
          <div className="w-16 flex-shrink-0 flex items-center justify-end pr-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">cały dzień</span>
          </div>
          <div className="flex-1 min-w-0 p-1 flex flex-wrap gap-1">
            {allDayEvents.map((event) => {
              const cat = getCategoryForEvent(event);
              return (
                <div
                  key={event.id}
                  data-event
                  {...eventActivationProps(event, handleEventActivate)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400',
                    cat?.color,
                    'text-white hover:opacity-80 transition-opacity'
                  )}
                >
                  {event.title}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div
        ref={scrollRef}
        className={cn('flex-1 overflow-y-auto', eventDrag?.active && 'select-none')}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex relative" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full flex items-start justify-end pr-2"
                style={{ top: hour * HOUR_HEIGHT - 6 }}
              >
                {hour > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 leading-none">
                    {formatHour(hour)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Main column */}
          <div
            className="flex-1 min-w-0 relative border-l border-gray-100 dark:border-gray-700"
            data-day-col="main"
            onMouseDown={handleMouseDown}
          >
            {/* Hour lines */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-gray-100 dark:border-gray-700"
                style={{ top: hour * HOUR_HEIGHT }}
              >
                <div
                  className="absolute w-full border-t border-gray-50 dark:border-gray-700/50"
                  style={{ top: HOUR_HEIGHT / 2 }}
                />
              </div>
            ))}

            {/* Now indicator */}
            {isTodayDay && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: getNowPosition() }}
              >
                <div className="relative">
                  <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                  <div className="h-0.5 bg-red-500 w-full" />
                </div>
              </div>
            )}

            {/* Events */}
            {positioned.map(({ item, column, totalColumns }) => {
              const { event, segment } = item;
              const { top, height } = getEventTopAndHeight(segment, HOUR_HEIGHT);
              const cat = getCategoryForEvent(event);
              const width = `calc(${100 / totalColumns}% - 8px)`;
              const left = `calc(${(column * 100) / totalColumns}% + 4px)`;

              return (
                <div
                  key={event.id}
                  data-event
                  {...eventActivationProps(event, handleEventActivate)}
                  onMouseDown={(e) => handleEventMouseDown(event, 'move', e)}
                  className={cn(
                    'absolute rounded-lg px-3 py-1.5 cursor-move overflow-hidden border-l-3 transition-shadow hover:shadow-md z-10',
                    'focus:outline-none focus:ring-2 focus:ring-blue-400',
                    cat?.bgLight,
                    cat?.bgDark,
                    cat?.borderColor,
                    eventDrag?.active &&
                      eventDrag.event.id === event.id &&
                      'opacity-80 shadow-lg ring-2 ring-blue-400 z-30'
                  )}
                  style={{ top, height, width, left }}
                >
                  <div className={cn('text-sm font-semibold truncate', cat?.textColor, cat?.textDark)}>
                    {event.title}
                  </div>
                  {height > 44 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {segment.continuesBefore ? '…' : format(segment.start, 'HH:mm')} –{' '}
                      {segment.continuesAfter ? '…' : format(segment.end, 'HH:mm')}
                    </div>
                  )}
                  {height > 70 && event.description && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                      {event.description}
                    </div>
                  )}

                  {/* Uchwyt zmiany długości */}
                  {!segment.continuesAfter && (
                    <div
                      onMouseDown={(e) => handleEventMouseDown(event, 'resize', e)}
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"
                    />
                  )}
                </div>
              );
            })}

            {/* Drag preview */}
            {dragState && (
              <div
                className="absolute left-2 right-2 bg-blue-200/60 border border-blue-400 rounded-lg z-30 pointer-events-none"
                style={{
                  top: (yToTime(Math.min(dragState.startY, dragState.currentY)) / 60) * HOUR_HEIGHT,
                  height:
                    ((yToTime(Math.max(dragState.startY, dragState.currentY)) -
                      yToTime(Math.min(dragState.startY, dragState.currentY))) /
                      60) *
                    HOUR_HEIGHT,
                }}
              >
                <div className="px-2 py-1 text-xs text-blue-700 font-medium">
                  {(() => {
                    const startMin = yToTime(Math.min(dragState.startY, dragState.currentY));
                    const endMin = yToTime(Math.max(dragState.startY, dragState.currentY));
                    const fmt = (min: number) =>
                      `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
                    return `${fmt(startMin)} – ${fmt(endMin)}`;
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
