import { Player } from './Player.js';
import { Tonality} from './Scale.js';

export class Instrument {
    player:Player = new Player();
    channel:number=0;
    scale: number = 0;        //Escala usada (1-6)
    tonality: number = Tonality.D;     //En qué tonalidad está el círculo (1-12)
    timbre: number = 1;       //El sonido seleccionado para ese círculo
    notes: number[] = [];      //Notas seleccionadas para tocar por un player
} 
 