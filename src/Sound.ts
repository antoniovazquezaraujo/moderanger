import './JZZ.js';
import './JZZ.synth.Tiny.js';
declare var JZZ: any;

JZZ.synth.Tiny.register('Synth');
var sound = JZZ().openMidiOut().or(function () { alert('Cannot open MIDI port!'); });

export function playClic(): void {
    sound.noteOn(9, 80, 50)
        .wait(100)
        .noteOff(9, 80);
}
export function playChord(notes: number[]): void {
    notes.forEach(note => {
        sound.noteOn(0, note, 50)
            .wait(100)
            .noteOff(0, note);
    });
}