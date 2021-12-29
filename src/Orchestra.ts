import {Instrument} from './Instrument.js';

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

}