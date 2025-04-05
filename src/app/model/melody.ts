import { NoteData } from './note';

// Tipos básicos
export type NoteDuration = '1n' | '2n' | '4n' | '8n' | '16n' | '4t' | '8t';
export type NoteType = 'note' | 'rest' | 'arpeggio' | 'chord';

// Modelo base de nota
export interface BaseNote {
    id: string;              // Identificador único para cada nota
    type: NoteType;
    duration: NoteDuration;
}

// Nota simple
export interface SingleNote extends BaseNote {
    type: 'note' | 'rest';
    value: number | null;    // null para silencios
}

// Grupo de notas (para reemplazar el sistema actual de brackets)
export interface NoteGroup extends BaseNote {
    type: 'arpeggio' | 'chord';
    notes: MusicElement[];
}

// Tipo unión para cualquier elemento musical
export type MusicElement = SingleNote | NoteGroup;

// Datos de presentación separados
export interface EditorState {
    selectedNoteId?: string;
    expandedGroups: Set<string>;
}

// Clase utilitaria para generar IDs únicos
export class NoteIdGenerator {
    private static counter = 0;
    
    static generateId(): string {
        return `note_${Date.now()}_${this.counter++}`;
    }
}

// Factory para crear notas
export class NoteFactory {
    static createSingleNote(value: number | null, duration: NoteDuration = '4n'): SingleNote {
        return {
            id: NoteIdGenerator.generateId(),
            type: value === null ? 'rest' : 'note',
            duration,
            value
        };
    }
    
    static createNoteGroup(type: 'arpeggio' | 'chord', notes: MusicElement[], duration: NoteDuration = '4n'): NoteGroup {
        return {
            id: NoteIdGenerator.generateId(),
            type,
            duration,
            notes
        };
    }
}

// Convertidor entre el nuevo modelo y NoteData
export class NoteConverter {
    static toNoteData(element: MusicElement): NoteData {
        if (element.type === 'note' || element.type === 'rest') {
            return new NoteData({
                type: element.type,
                duration: element.duration,
                note: element.value ?? undefined
            });
        } else {
            const group = element as NoteGroup;
            return new NoteData({
                type: group.type,
                duration: group.duration,
                noteDatas: group.notes.map(note => this.toNoteData(note))
            });
        }
    }
    
    static fromNoteData(noteData: NoteData): MusicElement {
        if (noteData.type === 'note' || noteData.type === 'rest') {
            return NoteFactory.createSingleNote(
                noteData.note ?? null,
                noteData.duration as NoteDuration
            );
        } else {
            return NoteFactory.createNoteGroup(
                noteData.type as 'arpeggio' | 'chord',
                noteData.noteDatas?.map(note => this.fromNoteData(note)) ?? [],
                noteData.duration as NoteDuration
            );
        }
    }
} 