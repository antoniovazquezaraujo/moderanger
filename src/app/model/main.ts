import { Frequency, Loop, Time, Context, Transport } from 'tone';
import { Block } from './block';
import { Command, CommandType } from './command';
import { Arpeggio, Chord, Note, Rest, SoundBit } from './note';
import { Parser } from "./block.parser";
import { Part } from './part';
import { arpeggiate, getPlayModeFromString, PlayMode } from './play.mode';
import { Player } from "./player";
import { ScaleTypes } from './scale';
import { Song } from './song';
import { parseBlock } from "./block.parser.utils";
class Main {
  public static run() {
    const result = new Song();
    console.log(result);
  }
}

Main.run();
