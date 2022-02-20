declare var JZZ: any;
export var sound: any;

import { timestamp } from 'rxjs';
import { PlayMode, arpeggiate } from './play.mode';
var JZZ = require('jzz');
require('jzz-synth-tiny')(JZZ);

export async function initSound() {
    JZZ.synth.Tiny.register('Synth');
    sound = JZZ().openMidiOut().or(function () { alert('Cannot open MIDI port!'); })
        .ch(0)
        .program(0);
}

export async function playNotes(notes: number[], duration: number) {
    await playNotesInChannel(notes, duration, 0);
}
export async function playNotesInChannel(notes: number[], duration: number, channel: number) {
    for (var n of notes) {
        sound.noteOn(n, 127, duration);
    }
    await sound.wait(duration);
    for (var n of notes) {
        sound.noteOff(n, 127);
    }
}

// export async function playChord(notes: number[], duration: number) {
//     for (var n of notes) {
//         sound.noteOn(n, 127, duration);
//     }
//     await sound.wait(duration);
// }
export async function wait(duration: number) {
    await sound.wait(duration);
}
export async function setSoundProgram(channel: number, program: number) {
    sound.ch(channel).program(program);
}
export async function play(notes: number[], duration: number, playMode: PlayMode, channel:number) {
    if (playMode === PlayMode.CHORD) {
        await playChord(notes, duration, channel);
    } else {
        playArpeggio(notes, duration, playMode, channel);
    }
}
export async function playChord(notes: number[], duration: number, channel:number) {
    for (var n of notes) {
        console.log("canal:"+ channel+ " note:"+ n);
        sound.ch(channel).noteOn(n, 127, duration);
    }
    //await sound.wait(duration);
}
export async function playArpeggio(notes: number[], duration: number, playMode: PlayMode, channel:number) {
    notes = arpeggiate(notes, playMode);
    duration = duration / notes.length * 1.0;
    for (var n of notes) {
        sound.ch(channel).noteOn(n, 127, duration);
        await sound.wait(duration);
    }
}


export async function playQUEFUNCIONA(notes: number[], duration: number, playMode: PlayMode) {
    for (var n of notes.reverse()) {
        sound.noteOn(n, 127, duration);
        if (playMode != PlayMode.CHORD) {
            await sound.wait(duration);
        }
    }
    if (playMode === PlayMode.CHORD) {
        await sound.wait(duration);
    }
}
export async function stop(notes: number[], channel:number) {
    for (var n of notes) {
        sound.ch(channel).noteOff(n, 127);
    }
}
export async function stopSound() {
    sound.allSoundOff();
}

export async function open(channel: number, program: number) {
    sound.ch(channel).program(program);
}
export async function playNote(note: number, duration: number, channel: number) {
    await sound
        .ch(channel)
        .program(0)
        .noteOn(note, 127, duration)
        .wait(duration)
        .noteOff(note, 127)
        .close();
}

