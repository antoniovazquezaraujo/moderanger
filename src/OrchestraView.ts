import { getNoteName, Tonality, getScaleByNum, Scale } from './Scale.js';
import { Instrument } from './Instrument.js';
import { InstrumentView } from './InstrumentView.js';
import { Orchestra } from './Orchestra.js';
import { KeyboardConductor } from './KeyboardConductor.js';
import { play, playNotes, initSound } from './Sound.js';
import { ProgrammableConductor } from './ProgrammableConductor.js';
import { parseSong, Song } from './GrammarDriver.js';
import * as Parser from './parser.js';
const NUM_OF_SECTORS = 12;
const START_SECTOR = 6;


window.onload = function () {
    initSound();
    var canvas = <HTMLCanvasElement>document.getElementById('myCanvas');
    var orchestra = new Orchestra();
    for (var n = 0; n < 6; n++) {
        let instrument = new Instrument();
        instrument.selectScale(n);
        //instrument.tonality = n;
        orchestra.addInstrument(instrument);
    }
    var view: OrchestraView = new OrchestraView(orchestra, canvas);
    for (var n = 0; n < view.instrumentViews.length; n++) {
        view.instrumentViews[n].orientation = 0;
    }

    var conductor = new KeyboardConductor(view);
    conductor.start();
     
    var programmableConductor = new ProgrammableConductor();
    //var result = Parser.parse('W5,I0,M1,O4,K0,P48,S0:0----5----6---- W3,S3:0---- S2:0----1---- S4:0----3----');
//    var result = Parser.parse('W5,I3,M3,O4,K0,P30,S1:02--4- M5,S4,I4,O3,K2:0234 S2,I4,O3,K5:02--4- S3,I4,O3,K6:02--4- S5,I3,O4,K1:02--4- S2,I4,O4,K1:1234---- S2,I4,O4,K2:4235--6--');
    var result = Parser.parse('W5,I3,M5,O3,K2,P40,S3:0 ');
    var song: Song = parseSong(result.ast!);
    programmableConductor.setSong(song);
    programmableConductor.setInstrument(orchestra.getInstrument(0));
    programmableConductor.start();
    
    var programmableConductor2 = new ProgrammableConductor();
    //var result = Parser.parse('W5,I0,M1,O4,K0,P48,S0:0----5----6---- W3,S3:0---- S2:0----1---- S4:0----3----');
    var result2 = Parser.parse('W5,I3,M0,O4,K2,P8,S3:0----2-----3-----5--7-- ');
    var song2: Song = parseSong(result2.ast!);
    programmableConductor2.setSong(song2);
    programmableConductor2.setInstrument(orchestra.getInstrument(2));
    programmableConductor2.start();

}


export class OrchestraView {
    orchestra: Orchestra;
    instrumentViews: InstrumentView[];
    selectedView: number;
    centerX: number;
    centerY: number;
    context: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;

    constructor(orchestra: Orchestra, canvas: HTMLCanvasElement) {
        this.orchestra = orchestra;
        this.selectedView = 0;
        this.canvas = canvas;
        this.context = canvas!.getContext('2d')!;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.instrumentViews = [];
        var radius = 80;
        for (var n = 0; n < this.orchestra.instruments.length; n++) {
            let instrument = this.orchestra.instruments[n];
            let instrumentView: InstrumentView = new InstrumentView(instrument, this.canvas);
            instrumentView.radius = radius;
            instrumentView.showChords = true;
            radius += 28;
            this.instrumentViews.push(instrumentView);
        }
    }
    draw() {
        for (var n = 0; n < this.orchestra.instruments.length; n++) {
            let instrumentView = this.instrumentViews[n];
            if (this.selectedView === n) {
                instrumentView.circleColor = 'green';
            } else {
                instrumentView.circleColor = 'lightgreen';
            }
            instrumentView.draw();
        }
    }
    async play(time:number){
        await play(this.getSelectedView().getInstrument().notes, time, this.getSelectedView().getInstrument().player.playMode);
        //await playNotes(this.getSelectedView().getInstrument().notes, time);
    }

    async delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    selectView(n: number) {
        this.selectedView = n;
    }
    selectNextView() {
        this.selectedView = this.selectedView + 1;
        this.selectedView %= this.instrumentViews.length;
    }
    selectPrevView() {
        this.selectedView = this.selectedView - 1;
        if (this.selectedView < 0) {
            this.selectedView = this.instrumentViews.length - 1;
        }
    }
    getSelectedView(): InstrumentView {
        return this.instrumentViews[this.selectedView];
    }
    moveView(from: number, to: number) {
        if (from < 0) {
            from = this.instrumentViews.length - 1;
        }
        if (to < 0) {
            to = this.instrumentViews.length - 1;
        }
        if (from >= this.instrumentViews.length) {
            from = 0;
        }
        if (to >= this.instrumentViews.length) {
            to = 0;
        }

        [this.instrumentViews[from], this.instrumentViews[to]] = [this.instrumentViews[to], this.instrumentViews[from]];
        [this.instrumentViews[from].radius, this.instrumentViews[to].radius] = [this.instrumentViews[to].radius, this.instrumentViews[from].radius];
        this.selectedView = to;
    }
}