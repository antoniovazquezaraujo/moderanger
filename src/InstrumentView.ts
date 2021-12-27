import {Instrument} from './Instrument.js';
import {getNoteName, Tonality,getScaleByNum, Scale} from './Scale.js';
   
const NUM_OF_SECTORS = 12;
const START_SECTOR = 6;


window.onload = function () {
    var canvas = <HTMLCanvasElement>document.getElementById('myCanvas');    
    // var view = new InstrumentView(new Instrument(), canvas);
    // view.radius= 75;
    // view.circleColor= 'lightgreen';
    // view.drawCircle();
    // view.drawScaleGrades();
    // var instrument:Instrument = new Instrument();
    // instrument.tonality=Tonality.D;
    // var view2 = new InstrumentView(instrument, canvas);
    // view2.radius= 105;
    // view2.orientation = 0;
    // view2.circleColor= 'lightblue';
    // view2.drawCircle();
    // view2.showChord([1,3,5]);
    // view2.drawScaleNotes();
    for(var n = 0; n<6; n++){
        var instrument = new Instrument();
        instrument.scale=n;
        var view = new InstrumentView(instrument, canvas);
        view.circleColor= 'red';
        view.radius= 100+n + (25*n);
        view.drawCircle();
        view.drawScaleNotes();    
    }
}
 
export class InstrumentView {
    centerX: number;
    centerY: number;
    circleColor:string;
    textColor:string;
    radius:number;
    orientation:number;
    instrument: Instrument;
    context: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
 
    constructor(instrument: Instrument, canvas: HTMLCanvasElement) {
        this.instrument = instrument;
        this.canvas = canvas;
        this.context = canvas!.getContext('2d')!;
        this.context.font = 'bold 15pt Calibri';
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.radius = 375;
        this.circleColor = 'white';
        this.textColor = 'black';
        this.orientation=0;
    } 
    drawCircle(): void {
        this.context.strokeStyle = this.circleColor;
        this.context.beginPath();
        this.context.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2, true);
        this.context.lineWidth = 25;
        this.context.stroke();
    }
    drawNote(note:any, sector:number){
        var angle = 360 / 12 ;
        var labelX = this.centerX + (this.radius ) * Math.sin(angle * (START_SECTOR + this.orientation + sector) * Math.PI / 180)
        var labelY = this.centerY - (this.radius ) * Math.cos(angle * (START_SECTOR + this.orientation + sector) * Math.PI / 180)
        this.context.fillStyle = this.textColor;
        this.context.fillText(note, labelX - 5, labelY + 5);
    }
    drawScaleGrades( ): void {
        this.context.strokeStyle = this.textColor;
        var scheme:Scale = getScaleByNum(this.instrument.scale);
        for(var note = 0; note< scheme.getNumNotes(); note++){
            var noteSector = scheme.getNotePosition(note);
            this.drawNote((note+1), noteSector);
        }
    }
    drawScaleNotes( ): void {
        this.context.strokeStyle = this.textColor;
        var scheme:Scale = getScaleByNum(this.instrument.scale);
        for(var note = 0; note< scheme.getNumNotes(); note++){
            var noteSector = scheme.getNotePosition(note);
            this.drawNote(getNoteName(noteSector+this.instrument.tonality), noteSector);
        }
    }
    showChord(notes:number[] ): void {
        this.context.strokeStyle = this.textColor;
        var scheme:Scale = getScaleByNum(this.instrument.scale);
        for(var note = 0; note< notes.length; note++){
            var noteSector = scheme.getNotePosition(notes[note]-1);
            this.selectNote(noteSector, 70+60*note);
        }
    }
    selectNote(sector:number, color:number){
        var angle = 360 / 12 ;
        var labelX = this.centerX + (this.radius ) * Math.sin(angle * (START_SECTOR + this.orientation + sector) * Math.PI / 180)
        var labelY = this.centerY - (this.radius ) * Math.cos(angle * (START_SECTOR + this.orientation + sector) * Math.PI / 180)
        this.context.beginPath();
        this.context.fillStyle = `rgb(${color},${color},${color})`
        this.context.arc(labelX , labelY , 10, 0, Math.PI *2, true );
        this.context.fill();
    }
}