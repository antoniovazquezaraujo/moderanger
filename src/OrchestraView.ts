import { getNoteName, Tonality, getScaleByNum, Scale } from './Scale.js';
import { Instrument } from './Instrument.js';
import { InstrumentView } from './InstrumentView.js';
import { Orchestra } from './Orchestra.js';
import { Conductor } from './Conductor.js';
import { playNotes, initSound } from './Sound.js';
const NUM_OF_SECTORS = 12;
const START_SECTOR = 6;


window.onload = function () {
    initSound();
    var canvas = <HTMLCanvasElement>document.getElementById('myCanvas');
    var orchestra = new Orchestra();
    for (var n = 0; n < 6; n++) {
        let instrument = new Instrument();
        instrument.scale = n;
        //instrument.tonality = n;
        orchestra.addInstrument(instrument);
    }
    var view: OrchestraView = new OrchestraView(orchestra, canvas);
    for (var n = 0; n < view.instrumentViews.length; n++) {
        view.instrumentViews[n].orientation = 0;
    }

    var conductor = new Conductor(view);
    conductor.start();
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
            console.log("Notas:" + instrumentView.getInstrument().notes);
        }
        playNotes(this.getSelectedView().getInstrument().notes, 200);

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