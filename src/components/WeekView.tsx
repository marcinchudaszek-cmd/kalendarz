import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { CalendarEvent, Category } from '../types';
import {
  getWeekDays,
  isToday,
  format,
  getEventsForDay,
  getEventSegmentForDay,
  getEventTopAndHeight,
  eventOccursOnDay,
  addDays,
  addMinutes,
  DaySegment,
  HOURS,
  formatHour,
  getHours,
  getMinutes,
} from '../calendarUtils';
import { cn } from '../utils/cn';
import { eventActivationProps, EventActivate } from '../utils/eventActivation';

const HOUR_HEIGHT = 60;
const SNAP_MINUTES = 15;
/** Dopiero po takim ruchu myszy uznajemy, że to przeciąganie, a nie kliknięcie. */
const DRAG_THRESHOLD_PX = 4;
const ALL_DAY_BAR_HEIGHT = 22;
/** Przez tyle milisekund po przeciągnięciu ignorujemy aktywację kafelka. */
const CLICK_SUPPRESS_MS = 300;

interface DayItem {
  event: CalendarEvent;
  segment: DaySegment;
}

interface EventDragState {
  event: CalendarEvent;
  mode: 'move' | 'resize';
  startDayIndex: number;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
  active: boolean;
}

interface AllDayDragState {
  event: CalendarEvent;
  startCol: number;
  originX: number;
  currentX: number;
  active: boolean;
}

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  categories: Category[];
  visibleCategories: Set<string>;
  onEventClick: EventActivate;
  onCreateEvent: (start: Date, end: Date) => void;
  onEventChange: (event: CalendarEvent, start: Date, end: Date) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
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
    dayIndex: number;
    startY: number;
    currentY: number;
    day: Date;
  } | null>(null);
  const dragRef = useRef(dragState);
  dragRef.current = dragState;

  const [eventDrag, setEventDrag] = useState<EventDragState | null>(null);
  const eventDragRef = useRef(eventDrag);
  eventDragRef.current = eventDrag;

  const [allDayDrag, setAllDayDrag] = useState<AllDayDragState | null>(null);
  const allDayDragRef = useRef(allDayDrag);
  allDayDragRef.current = allDayDrag;
  /**
   * Po przeciągnięciu przeglądarka wysyła jeszcze kliknięcie, które trzeba pochłonąć.
   * Zwykła flaga bywała nieskonsumowana (gdy mysz puszczono poza kafelkiem) i blokowała
   * następne otwarcie dymka — dlatego wygasa sama po chwili.
   */
  const dragEndedAtRef = useRef(0);

  const weekDays = getWeekDays(currentDate);
  const filteredEvents = events.filter((e) => visibleCategories.has(e.categoryId));

  const getCategoryForEvent = (event: CalendarEvent) =>
    categories.find((c) => c.id === event.categoryId);

  // Scroll to 7am on mount
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

  // Now indicator
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

  /** Kolumna dnia pod podanym punktem ekranu. */
  const targetColumn = useCallback((clientX: number) => {
    const first = document.querySelector('[data-day-col="0"]');
    if (!first) return 0;
    const rect = first.getBoundingClientRect();
    return Math.max(0, Math.min(6, Math.floor((clientX - rect.left) / rect.width)));
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

    const deltaDays = targetColumn(state.currentX) - state.startDayIndex;
    const durationMs = state.event.end.getTime() - state.event.start.getTime();
    const start = addMinutes(addDays(state.event.start, deltaDays), deltaMinutes);
    return { start, end: new Date(start.getTime() + durationMs) };
  }, [targetColumn]);

  const handleEventMouseDown = useCallback(
    (event: CalendarEvent, dayIndex: number, mode: 'move' | 'resize', e: React.MouseEvent) => {
      e.stopPropagation();
      setEventDrag({
        event,
        mode,
        startDayIndex: dayIndex,
        originX: e.clientX,
        originY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        active: false,
      });
    },
    []
  );

  const handleMouseDown = useCallback((dayIndex: number, day: Date, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDragState({ dayIndex, startY: y, currentY: y, day });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const moving = eventDragRef.current;
    if (moving) {
      const passedThreshold =
        Math.abs(e.clientX - moving.originX) > DRAG_THRESHOLD_PX ||
        Math.abs(e.clientY - moving.originY) > DRAG_THRESHOLD_PX;
      setEventDrag({
        ...moving,
        currentX: e.clientX,
        currentY: e.clientY,
        active: moving.active || passedThreshold,
      });
      return;
    }

    if (!dragRef.current) return;
    const dayCol = document.querySelector(`[data-day-col="${dragRef.current.dayIndex}"]`);
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
    const { startY, currentY, day } = dragRef.current;
    const minY = Math.min(startY, currentY);
    const maxY = Math.max(startY, currentY);
    const startMin = yToTime(minY);
    const endMin = yToTime(maxY);

    if (endMin - startMin >= SNAP_MINUTES) {
      const start = new Date(day);
      start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const end = new Date(day);
      end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
      onCreateEvent(start, end);
    }
    setDragState(null);
  }, [onCreateEvent, onEventChange, yToTime, computeDraggedTimes]);

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

  /**
   * Wydarzenia całodniowe rysujemy jako ciągłe paski przez kolejne dni.
   * Każdy pasek dostaje pierwszy wiersz, w którym nie zachodzi na inny.
   */
  const allDayLanes = useMemo(() => {
    const bars = eventsForRender
      .filter((e) => e.allDay && weekDays.some((day) => eventOccursOnDay(e, day)))
      .map((event) => {
        const days = weekDays.map((day) => eventOccursOnDay(event, day));
        return { event, startCol: days.indexOf(true), endCol: days.lastIndexOf(true) };
      })
      .sort((a, b) => a.startCol - b.startCol || b.endCol - a.endCol);

    const lanes: { event: CalendarEvent; startCol: number; endCol: number }[][] = [];
    for (const bar of bars) {
      const lane = lanes.find((l) => l.every((b) => b.endCol < bar.startCol || b.startCol > bar.endCol));
      if (lane) lane.push(bar);
      else lanes.push([bar]);
    }
    return lanes;
  }, [eventsForRender, weekDays]);

  const handleAllDayMouseDown = useCallback(
    (event: CalendarEvent, startCol: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setAllDayDrag({
        event,
        startCol,
        originX: e.clientX,
        currentX: e.clientX,
        active: false,
      });
    },
    []
  );

  // Pasek całodniowy leży poza siatką godzin, więc nasłuchujemy na oknie.
  useEffect(() => {
    if (!allDayDrag) return;

    const onMove = (e: MouseEvent) => {
      setAllDayDrag((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              active: prev.active || Math.abs(e.clientX - prev.originX) > DRAG_THRESHOLD_PX,
            }
          : prev
      );
    };

    const onUp = () => {
      const state = allDayDragRef.current;
      if (state?.active) {
        const shift = targetColumn(state.currentX) - state.startCol;
        if (shift !== 0) {
          onEventChange(
            state.event,
            addDays(state.event.start, shift),
            addDays(state.event.end, shift)
          );
          dragEndedAtRef.current = Date.now();
        }
      }
      setAllDayDrag(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [allDayDrag, onEventChange, targetColumn]);

  // Compute overlapping positions for events
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

    // Set total columns for each group
    positions.forEach((p) => {
      p.totalColumns = columns.length;
    });

    return positions;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day header row */}
      <div
        className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0"
        style={{ paddingRight: scrollbarWidth }}
      >
        <div className="w-16 flex-shrink-0" />
        {weekDays.map((day, i) => {
          const isTodayDay = isToday(day);
          return (
            <div
              key={i}
              className="flex-1 min-w-0 text-center py-2 border-l border-gray-100 dark:border-gray-700"
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {format(day, 'EEE').replace('.', '')}
              </div>
              <div
                className={cn(
                  'text-2xl font-light mt-0.5',
                  isTodayDay ? 'text-blue-500 font-medium' : 'text-gray-800 dark:text-gray-100'
                )}
              >
                <span
                  className={cn(
                    'w-10 h-10 inline-flex items-center justify-center rounded-full',
                    isTodayDay && 'bg-blue-500 text-white'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day section */}
      {allDayLanes.length > 0 && (
        <div
          className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0"
          style={{ paddingRight: scrollbarWidth }}
        >
          <div className="w-16 flex-shrink-0 flex items-start justify-end pr-2 pt-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">cały dzień</span>
          </div>

          {/* Siatka dni pod paskami — same linie, żeby kolumny się zgadzały. */}
          <div
            className="flex-1 min-w-0 relative"
            style={{ height: allDayLanes.length * ALL_DAY_BAR_HEIGHT + 8 }}
          >
            <div className="absolute inset-0 flex">
              {weekDays.map((_, i) => (
                <div key={i} className="flex-1 min-w-0 border-l border-gray-100 dark:border-gray-700" />
              ))}
            </div>

            {allDayLanes.map((lane, laneIndex) =>
              lane.map(({ event, startCol, endCol }) => {
                const cat = getCategoryForEvent(event);
                const span = endCol - startCol + 1;
                const isDragged = allDayDrag?.active && allDayDrag.event.id === event.id;

                return (
                  <div
                    key={event.id}
                    data-event
                    {...eventActivationProps(event, handleEventActivate)}
                    onMouseDown={(e) => handleAllDayMouseDown(event, startCol, e)}
                    title={event.title}
                    style={{
                      position: 'absolute',
                      top: laneIndex * ALL_DAY_BAR_HEIGHT + 4,
                      left: `calc(${(startCol * 100) / 7}% + 2px)`,
                      width: `calc(${(span * 100) / 7}% - 4px)`,
                    }}
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium cursor-move truncate text-white',
                      'hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-400',
                      cat?.color,
                      // Ucięta krawędź pokazuje, że wydarzenie wychodzi poza ten tydzień.
                      event.start >= weekDays[0] ? 'rounded-l' : '',
                      eventOccursOnDay(event, weekDays[6]) && event.end > weekDays[6] ? '' : 'rounded-r',
                      isDragged && 'opacity-80 ring-2 ring-blue-400'
                    )}
                  >
                    {event.title}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div
        ref={scrollRef}
        className={cn('flex-1 overflow-y-auto overflow-x-hidden', eventDrag?.active && 'select-none')}
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

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            const dayItems: DayItem[] = getEventsForDay(eventsForRender, day)
              .filter((e) => !e.allDay)
              .map((event) => ({ event, segment: getEventSegmentForDay(event, day) }));
            const positioned = computeEventPositions(dayItems);
            const isTodayDay = isToday(day);

            return (
              <div
                key={dayIndex}
                data-day-col={dayIndex}
                className="flex-1 min-w-0 relative border-l border-gray-100 dark:border-gray-700"
                onMouseDown={(e) => handleMouseDown(dayIndex, day, e)}
              >
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-gray-100 dark:border-gray-700"
                    style={{ top: hour * HOUR_HEIGHT }}
                  >
                    {/* Half-hour line */}
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
                  const width = `calc(${100 / totalColumns}% - 4px)`;
                  const left = `calc(${(column * 100) / totalColumns}% + 2px)`;
                  const isDragged = eventDrag?.active && eventDrag.event.id === event.id;

                  return (
                    <div
                      key={event.id}
                      data-event
                      {...eventActivationProps(event, handleEventActivate)}
                      onMouseDown={(e) => handleEventMouseDown(event, dayIndex, 'move', e)}
                      className={cn(
                        'absolute rounded-lg px-2 py-1 cursor-move overflow-hidden border-l-3 transition-shadow hover:shadow-md z-10',
                        'focus:outline-none focus:ring-2 focus:ring-blue-400',
                        cat?.bgLight,
                        cat?.bgDark,
                        cat?.borderColor,
                        isDragged && 'opacity-80 shadow-lg ring-2 ring-blue-400 z-30'
                      )}
                      style={{ top, height, width, left }}
                    >
                      <div className={cn('text-xs font-semibold truncate', cat?.textColor, cat?.textDark)}>
                        {event.title}
                      </div>
                      {height > 40 && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {segment.continuesBefore ? '…' : format(segment.start, 'HH:mm')} –{' '}
                          {segment.continuesAfter ? '…' : format(segment.end, 'HH:mm')}
                        </div>
                      )}

                      {/* Uchwyt zmiany długości */}
                      {!segment.continuesAfter && (
                        <div
                          data-resize-handle
                          onMouseDown={(e) => handleEventMouseDown(event, dayIndex, 'resize', e)}
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"
                        />
                      )}
                    </div>
                  );
                })}

                {/* Drag preview */}
                {dragState && dragState.dayIndex === dayIndex && (
                  <div
                    className="absolute left-1 right-1 bg-blue-200/60 border border-blue-400 rounded-lg z-30 pointer-events-none"
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
            );
          })}
        </div>
      </div>
    </div>
  );
};
