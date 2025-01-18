import { Block } from "./block";
import { InstrumentType } from "./instruments";

export class Part {
    static _id: number = 0;
    id = Part._id++;
    name: string;
    block: Block;
    instrumentType: InstrumentType;

    constructor(opts?: Partial<Part>) {
        this.name = opts?.name || '';
        this.block = opts?.block ? new Block(opts.block) : new Block();
        this.instrumentType = opts?.instrumentType || InstrumentType.PIANO;
    }

    removeBlock(block: Block) {
        if (block?.children != null && block.children?.length > 0) {
            this.block.children = this.block.children?.filter(t => t !== block);
        }
    }

    clone(): Part {
        const clonedPart = new Part();
        clonedPart.name = this.name;
        clonedPart.block = new Block(this.block);
        clonedPart.instrumentType = this.instrumentType;
        return clonedPart;
    }
}