import { Block } from './block';
import { PlayMode } from './play.mode';
import { ScaleTypes } from './scale';
import { Command } from './command';

export class NoteData {
    type: 'note' | 'rest' | 'arpeggio' | 'chord' | 'silence' | 'command' = 'note';
    duration: string = '4t';
    note?: number;
    noteDatas?: NoteData[]; // Para Arpeggios y Acordes
    commands?: Command[]; // Para marcadores de comandos
    block?: Block; // Referencia al bloque que contiene esta nota
    playerState?: {
        scale: ScaleTypes;
        tonality: number;
        playMode: PlayMode;
    }; // Estado del player cuando se creó la nota

    constructor(data?: Partial<NoteData>) {
        Object.assign(this, data);
    }
}
  