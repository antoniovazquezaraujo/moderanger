/**
 * Tone.js mock para Jest.
 *
 * Mantiene la API mínima que consume el núcleo (Time, Frequency, Transport,
 * Sampler, Loop) y hace que `Tone.Time(...).toSeconds()` devuelva valores
 * reales para las duraciones del dominio (`4n`, `8t`, `...s`), de forma que
 * la lógica de escalado de duraciones de patterns sea testeable.
 */

const DEFAULT_BPM = 120;

interface BpmHolder {
  value: number;
}

export const Transport: {
  start: (time?: unknown) => void;
  stop: (time?: unknown) => void;
  cancel: () => void;
  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;
  position: unknown;
  bpm: BpmHolder;
  context: { state: string };
} = {
  start: () => undefined,
  stop: () => undefined,
  cancel: () => undefined,
  on: () => undefined,
  off: () => undefined,
  position: 0,
  bpm: { value: DEFAULT_BPM },
  context: { state: 'suspended' }
};

const secondsPerQuarterNote = (): number => 60 / Transport.bpm.value;

/**
 * Convierte las notaciones que usa el proyecto:
 *  - number | "0.25s" -> segundos directos
 *  - "4n" (negra = 1/4 de redonda) -> 4/duration * negra
 *  - "4t" (tresillo de negra) -> (4/duration * negra) * 2/3
 */
export function durationToSeconds(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }

  const trimmed = String(value).trim();

  const secondsMatch = /^([\d.]+)s$/.exec(trimmed);
  if (secondsMatch) {
    return parseFloat(secondsMatch[1]);
  }

  const noteMatch = /^([\d.]+)(n|t)$/.exec(trimmed);
  if (!noteMatch) {
    return 0;
  }

  const amount = parseFloat(noteMatch[1]);
  if (!amount) {
    return 0;
  }

  const quarter = secondsPerQuarterNote();
  const base = (4 / amount) * quarter;
  return noteMatch[2] === 't' ? base * (2 / 3) : base;
}

export const Time = (value: string | number) => ({
  toSeconds: (): number => durationToSeconds(value)
});

export const Frequency = (value: string | number, _unit?: string) => ({
  toFrequency: (): number => (typeof value === 'number' ? value : 440)
});

export class Sampler {
  private urls: unknown;
  private baseUrl: string;

  constructor(config: { urls?: unknown; baseUrl?: string } = {}) {
    this.urls = config.urls;
    this.baseUrl = config.baseUrl || '';
  }

  triggerAttackRelease(
    _note: string | number,
    _duration: string | number,
    _time?: string | number
  ): void {
    /* no-op */
  }

  releaseAll(): void {
    /* no-op */
  }

  toDestination(): this {
    return this;
  }

  dispose(): void {
    /* no-op */
  }
}

export class Loop {
  constructor(_callback: (time: number) => void, _interval?: string | number) {
    /* no-op */
  }

  start(_time?: unknown): void {
    /* no-op */
  }

  stop(_time?: unknown): void {
    /* no-op */
  }

  dispose(): void {
    /* no-op */
  }
}

export const start = async (): Promise<void> => undefined;
export const loaded = async (): Promise<void> => undefined;
