import { Block } from "./block";
export class Part {
    static _id: number = 0;
    id = Part._id++;
    name: string;
    block: Block;

    constructor(opts?: Partial<Part>) {
        this.name = opts?.name || '';
        this.block = opts?.block ? new Block(opts.block) : new Block();
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
        return clonedPart;
    }
}