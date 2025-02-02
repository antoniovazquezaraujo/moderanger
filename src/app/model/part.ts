import { Block } from "./block";
import { InstrumentType } from "./instruments";
import { VariableContext } from "./variable.context";

export class Part {
    static _id: number = 0;
    id = Part._id++;
    name: string;
    blocks: Block[] = [new Block()];
    instrumentType: InstrumentType = InstrumentType.PIANO;
    private variableContext?: VariableContext;

    constructor(opts?: Partial<Part>) {
        this.name = opts?.name || '';
        this.blocks = opts?.blocks ? opts.blocks.map(block => new Block(block)) : [new Block()];
        this.instrumentType = opts?.instrumentType || InstrumentType.PIANO;
    }

    setVariableContext(context: VariableContext) {
        this.variableContext = context;
        this.blocks.forEach(block => block.setVariableContext(context));
    }

    removeBlock(block: Block) {
        const index = this.blocks.indexOf(block);
        if (index !== -1) {
            this.blocks.splice(index, 1);
        }
    }

    clone(): Part {
        const clonedPart = new Part();
        clonedPart.name = this.name;
        clonedPart.blocks = this.blocks.map(block => new Block(block));
        clonedPart.instrumentType = this.instrumentType;
        return clonedPart;
    }

    toJSON() {
        return {
            id: this.id,
            blocks: this.blocks,
            instrumentType: this.instrumentType
        };
    }
}