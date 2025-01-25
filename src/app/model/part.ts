import { Block } from "./block";
import { InstrumentType } from "./instruments";
import { VariableContext } from "./variable.context";

export class Part {
    static _id: number = 0;
    id = Part._id++;
    name: string;
    block: Block = new Block();
    instrumentType: InstrumentType = InstrumentType.PIANO;
    private variableContext?: VariableContext;

    constructor(opts?: Partial<Part>) {
        this.name = opts?.name || '';
        this.block = opts?.block ? new Block(opts.block) : new Block();
        this.instrumentType = opts?.instrumentType || InstrumentType.PIANO;
    }

    setVariableContext(context: VariableContext) {
        this.variableContext = context;
        this.block.setVariableContext(context);
    }

    removeBlock(block: Block) {
        this.block.removeBlock(block);
    }

    clone(): Part {
        const clonedPart = new Part();
        clonedPart.name = this.name;
        clonedPart.block = new Block(this.block);
        clonedPart.instrumentType = this.instrumentType;
        return clonedPart;
    }

    toJSON() {
        return {
            id: this.id,
            block: this.block,
            instrumentType: this.instrumentType
        };
    }
}