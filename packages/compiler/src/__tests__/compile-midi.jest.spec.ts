import * as fs from 'fs';
import * as path from 'path';
import { VariableContext } from '@moderanger/core';
import { compileSongText } from '../compile-midi';

interface CompileFixture {
    header?: string;
    block?: string;
}

const compile = (notes: string, fixture: CompileFixture = {}): Promise<import('../types').CompiledSong> => {
    const lines = ['song Test', 'version 1'];
    if (fixture.header) {
        lines.push(fixture.header);
    }
    lines.push('part Piano', '  block Tema', '    notes');
    lines.push(...notes.split('\n').map(line => `      ${line}`));
    if (fixture.block) {
        lines.push(...fixture.block.split('\n').map(line => `    ${line}`));
    }
    return compileSongText(lines.join('\n'));
};

describe('compilador MIDI · eventos musicales', () => {
    beforeEach(() => VariableContext.context.clear());

    it('compila notas simples con tick y duración en PPQ 960', async () => {
        const song = await compile('4n:0\n4n:2\n8t:4');

        expect(song.warnings).toEqual([]);
        expect(song.parts).toHaveLength(1);
        expect(song.parts[0].notes).toEqual([
            { tick: 0, durationTicks: 960, midi: 60, velocity: 90 },
            { tick: 960, durationTicks: 960, midi: 63, velocity: 90 },
            { tick: 1920, durationTicks: 320, midi: 67, velocity: 90 }
        ]);
    });

    it('expande acordes y arpegios como el player', async () => {
        const chord = await compile('4n:0', {
            block: 'commands\n  PLAYMODE CHORD\n  WIDTH 2'
        });
        expect(chord.parts[0].notes.map(note => note.midi)).toEqual([60, 63, 67]);
        expect(chord.parts[0].notes.every(note => note.tick === 0 && note.durationTicks === 960)).toBe(true);

        const arpeggio = await compile('4n:0', {
            block: 'commands\n  PLAYMODE ASCENDING\n  WIDTH 2'
        });
        expect(arpeggio.parts[0].notes).toEqual([
            { tick: 0, durationTicks: 320, midi: 60, velocity: 90 },
            { tick: 320, durationTicks: 320, midi: 63, velocity: 90 },
            { tick: 640, durationTicks: 320, midi: 67, velocity: 90 }
        ]);
    });

    it('respeta las repeticiones de canción', async () => {
        const song = await compile('4n:0', { header: 'repeats 2' });

        expect(song.parts[0].notes).toEqual([
            { tick: 0, durationTicks: 960, midi: 60, velocity: 90 },
            { tick: 960, durationTicks: 960, midi: 60, velocity: 90 }
        ]);
    });

    it('compila el corpus de bloques reutilizables y transporta notas fuera de rango MIDI', async () => {
        const corpus = fs.readFileSync(
            path.resolve(process.cwd(), 'src/app/model/mr/__tests__/corpus/bloques-repeats.mr'),
            'utf8'
        );
        const song = await compileSongText(corpus);

        expect(song.warnings).toEqual([
            "La nota MIDI 132 de 'Voz' está fuera de 0–127; se ha transportado a 120."
        ]);
        expect(song.parts.flatMap(part => part.notes).every(note => note.midi >= 0 && note.midi <= 127)).toBe(true);
        expect(song.parts.some(part => part.notes.length > 0)).toBe(true);
    });
});
