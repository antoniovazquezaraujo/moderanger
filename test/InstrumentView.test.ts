/**
 * @jest-environment jsdom
 */
import { Instrument } from '../target/Instrument.js';
import {InstrumentView } from '../target/InstrumentView.js';

test('instrumentView is working', () => {
   

});

 test('use jsdom in this test file', () => {
    var canvas:HTMLCanvasElement = <HTMLCanvasElement>document.createElement('canvas');  
    expect(canvas).not.toBeNull();
    var instrument = new Instrument();   
    var instrumentView = new InstrumentView(instrument, canvas);
    instrumentView.drawScaleGrades();
  });
