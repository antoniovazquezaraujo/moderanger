import { Block } from "./block";

export class Part{
    public blocks!:Block[];

    // constructor(blocks:Block[]){
    //     this.blocks = blocks;
    // } 

    constructor(opts?: Partial<Part>) {
        if (opts?.blocks != null) {
            this.blocks = opts.blocks.map(val => new Block(val));
        }
    }
    removeBlock(block:Block){
        this.blocks = this.blocks.filter(t => t != block);
    }
}