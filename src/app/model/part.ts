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
        
        // Solo crear un bloque por defecto si no se proporcionan bloques
        if (opts?.blocks) {
            this.blocks = opts.blocks.map(block => {
                const newBlock = block instanceof Block ? block.clone() : new Block(block);
                console.log(`Creating block with operations:`, newBlock.operations);
                return newBlock;
            });
        } else {
            this.blocks = [new Block()];
        }
        
        this.instrumentType = opts?.instrumentType || InstrumentType.PIANO;
        
        this.blocks.forEach(block => {
            console.log(`Block ${block.id} operations:`, block.operations);
        });
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
        // Crear una parte sin bloques iniciales
        const clonedPart = new Part({
            name: this.name,
            blocks: [], // Inicializar con array vacío
            instrumentType: this.instrumentType
        });
        
        // Clonar los bloques existentes
        clonedPart.blocks = this.blocks.map(block => {
            const clonedBlock = block.clone();
            console.log(`Cloning block ${block.id} with operations:`, block.operations);
            console.log(`Cloned block ${clonedBlock.id} has operations:`, clonedBlock.operations);
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