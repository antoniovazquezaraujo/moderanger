declare var JZZ: any;
export var sound: any;

import {PlayMode} from './Player.js';
import './JZZ.js';
import './JZZ.synth.Tiny.js';
import { arpeggiate } from './PlayMode.js';

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
    for (var n of notes){
          sound.noteOff(n, 127);
    }
}

export async function playChord(notes: number[], duration: number) {
    for (var n of notes) {
          sound.noteOn(n, 127, duration);
    }
    await sound.wait(duration);
}
export async function play(notes: number[], duration: number, playMode:PlayMode) {
    if(playMode != PlayMode.CHORD){
        notes = arpeggiate(notes, playMode);
    }

    for (var n of notes) {
          sound.noteOn(n, 127, duration);
          if(playMode != PlayMode.CHORD){
              await sound.wait(duration);
          }
    }
    if(playMode === PlayMode.CHORD || notes.length=== 0){
        await sound.wait(duration);
    }
}
export async function playQUEFUNCIONA(notes: number[], duration: number, playMode:PlayMode) {
    for (var n of notes.reverse()) {
          sound.noteOn(n, 127, duration);
          if(playMode != PlayMode.CHORD){
              await sound.wait(duration);
          }
    }
    if(playMode === PlayMode.CHORD){
        await sound.wait(duration);
    }
}
export async function stop(notes: number[] ) {
    for (var n of notes){
        sound.noteOff(n, 127);
  }
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

