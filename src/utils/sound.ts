import { SoundId } from '../types';

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/**
 * Przeglądarki nie pozwalają odtworzyć dźwięku, dopóki użytkownik czegoś nie kliknie,
 * więc odblokowujemy kontekst audio przy pierwszej interakcji ze stroną.
 */
export function unlockAudioOnFirstGesture(): () => void {
  const unlock = () => {
    const c = getContext();
    if (c?.state === 'suspended') void c.resume();
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  return () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
}

interface Tone {
  /** Częstotliwość w hercach. */
  freq: number;
  /** Opóźnienie względem początku dźwięku, w sekundach. */
  at: number;
  /** Czas wybrzmiewania w sekundach. */
  duration: number;
  type?: OscillatorType;
  /** Względna głośność tonu, 0–1. */
  gain?: number;
}

export const SOUND_OPTIONS: { id: SoundId; label: string }[] = [
  { id: 'chime', label: 'Dzwonek' },
  { id: 'ping', label: 'Ping' },
  { id: 'marimba', label: 'Marimba' },
  { id: 'gong', label: 'Gong' },
  { id: 'beep', label: 'Sygnał' },
];

/** Każdy dźwięk to kilka tonów składanych w locie — bez plików audio. */
const SOUNDS: Record<SoundId, Tone[]> = {
  chime: [
    { freq: 880, at: 0, duration: 0.9 },
    { freq: 1174.7, at: 0.18, duration: 0.9 },
  ],
  ping: [{ freq: 1568, at: 0, duration: 0.35 }],
  marimba: [
    { freq: 523.25, at: 0, duration: 0.45, type: 'triangle' },
    { freq: 659.25, at: 0.09, duration: 0.45, type: 'triangle' },
    { freq: 783.99, at: 0.18, duration: 0.55, type: 'triangle' },
  ],
  gong: [
    { freq: 196, at: 0, duration: 2.2 },
    { freq: 261.63, at: 0.02, duration: 1.8, gain: 0.5 },
    { freq: 392, at: 0.04, duration: 1.2, gain: 0.25 },
  ],
  beep: [
    // Fala prostokątna jest ostra, więc gramy ją ciszej niż tony sinusoidalne.
    { freq: 1046.5, at: 0, duration: 0.1, type: 'square', gain: 0.4 },
    { freq: 1046.5, at: 0.14, duration: 0.1, type: 'square', gain: 0.4 },
  ],
};

export function playReminderSound(sound: SoundId, volume = 0.6): void {
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();

  const tones = SOUNDS[sound] ?? SOUNDS.chime;
  const base = c.currentTime + 0.02;
  const master = Math.max(volume, 0.001) * 0.35;

  for (const tone of tones) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const start = base + tone.at;
    const peak = master * (tone.gain ?? 1);

    osc.type = tone.type ?? 'sine';
    osc.frequency.setValueAtTime(tone.freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + tone.duration + 0.05);
  }
}
