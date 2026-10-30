import { buildMidi } from '../midi-writer';
import { CompiledSong } from '../types';

const song = (overrides: Partial<CompiledSong> = {}): CompiledSong => ({
    title: 'Test',
    bpm: 120,
    ppq: 960,
    parts: [
        {
            name: 'Piano',
            program: 0,
            channel: 0,
            notes: [{ tick: 0, durationTicks: 960, midi: 60, velocity: 90 }]
        }
    ],
    warnings: [],
    ...overrides
});

describe('compilador MIDI · escritor SMF', () => {
    it('escribe cabecera tipo 1 con PPQ 960 y una pista por parte', () => {
        const midi = buildMidi(song());

        expect(midi.subarray(0, 4).toString('ascii')).toBe('MThd');
        expect(midi.readUInt16BE(8)).toBe(1);
        expect(midi.readUInt16BE(10)).toBe(2);
        expect(midi.readUInt16BE(12)).toBe(960);
    });

    it('incluye tempo, nombre, programa y note on/off', () => {
        const midi = buildMidi(song());

        expect(midi.includes(Buffer.from([0xff, 0x51, 0x03, 0x07, 0xa1, 0x20]))).toBe(true);
        expect(midi.includes(Buffer.from('Piano', 'utf8'))).toBe(true);
        expect(midi.includes(Buffer.from([0xc0, 0x00]))).toBe(true);
        expect(midi.includes(Buffer.from([0x90, 60, 90]))).toBe(true);
        expect(midi.includes(Buffer.from([0x80, 60, 0]))).toBe(true);
    });

    it('rechaza más de 16 partes (canales MIDI)', () => {
        const parts = Array.from({ length: 17 }, (_, index) => ({
            name: `Part ${index}`,
            program: 0,
            channel: index,
            notes: []
        }));

        expect(() => buildMidi(song({ parts }))).toThrow(/16 partes/);
    });
});
