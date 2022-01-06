import { Instrument } from './Instrument.js';
import { Tonality } from './Scale.js';
import { Player } from './Player.js';
import {  playNotes, initSound } from './Sound.js';
 
async function start() {
    initSound(); 
    var instrument = new Instrument();
    instrument.selectScale(1);
    instrument.timbre = 4;
    instrument.tonality = Tonality.D; 

    var player: Player = new Player();
    player.density = 3;
    player.inversion = 3; 
    player.octave = 4; 
 
    for (var index = 0; index < 7; index++) {
        player.selectedNote = index;
        player.selectNotes(instrument);
        await delay(250); 
        playNotes(instrument.notes, 250);
    } 
}
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
window.onload = function () {
    initSound();
    start();
}




