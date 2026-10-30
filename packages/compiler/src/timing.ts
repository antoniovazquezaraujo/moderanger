import { durationToSeconds } from '@moderanger/core/duration';

export { durationToSeconds };

/** Resolución por defecto del compilador: 960 ticks por negra. */
export const DEFAULT_PPQ = 960;

/** Segundos → ticks absolutos, redondeando al tick más cercano. */
export function secondsToTicks(seconds: number, bpm: number, ppq: number = DEFAULT_PPQ): number {
    const quarterSeconds = 60 / bpm;
    return Math.round((seconds / quarterSeconds) * ppq);
}

/** Duración DSL → ticks, con un mínimo de un tick. */
export function durationToTicks(value: string | number, bpm: number, ppq: number = DEFAULT_PPQ): number {
    return Math.max(1, secondsToTicks(durationToSeconds(value, bpm), bpm, ppq));
}
