import { MusicalInstrument } from '../../instrument';

export class PianoMock implements MusicalInstrument {
    name = 'Piano Mock';
    play() {}
    stop() {}
    dispose() {}
} 