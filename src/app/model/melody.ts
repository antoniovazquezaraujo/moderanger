import { NoteData } from './note';

// Tipos básicos
export type NoteDuration = '1n' | '2n' | '4n' | '8n' | '16n' | '4t' | '8t';
export type NoteType = 'note' | 'rest' | 'arpeggio' | 'chord' | 'group';

// Modelo base de nota
export interface BaseElement {
    id: string;              // Identificador único para cada nota
    type: NoteType;
    time?: number; // Time in seconds relative to the start of the transport
    ticks?: number; // Time in ticks relative to the start of the transport
    duration?: NoteDuration; // Make duration optional
}

// Nota simple
export interface SingleNote extends BaseElement {
    type: 'note' | 'rest';
    value: number | null;    // null para silencios
}

// Grupo compuesto (Arpegio o Acorde)
export interface CompositeNote extends BaseElement {
    type: 'arpeggio' | 'chord';
    notes: SingleNote[]; // ENFORCE: Solo notas simples dentro
}

// NUEVO: Grupo genérico (paréntesis con duración)
export interface GenericGroup extends BaseElement {
    type: 'group';
    children: MusicElement[]; // Puede contener notas o subgrupos
}

// Tipo unión para cualquier elemento musical
export type MusicElement = SingleNote | CompositeNote | GenericGroup;


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
    
    static createCompositeNote(type: 'arpeggio' | 'chord', notes: SingleNote[], duration: NoteDuration = '4n'): CompositeNote {
        return {
            id: NoteIdGenerator.generateId(),
            type,
            duration,
            notes
        };
    }

    // NUEVO: Factory para grupos genéricos
    static createGenericGroup(children: MusicElement[], duration: NoteDuration): GenericGroup {
        return {
            id: NoteIdGenerator.generateId(),
            type: 'group',
            duration, // La duración es obligatoria para el grupo
            children
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
        } else if (element.type === 'group') { // Manejar GenericGroup
            const group = element as GenericGroup;
            return new NoteData({
                type: 'group',
                duration: group.duration,
                children: group.children.map(child => this.toNoteData(child))
            });
        } else { // Manejar CompositeNote (arpegio/acorde)
            const group = element as CompositeNote;
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
        } else if (noteData.type === 'group') { // Manejar nuestro tipo 'group'
            return NoteFactory.createGenericGroup(
                noteData.children?.map(child => this.fromNoteData(child)) ?? [],
                noteData.duration as NoteDuration
            );
        } else { // Asumir CompositeNote (arpegio/acorde)
            return NoteFactory.createCompositeNote(
                noteData.type as 'arpeggio' | 'chord',
                noteData.noteDatas?.map(note => this.fromNoteData(note) as SingleNote) ?? [], // Asumir SingleNote dentro?
                noteData.duration as NoteDuration
            );
        }
    }
} 