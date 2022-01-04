import { Player } from './Player.js';
import { Tonality} from './Scale.js';

export class Instrument {
    player:Player = new Player();
    channel:number=0;
    private scale: number = 0;        //Escala usada (0-5)
    tonality: number = Tonality.D;     //En qué tonalidad está el círculo (1-12)
    timbre: number = 1;       //El sonido seleccionado para ese círculo
    notes: number[] = [];      //Notas seleccionadas para tocar por un player
    selectNextScale(){
        this.scale++;
        this.scale%=6;
    }
    selectPrevScale(){
        this.scale--;
        if(this.scale < 0){
            this.scale = 5;
        }
    }
    selectScale(scale:number){
        this.scale=scale%6;
    }
    getScale():number{
        return this.scale;
    }
} 
 