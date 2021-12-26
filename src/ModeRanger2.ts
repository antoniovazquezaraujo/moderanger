import { Instrument } from './Instrument.js';
import { Tonality } from './Scale.js';
import { Player } from './Player.js';
import {  playNotes, initSound } from './Sound.js';

async function start() {
    initSound();
    var instrument = new Instrument();
    instrument.scale = 1;
    instrument.timbre = 4;
    instrument.tonality = Tonality.D; 

    var player: Player = new Player();
    player.density = 2;
    player.inversion = 0; 
    player.octave = 4; 

    for (var index = 0; index < 7; index++) {
        player.selectedNote = index;
        var result = player.play(instrument);
        await delay(250); 
        playNotes(result, 250);
    } 
}
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
window.onload = function () {
    initSound();
    start();
}




