import { Scale } from "./Scale";



export class Instrument {
    scale: number = 1;        //Escala usada (1-6)
    tonality: number = 1;     //En qué tonalidad está el círculo (1-12)
    timbre: number = 1;       //El sonido seleccionado para ese círculo
    notes: number[] = [];      //Notas seleccionadas para tocar por un player
}
