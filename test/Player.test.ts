import { Player } from '../target/Player';
import { Instrument } from '../target/Instrument';
import { Tonality } from '../target/Scale';

test('play is working', () => {
    var instrument = new Instrument();
    instrument.scale = 2;
    instrument.timbre = 4;
    instrument.tonality = Tonality.G;

    var player = new Player();
    player.density = 3;
    player.inversion = 2;
    player.octave = 5;
    player.selectNotes(instrument);
    expect(instrument.notes).toStrictEqual([80, 84, 76, 79]);
});
