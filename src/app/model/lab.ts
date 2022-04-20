import { waitForAsync } from "@angular/core/testing";
import { Block } from "./block";

export class Manager {
    block: Block = 
        new Block({ id: 0, repeatingTimes:2,  children:[
            new Block({id:1}),
            new Block({id:2, repeatingTimes:3, children:[
                new Block({id:3}),
                new Block({id:4, repeatingTimes:5})
            ]})
        ]});
    ;
    index: number = 0;

    run(){
        this.play(this.block);
    }

    play(block: Block) {
        for (let n: number = 0; n < block.repeatingTimes!; n++) {
            this.playBlockNotes(block);
            for(let child of block.children!){
                this.play(child);
            }
        }
    }

    async playBlockNotes(block: Block) {
        console.log("playing block notes: " + block.id);
    }
}

