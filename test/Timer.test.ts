//import {Song, parseSong} from  '../target/GrammarDriver.js';
import * as Grammar from  '../target/GrammarDriver.js';
import * as Parser from '../target/parser.js';

test('test', () => {
    var result = Parser.parse('W0,P1,S1,V10:1357 W0,SF0:24686427531');  
    var song = parseSong(result.ast!);
    console.log(song);
    processBlocks(song);
    var x:Grammar.Song;
    var y :Grammar.Pepe;
 });

function processBlocks(song:any ) {
    var s = song as typeof Grammar.Song;
    
}

