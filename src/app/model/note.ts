export class NoteData {
    type: 'note' | 'rest' | 'arpeggio' | 'chord' | 'silence' = 'note';
    duration: string = '4t';
    note?: number;
    noteDatas?: NoteData[]; // Para Arpeggios y Acordes
    constructor(data?: Partial<NoteData>) {
        Object.assign(this, data);
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
  