import {
    BaseOperation,
    Block,
    Command,
    durationToSeconds,
    NoteData,
    NoteGenerationService,
    NoteGenerationUnifiedService,
    Part,
    Player,
    Song,
    VariableContext
} from '@moderanger/core';

/**
 * Unidad de ejecución musical: un bloque en una pasada concreta.
 *
 * El orden de la pasada es preset → procedure → melody → hijos. Las
 * repeticiones del bloque envuelven la pasada completa, hijos incluidos.
 */
interface ExecutionUnit {
    block: Block;
    settings: Command[];
    operations: BaseOperation[];
    includeNotes: boolean;
}

/** Evento intermedio en segundos, antes de convertirlo a ticks MIDI. */
export interface RawNoteEvent {
    time: number;
    duration: number;
    midi: number;
}

export interface RawPart {
    part: Part;
    events: RawNoteEvent[];
    duration: number;
}

/** Motor nulo: `Player` solo lo usa para `setBpm`, que el compilador no llama. */
const NULL_AUDIO_ENGINE = {
    setTransportBpm: () => undefined
};

/**
 * Genera los eventos de una parte con la misma secuencia que el player:
 * ajustes del preset, operaciones del procedure, notas de la melodía y
 * bloques hijos.
 */
export function compilePart(part: Part, song: Song, index: number): RawPart {
    const noteGenerator = new NoteGenerationService(new NoteGenerationUnifiedService());
    const player = new Player(index, part.instrumentType, `compiler-${index}`, NULL_AUDIO_ENGINE);
    const units = buildExecutionUnits(part);
    const noteDatas: NoteData[] = [];

    units.forEach(unit => {
        unit.settings.forEach(setting => setting.execute(player));
        unit.operations.forEach(operation => operation.execute());
        const melody = unit.block.melody;
        if (unit.includeNotes && melody && melody.notes.trim()) {
            noteDatas.push(...noteGenerator.generateNotesForMelody(melody, player));
        }
    });

    return { part, ...notesToRawEvents(noteDatas, song.bpm) };
}

/**
 * Expansión estructural de una parte: por cada pasada de un bloque se ejecuta
 * preset → procedure → melody → hijos. El árbol es acíclico por construcción
 * (no hay referencias entre bloques).
 */
function buildExecutionUnits(part: Part): ExecutionUnit[] {
    const units: ExecutionUnit[] = [];

    const addBlockAndChildren = (block: Block) => {
        for (let i = 0; i < block.repeatingTimes; i++) {
            units.push({
                block,
                settings: block.preset?.settings ?? [],
                operations: block.procedure?.operations ?? [],
                includeNotes: block.melody !== undefined
            });
            block.children.forEach(child => addBlockAndChildren(child));
        }
    };

    part.items.forEach(item => addBlockAndChildren(item));
    return units;
}

/** Convierte el árbol de `NoteData` a eventos secuenciales en segundos. */
function notesToRawEvents(noteDatas: readonly NoteData[], bpm: number): { events: RawNoteEvent[]; duration: number } {
    const events: RawNoteEvent[] = [];
    let cursor = 0;

    noteDatas.forEach(noteData => {
        const duration = durationToSeconds(noteData.duration ?? '16n', bpm);
        appendNoteData(noteData, cursor, duration, events);
        cursor += duration;
    });

    return { events, duration: cursor };
}

function appendNoteData(noteData: NoteData, start: number, duration: number, events: RawNoteEvent[]): void {
    switch (noteData.type) {
        case 'note':
            if (noteData.note !== undefined) {
                events.push({ time: start, duration, midi: noteData.note });
            }
            return;
        case 'chord':
            (noteData.noteDatas ?? []).forEach(child => {
                if (child.note !== undefined) {
                    events.push({ time: start, duration, midi: child.note });
                }
            });
            return;
        case 'arpeggio': {
            const notes = (noteData.noteDatas ?? []).filter(child => child.note !== undefined);
            if (notes.length === 0) {
                return;
            }
            const singleDuration = duration / notes.length;
            notes.forEach((child, index) => {
                events.push({
                    time: start + index * singleDuration,
                    duration: singleDuration,
                    midi: child.note as number
                });
            });
            return;
        }
        case 'group':
            // `NoteGenerationService` aplana los grupos antes de devolverlos;
            // si llegara uno sin procesar, se trata como silencio.
            return;
        case 'rest':
        case 'silence':
        default:
            return;
    }
}

/**
 * Sustituye `notes $variable` en las melodías antes de generar, igual que el
 * player. La mutación es deliberada: el compilador trabaja con una copia
 * parseada.
 */
export function substituteVariablesInSong(song: Song): void {
    song.melodies.forEach(melody => {
        if (melody.content.isVariable && melody.content.variableName) {
            const value = VariableContext.getValue(melody.content.variableName);
            if (typeof value === 'string') {
                melody.content.notes = value;
            }
        }
    });
}
