import { Command } from "./command";
import { CommandNotes } from "./command.notes";

export class Block {
    static _id: number = 0;
    id = Block._id++;
    label: string = '';
    commands: Command[] = [];
    blockContent: CommandNotes = { 
        notes: '',
        isVariable: false,
        variableName: ''
    };
    pulse: number = 0;
    repeatingTimes: number = 1;
    children: Block[] = [];

    constructor(block?: any) {
        if (block instanceof Block) {
            // Si es un Block, usar clone
            const cloned = block.clone();
            this.id = cloned.id;
            this.label = cloned.label;
            this.commands = cloned.commands;
            this.blockContent = cloned.blockContent;
            this.pulse = cloned.pulse;
            this.repeatingTimes = cloned.repeatingTimes;
            this.children = cloned.children;
        } else if (block) {
            // Si es un objeto plano, construir normalmente
            this.label = block.label || '';
            this.commands = block.commands?.map((cmd: any) => new Command(cmd)) || [];
            this.blockContent = new CommandNotes(block.blockContent || { 
                notes: '',
                isVariable: false,
                variableName: ''
            });
            this.pulse = block.pulse || 0;
            this.repeatingTimes = block.repeatingTimes || 1;
            this.children = block.children?.map((child: any) => new Block(child)) || [];
        }
    }

    removeBlock(block: Block) {
        if (block?.children != null && block.children?.length > 0) {
            this.children = this.children?.filter(t => t != block);
        }
    }

    clone(): Block {
        const clonedBlock = new Block();
        
        // Copiar propiedades básicas
        clonedBlock.id = Block._id++;
        clonedBlock.label = this.label;
        clonedBlock.pulse = this.pulse;
        clonedBlock.repeatingTimes = this.repeatingTimes;
        
        // Clonar blockContent
        clonedBlock.blockContent = {
            notes: this.blockContent.notes,
            isVariable: this.blockContent.isVariable,
            variableName: this.blockContent.variableName
        };
        
        // Clonar commands
        clonedBlock.commands = this.commands.map(command => new Command({
            type: command.type,
            value: command.value,
            isVariable: command.isVariable
        }));
        
        // Clonar children recursivamente
        clonedBlock.children = this.children.map(child => child.clone());
        
        return clonedBlock;
    }
}