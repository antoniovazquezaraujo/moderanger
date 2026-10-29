import type { AudioEngineService } from 'src/app/services/audio-engine.service';
import { Block } from 'src/app/model/block';
import { BlockReference } from 'src/app/model/block-reference';
import { Command } from 'src/app/model/command';
import { durationToSeconds } from 'src/app/model/duration';
import { NoteData } from 'src/app/model/note';
import { BaseOperation } from 'src/app/model/operation';
import { Part, PartItem } from 'src/app/model/part';
import { Player } from 'src/app/model/player';
import { Song } from 'src/app/model/song';
import { VariableContext } from 'src/app/model/variable.context';
import { NoteGenerationService } from 'src/app/services/note-generation.service';
import { NoteGenerationUnifiedService } from 'src/app/shared/services/note-generation-unified.service';

/** Unidad de ejecución musical: comandos/operaciones y, opcionalmente, notas. */
interface ExecutionUnit {
    block: Block;
    commands: Command[];
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
} as unknown as AudioEngineService;

/**
 * Genera los eventos de una parte con la misma secuencia que `SongPlayer`:
 * comandos/operaciones por unidad de ejecución, después las notas del bloque.
 */
export function compilePart(part: Part, song: Song, index: number): RawPart {
    const noteGenerator = new NoteGenerationService(new NoteGenerationUnifiedService());
    const player = new Player(index, part.instrumentType, `compiler-${index}`, NULL_AUDIO_ENGINE);
    const units = buildExecutionUnits(part, song);
    const noteDatas: NoteData[] = [];

    units.forEach(unit => {
        unit.commands.forEach(command => command.execute(player));
        unit.operations.forEach(operation => operation.execute());
        if (unit.includeNotes && unit.block.blockContent?.notes?.trim()) {
            noteDatas.push(...noteGenerator.generateNotesForBlock(unit.block, player));
        }
    });

    return { part, ...notesToRawEvents(noteDatas, song.bpm) };
}

/**
 * Construye las unidades de ejecución de una parte.
 *
 * Es la misma expansión que `SongPlayer._buildExecutionUnits`: bloques inline
 * con sus hijos/repeticiones y referencias `use` con el orden definición →
 * llamada → notas → hijos.
 */
function buildExecutionUnits(part: Part, song: Song): ExecutionUnit[] {
    const units: ExecutionUnit[] = [];
    const library = new Map<string, Block>();
    (song.blocks ?? []).forEach(block => library.set(block.label, block));

    const addBlockAndChildren = (block: Block) => {
        for (let i = 0; i < block.repeatingTimes; i++) {
            units.push({
                block,
                commands: block.commands ?? [],
                operations: block.operations ?? [],
                includeNotes: true
            });
            block.children?.forEach(child => addBlockAndChildren(child));
        }
    };

    const addReference = (reference: BlockReference) => {
        const definition = library.get(reference.targetLabel);
        if (!definition) {
            throw new Error(`la referencia '${reference.targetLabel}' no tiene definición en blocks`);
        }
        const passes = reference.repeatingTimes * definition.repeatingTimes;
        for (let i = 0; i < passes; i++) {
            units.push({
                block: definition,
                commands: definition.commands ?? [],
                operations: definition.operations ?? [],
                includeNotes: false
            });
            units.push({
                block: definition,
                commands: reference.commands ?? [],
                operations: reference.operations ?? [],
                includeNotes: false
            });
            units.push({
                block: definition,
                commands: [],
                operations: [],
                includeNotes: true
            });
            definition.children?.forEach(child => addBlockAndChildren(child));
        }
    };

    (part.items ?? []).forEach((item: PartItem) => {
        if (item.kind === 'reference') {
            addReference(item);
        } else {
            addBlockAndChildren(item);
        }
    });

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
 * Sustituye `notes $variable` antes de generar, igual que `SongPlayer`.
 * La mutación es deliberada: el compilador trabaja con una copia parseada.
 */
export function substituteVariablesInSong(song: Song): void {
    const processBlock = (block: Block) => {
        if (block.blockContent?.isVariable && block.blockContent.variableName) {
            const value = VariableContext.getValue(block.blockContent.variableName);
            if (typeof value === 'string') {
                block.blockContent.notes = value;
            }
        }
        block.children?.forEach(processBlock);
    };

    song.blocks?.forEach(processBlock);
    song.parts.forEach(part => {
        part.items?.forEach(item => {
            if (item.kind === 'block') {
                processBlock(item);
            }
        });
    });
}
