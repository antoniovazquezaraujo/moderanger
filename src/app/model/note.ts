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
    }
    
    toString(): string {
        let durationPrefix = '';
        // Añadir prefijo de duración SOLO si existe
        if (this.duration) {
            durationPrefix = `${this.duration}:`;
        }
        
        switch (this.type) {
            case 'note':
            case 'rest':
            case 'silence':
                // Usar el prefijo (puede ser vacío si no había duración)
                return `${durationPrefix}${this.note ?? 's'}`;
            
            case 'arpeggio': 
                const arpeggioNotes = this.noteDatas?.map(note => note.toString()).join(' ') ?? '';
                // Usar el prefijo (el grupo siempre debería tener duración?)
                return `${durationPrefix}[${arpeggioNotes}]`; 
            
            case 'chord': 
                 const chordNotes = this.noteDatas?.map(note => note.toString()).join(' ') ?? '';
                 // Usar el prefijo
                 return `${durationPrefix}{${chordNotes}}`; 
            
            case 'group': 
                const groupNotes = this.children?.map(note => note.toString()).join(' ') ?? '';
                // Usar el prefijo
                return `${durationPrefix}(${groupNotes})`; 
            
            default:
                console.warn(`NoteData.toString: Unknown type ${this.type}`);
                return ''; 
        }
    }

    static toStringArray(notes: NoteData[]): string {
        return notes.map(note => note.toString()).join(' ');
    }
}
  