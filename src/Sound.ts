declare var JZZ: any;
export var sound: any;

import './JZZ.js';
import './JZZ.synth.Tiny.js';
  
export function initSound() {
    JZZ.synth.Tiny.register('Synth');
    sound = JZZ().openMidiOut().or(function () { alert('Cannot open MIDI port!'); })
    .ch(0)
    .program(0);
}

export function playNotes(notes: number[], duration: number): void {
    for (var n of notes) {
        sound.note(n, 127, duration)
    }
    sound.wait(duration);
}
