import React from 'react';
import { CalendarEvent } from '../types';

export type EventActivate = (event: CalendarEvent, position: { x: number; y: number }) => void;

/** Miejsce, w którym ma się pojawić dymek — pod wskaźnikiem albo pod samym kafelkiem. */
export function positionFromMouse(e: React.MouseEvent): { x: number; y: number } {
  return { x: e.clientX, y: e.clientY };
}

function positionFromElement(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return { x: rect.left, y: rect.bottom };
}

/**
 * Zestaw właściwości robiący z kafelka wydarzenia element osiągalny klawiaturą.
 * Bez tego kalendarz da się tylko oglądać, nie obsługiwać.
 */
export function eventActivationProps(event: CalendarEvent, activate: EventActivate) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      activate(event, positionFromMouse(e));
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();
      activate(event, positionFromElement(e.currentTarget as HTMLElement));
    },
  };
}
