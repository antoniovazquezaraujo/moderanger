import { durationToSeconds, durationToTicks, secondsToTicks } from '../timing';

describe('compilador MIDI · duraciones y ticks', () => {
    it('convierte las duraciones del DSL a segundos con el BPM de la canción', () => {
        expect(durationToSeconds('4n', 120)).toBeCloseTo(0.5);
        expect(durationToSeconds('4t', 120)).toBeCloseTo(1 / 3);
        expect(durationToSeconds('8t', 120)).toBeCloseTo(1 / 6);
        expect(durationToSeconds('1m', 120)).toBeCloseTo(2);
        expect(durationToSeconds('0.25s', 120)).toBeCloseTo(0.25);
    });

    it('convierte a ticks con PPQ 960 sin perder tresillos', () => {
        expect(durationToTicks('4n', 120, 960)).toBe(960);
        expect(durationToTicks('4t', 120, 960)).toBe(640);
        expect(durationToTicks('8t', 120, 960)).toBe(320);
        expect(durationToTicks('16n', 120, 960)).toBe(240);
        expect(durationToTicks('1m', 120, 960)).toBe(3840);
        expect(durationToTicks('0.25s', 120, 960)).toBe(480);
    });

    it('convierte tiempos absolutos a ticks', () => {
        expect(secondsToTicks(0, 120, 960)).toBe(0);
        expect(secondsToTicks(0.5, 120, 960)).toBe(960);
        expect(secondsToTicks(1, 120, 960)).toBe(1920);
    });
});
