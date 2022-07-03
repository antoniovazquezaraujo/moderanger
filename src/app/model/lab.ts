import { Block } from "./block";
import { Part } from "./part";
import { Synth, FMSynth, AMSynth } from "tone";
import { Loop } from "tone";
import { Transport } from "tone";
import { Parser } from "./parser";
import { parseBlock } from "./song.parser";
import { SoundBit } from "./note";



export class Lab {

  // main() {
  //     var masterClock = JZZ.SMPTE();                // master clock
  //     var slaveClock = JZZ.SMPTE();                 // slave clock
  //     var senderWidget = JZZ.Widget();               // sending port
  //     var receiverWidget = JZZ.Widget();             // receiving port
  //     receiverWidget._receive = function(msg: { toString: () => any; }) {
  //       if (slaveClock.read(msg))                   // print and consume the MTC messages
  //         console.log(masterClock.toString(), ' ==> ', msg.toString(), ' ==> ', slaveClock.toString());
  //       else receiverWidget._emit(msg);                       // forward all other MIDI messages
  //     };
  //     senderWidget.connect(receiverWidget);
  //     masterClock.reset(24, 7, 39, 59);             // 7:40 it arrives...
  //     for (var n = 0; n < 1125; n++) {
  //       senderWidget.mtc(masterClock);
  //       masterClock.incrQF();
  //     }
  // }
  main() { 
   this.playSounds();
    let x ="3 4 2:4 4:2 5:( s 3 4 5 4:2 8:(s 3 4))";
    let y = "9:( 3 4 2:4 4:2 5:( s 3 4 5 4:2 8:(s 3 4)))";
    let z = "5:(4 5) 3:6 7 9 8 s 9:s 4:32 7";
    let parser = new Parser(z);
    const tree = parser.parse();
    let soundBits: SoundBit[] = [];
    if(tree.ast){ 
      console.log("ast:");
      
      console.log(parseBlock(tree.ast, "1n", soundBits));
    }
        
  }
  
  playSounds(){
    const synthA = new FMSynth().toDestination();
    const synthB = new AMSynth().toDestination();
    //play a note every quarter-note
    const loopA = new Loop(time => {
      synthA.triggerAttackRelease("C4", "32n", time);
    }, "4n").start(0);
    //play another note every off quarter-note, by starting it "8n"
    // const loopB = new Loop(time => {
    //   synthB.triggerAttackRelease("E4", "8n", time);
    // }, "3n").start("8n");
    // the loops start when the Transport is started
    Transport.start()
    // ramp up to 800 bpm over 10 seconds
    // Transport.bpm.rampTo(800, 10);
  }
}

