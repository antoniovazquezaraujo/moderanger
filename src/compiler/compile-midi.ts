import type { AudioEngineService } from 'src/app/services/audio-engine.service';
import { applyDocumentVariables, parseSong, SongDocument } from 'src/app/model/mr';
import { SongPlayer } from 'src/app/model/song.player';
import { NoteGenerationService } from 'src/app/services/note-generation.service';
import { NoteGenerationUnifiedService } from 'src/app/shared/services/note-generation-unified.service';
import { GlobalStateService } from 'src/app/shared/services/global-state.service';
import { CaptureAudioEngine } from './capture-engine';
import { DEFAULT_PPQ, durationToTicks, secondsToTicks } from './timing';
import { CompiledNote, CompiledPart, CompiledSong } from './types';

export interface CompileOptions {
    /** Ticks por negra; por defecto 960. */
    ppq?: number;
    /** Velocidad MIDI fija; por defecto 90. */
    velocity?: number;
    /**
     * Tope de ticks del scheduler para evitar bucles infinitos si el motor
     * quedara atascado. No debería alcanzarse en canciones normales.
     */
    maxSchedulerTicks?: number;
}

const DEFAULT_VELOCITY = 90;
/** 96n por tick del scheduler; 200k ticks son muchas horas de música. */
const DEFAULT_MAX_SCHEDULER_TICKS = 200_000;

/** Compila texto `.mr` a un modelo listo para MIDI. */
export async function compileSongText(text: string, options: CompileOptions = {}): Promise<CompiledSong> {
    return compileDocument(parseSong(text), options);
}

/**
 * Compila un documento `.mr` ya parseado.
 *
 * Usa el `SongPlayer` real con un motor de captura: la expansión de partes,
 * referencias, repeticiones, comandos, operaciones, acordes, arpegios,
 * `PATTERN` y `DECORATION` es exactamente la del reproductor web. El resultado
 * se convierte a ticks y se empaqueta en `CompiledSong`.
 */
export async function compileDocument(document: SongDocument, options: CompileOptions = {}): Promise<CompiledSong> {
    const ppq = options.ppq ?? DEFAULT_PPQ;
    const velocity = options.velocity ?? DEFAULT_VELOCITY;
    const maxSchedulerTicks = options.maxSchedulerTicks ?? DEFAULT_MAX_SCHEDULER_TICKS;
    const warnings: string[] = [];

    applyDocumentVariables(document);

    const engine = new CaptureAudioEngine();
    engine.bpm = document.song.bpm;
    const player = new SongPlayer(
        engine as unknown as AudioEngineService,
        new NoteGenerationService(new NoteGenerationUnifiedService()),
        new GlobalStateService()
    );

    await player.playSong(document.song);

    const schedulerSeconds = engine.timeToSeconds('96n');
    let schedulerTick = 0;
    while (!engine.stopped && engine.hasLoop() && schedulerTick < maxSchedulerTicks) {
        engine.runLoopTick(schedulerTick * schedulerSeconds);
        schedulerTick++;
    }

    if (schedulerTick >= maxSchedulerTicks) {
        warnings.push(`Se alcanzó el tope de ${maxSchedulerTicks} ticks del scheduler; la compilación puede estar incompleta.`);
    }

    const partIndexByInstrument = new Map<string, number>();
    engine.instrumentIds.forEach((instrumentId, index) => partIndexByInstrument.set(instrumentId, index));

    const parts: CompiledPart[] = document.song.parts.map((part, index) => ({
        name: part.name,
        program: 0,
        channel: index,
        notes: []
    }));

    engine.notes.forEach(event => {
        const partIndex = partIndexByInstrument.get(event.instrumentId);
        if (partIndex === undefined || parts[partIndex] === undefined) {
            warnings.push(`Se descartó una nota de un instrumento desconocido (${event.instrumentId}).`);
            return;
        }
        const midi = foldIntoMidiRange(event.midi);
        if (midi !== event.midi) {
            warnings.push(
                `La nota MIDI ${event.midi} de '${parts[partIndex].name || `Part ${partIndex + 1}`}' está fuera de 0–127; se ha transportado a ${midi}.`
            );
        }
        const note: CompiledNote = {
            tick: secondsToTicks(event.time, document.song.bpm, ppq),
            durationTicks: durationToTicks(event.duration, document.song.bpm, ppq),
            midi,
            velocity
        };
        parts[partIndex].notes.push(note);
    });

    parts.forEach(part => {
        part.notes.sort((a, b) => a.tick - b.tick || a.midi - b.midi);
    });

    // Restaura las variables al estado previo al Play (el player guarda el
    // snapshot) y libera el loop de captura.
    player.stop();

    return {
        title: document.song.name,
        bpm: document.song.bpm,
        ppq,
        parts,
        warnings
    };
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
