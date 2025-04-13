export interface NoteData {
    id?: string;
    type?: 'note' | 'rest' | 'arpeggio' | 'chord' | 'silence' | 'group';
    duration?: string;
    note?: number | undefined;
    children?: NoteData[];
    noteDatas?: NoteData[]; // Para Arpeggios y Acordes
}

export class NoteData implements NoteData {
    id?: string;
    type?: 'note' | 'rest' | 'arpeggio' | 'chord' | 'silence' | 'group';
    duration?: string;
    note?: number | undefined;
    children?: NoteData[];
    noteDatas?: NoteData[]; // Para Arpeggios y Acordes

    constructor(data: Partial<NoteData>) {
        Object.assign(this, data);
        if (!this.duration && this.type !== 'group') { // Los grupos sí tienen duración propia
            this.duration = '4t';
        }
    }
    
    toString(): string {
        if (this.type === 'note' || this.type === 'rest') {
            return `${this.duration}:${this.note ?? 's'}`;
        } else {
            const notes = this.noteDatas?.map(note => note.toString()).join(' ') ?? '';
            return `${this.duration}:(${notes})`;
        }
    }

    static toStringArray(notes: NoteData[]): string {
        return notes.map(note => note.toString()).join(' ');
    }
}
  