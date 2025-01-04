export class NoteData {
    type: 'note' | 'rest' | 'arpeggio' | 'chord' | 'silence' = 'note';
    duration: string = '4t';
    note?: number;
    noteDatas?: NoteData[]; // Para Arpeggios y Acordes
    constructor(data?: Partial<NoteData>) {
        Object.assign(this, data);
    }
}
  