import {Instrument} from './Instrument.js';
import { KeyboardConductor } from './KeyboardConductor.js';
import {  playNotes,  sound } from './Sound.js';
export class Orchestra{
 
    instruments:Instrument[];
    instrumentOrder: number[] ;
    
    constructor(){
        this.instruments = [];
        this.instrumentOrder = [];
 
    }
 
    addInstrument(instrument:Instrument):void{
        this.instruments.push(instrument);
        this.instrumentOrder.push(this.instrumentOrder.length);
    }
    moveInstrument(from:number, to:number):void{
        [this.instrumentOrder[from], this.instrumentOrder[to]] = [this.instrumentOrder[to], this.instrumentOrder[from]];
    }
    getInstrument(order:number):Instrument{
        return this.instruments[this.instrumentOrder[order]];
    }
    selectNotesToPlay(){
        for (var index = 0; index < this.instruments.length; index++) {
            this.getInstrument(index).player.selectNotes(this.getInstrument(index));
        } 
    }
}