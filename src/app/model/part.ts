import { Block } from './block';
import { InstrumentType } from "../services/audio-engine.service";
import { Command } from './command';

export class Part {
    static _id: number = 0;
    id = Part._id++;
    name: string = '';
    blocks: Block[] = [new Block()];
    instrumentType: InstrumentType = InstrumentType.PIANO;

    constructor() {

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
        clonedPart.instrumentType = this.instrumentType;

        clonedPart.blocks = this.blocks.map(block => {
            const clonedBlock = block.clone();
            return clonedBlock;
        });

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