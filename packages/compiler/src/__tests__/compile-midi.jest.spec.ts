import * as fs from 'fs';
import * as path from 'path';
import { VariableContext } from '@moderanger/core';
import { compileSongText } from '../compile-midi';
import { CompiledSong } from '../types';

interface CompileFixture {
    header?: string;
    preset?: string[];
    procedure?: string[];
    block?: string[];
}

const compile = (notes: string, fixture: CompileFixture = {}): Promise<CompiledSong> => {
    const lines = ['song Test', 'version 2'];
    if (fixture.header) {
        lines.push(fixture.header);
    }
    lines.push('melodies', '  melody Tema', '    notes');
    lines.push(...notes.split('\n').map(line => `      ${line}`));

    if (fixture.preset) {
        lines.push('presets', '  preset TemaAjustes');
        lines.push(...fixture.preset.map(line => `    ${line}`));
    }
    if (fixture.procedure) {
        lines.push('procedures', '  procedure TemaProc');
        lines.push(...fixture.procedure.map(line => `    ${line}`));
    }
    lines.push('part Piano', '  block Tema');
    if (fixture.preset) {
        lines.push('    preset TemaAjustes');
    }
    if (fixture.procedure) {
        lines.push('    procedure TemaProc');
    }
    lines.push('    melody Tema');
    if (fixture.block) {
        lines.push(...fixture.block.map(line => `    ${line}`));
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

    it('aplica los ajustes del preset antes de generar las notas', async () => {
        const chord = await compile('4n:0', {
            preset: ['PLAYMODE CHORD', 'WIDTH 2']
        });
        expect(chord.parts[0].notes.map(note => note.midi)).toEqual([60, 63, 67]);
        expect(chord.parts[0].notes.every(note => note.tick === 0 && note.durationTicks === 960)).toBe(true);

        const arpeggio = await compile('4n:0', {
            preset: ['PLAYMODE ASCENDING', 'WIDTH 2']
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

    it('expande en orden preset → procedure → melody → hijos y repite la pasada completa', async () => {
        const text = `song Orden
version 2

vars
  $oct = 1

melodies
  melody M
    notes
      4n:0

presets
  preset P
    OCT $oct
    PLAYMODE SINGLE

procedures
  procedure Proc
    VARY $oct 1

part Piano
  block B repeats 2
    preset P
    procedure Proc
    melody M

    block Hijo
      melody M
`;
        const song = await compileSongText(text);
        const midis = song.parts[0].notes.map(note => note.midi);

        expect(midis).toHaveLength(4);
        expect(midis[0]).toBe(midis[1]);
        expect(midis[2]).toBe(midis[3]);
        expect(midis[2] - midis[0]).toBe(12);
    });

    it('resuelve notes $variable en las melodías antes de generar', async () => {
        const text = `song Variable
version 2

vars
  $motif = "4n:0 4n:2"

melodies
  melody M
    notes $motif

part Piano
  block B
    melody M
`;
        const song = await compileSongText(text);

        expect(song.parts[0].notes).toHaveLength(2);
    });

    it('compila el corpus del formato 2 y transporta notas fuera de rango MIDI', async () => {
        const corpus = fs.readFileSync(
            path.resolve(process.cwd(), 'src/app/model/mr/__tests__/corpus/orbita.mr'),
            'utf8'
        );
        const song = await compileSongText(corpus);

        expect(song.parts.flatMap(part => part.notes).every(note => note.midi >= 0 && note.midi <= 127)).toBe(true);
        expect(song.parts.some(part => part.notes.length > 0)).toBe(true);
    });
});
