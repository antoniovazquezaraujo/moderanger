import { Orchestra } from '../target/Orchestra.js';
import {Instrument } from '../target/Instrument.js';
// import {Tonality } from '../target/Scale.js';
// import {Player} from '../target/Player.js';

test('orchestra is working', () => {
    var orchestra = new Orchestra();
    var i1 = new Instrument();
    orchestra.addInstrument(i1);
    expect(orchestra.getInstrument(0)).toStrictEqual(i1);
    var i2 = new Instrument();
    orchestra.addInstrument(i2);
    expect(orchestra.getInstrument(1)).toStrictEqual(i2);
    orchestra.moveInstrument(1,0);
    expect(orchestra.getInstrument(0)).toStrictEqual(i2);
    expect(orchestra.getInstrument(1)).toStrictEqual(i1);
    expect(orchestra.instruments.length).toBe(2);

});