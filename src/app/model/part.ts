import { Block } from "./block";
export class Part{
    static _id:number = 0;
    
    id=Part._id++;
    block:Block= new Block({});

    constructor(opts?: Partial<Part>) {
        if (opts?.block != null) {
            this.block = new Block(opts.block);
        }
    }
    removeBlock(block:Block){
        this.block.children = this.block.children.filter(t => t!= block);
    }
}