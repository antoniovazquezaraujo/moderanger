import{ Player }from '../target/Player';
import { Instrument } from '../target/Instrument';
import { Tonality } from '../target/Scale';

test('play is working', () => {
    var instrument = new Instrument();
    instrument.scale = 2;
    instrument.timbre = 4;
    instrument.tonality = Tonality.G;

    var player: Player = new Player();
    player.density = 3;
    player.inversion = 2;
    player.octave = 5;
    var result = player.play(instrument);
    expect(result).toStrictEqual([80, 84, 76, 79]);
}); 
 