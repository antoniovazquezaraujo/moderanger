import { Block } from "./block";
export class Part {
    static _id: number = 0;

    id = Part._id++;
    block: Block = new Block({});

    constructor(opts?: Partial<Part>) {
        if (opts?.block != null) {
            this.block = new Block(opts.block);
        }
    }
    removeBlock(block: Block) {
        if (block?.children != null && block.children?.length > 0) {
            this.block!.children = this.block?.children?.filter(t => t != block);
        }
    }
    addBlock(block: Block){
        this.block!.children.push(block);
    }
}