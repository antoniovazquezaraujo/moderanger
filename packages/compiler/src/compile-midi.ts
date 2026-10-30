import { applyDocumentVariables, parseSong, SongDocument, VariableContext } from '@moderanger/core';
import { compilePart, substituteVariablesInSong } from './compile-core';
import { DEFAULT_PPQ, secondsToTicks } from './timing';
import { CompiledNote, CompiledPart, CompiledSong } from './types';

export interface CompileOptions {
    /** Ticks por negra; por defecto 960. */
    ppq?: number;
    /** Velocidad MIDI fija; por defecto 90. */
    velocity?: number;
}

const DEFAULT_VELOCITY = 90;

/** Compila texto `.mr` a un modelo listo para MIDI. */
export async function compileSongText(text: string, options: CompileOptions = {}): Promise<CompiledSong> {
    return compileDocument(parseSong(text), options);
}

/**
 * Compila un documento `.mr` ya parseado.
 *
 * El núcleo es puro: no usa Angular, Tone, ni un motor de audio. Reutiliza el
 * modelo, `Player` (estado musical) y `NoteGenerationService` (notas) con la
 * misma secuencia de ejecución que `SongPlayer`.
 */
export async function compileDocument(document: SongDocument, options: CompileOptions = {}): Promise<CompiledSong> {
    const ppq = options.ppq ?? DEFAULT_PPQ;
    const velocity = options.velocity ?? DEFAULT_VELOCITY;
    const song = document.song;
    const bpm = song.bpm;
    const warnings: string[] = [];
    const variablesSnapshot = VariableContext.snapshot();

    try {
        applyDocumentVariables(document);
        substituteVariablesInSong(song);

        const rawParts = song.parts.map((part, index) => compilePart(part, song, index));
        const songDuration = rawParts.reduce((max, raw) => Math.max(max, raw.duration), 0);
        const repeats = Math.max(1, song.repeats);

        const parts: CompiledPart[] = rawParts.map((raw, index) => {
            const notes: CompiledNote[] = [];
            for (let repetition = 0; repetition < repeats; repetition++) {
                const offset = repetition * songDuration;
                raw.events.forEach(event => {
                    const midi = foldIntoMidiRange(event.midi);
                    if (midi !== event.midi) {
                        warnings.push(
                            `La nota MIDI ${event.midi} de '${raw.part.name || `Part ${index + 1}`}' está fuera de 0–127; se ha transportado a ${midi}.`
                        );
                    }
                    notes.push({
                        tick: secondsToTicks(event.time + offset, bpm, ppq),
                        durationTicks: Math.max(1, secondsToTicks(event.duration, bpm, ppq)),
                        midi,
                        velocity
                    });
                });
            }
            notes.sort((a, b) => a.tick - b.tick || a.midi - b.midi);
            return {
                name: raw.part.name,
                program: 0,
                channel: index,
                notes
            };
        });

        return {
            title: song.name,
            bpm,
            ppq,
            parts,
            warnings
        };
    } finally {
        // El compilador no debe dejar variables de la canción en el contexto
        // global si se usa como librería.
        VariableContext.restore(variablesSnapshot);
    }
}

/**
 * MIDI solo admite 0–127. Una nota fuera de rango se transporta por octavas
 * (conserva la clase de altura) en lugar de descartarse o romper la compilación.
 */
function foldIntoMidiRange(midi: number): number {
    let folded = Math.round(midi);
    while (folded > 127) {
        folded -= 12;
    }
    while (folded < 0) {
        folded += 12;
    }
    return folded;
}
