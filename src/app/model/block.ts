import { BlockContent } from './block.content';
import { Command } from './command';
import { BaseOperation, IncrementOperation, DecrementOperation, AssignOperation } from './operation';
import { VariableContext } from './variable.context';

export class Block {
    static _id: number = 0;
    id = Block._id++;
    label: string = '';
    commands: Command[] = [];
    blockContent: BlockContent;
    pulse: number = 0;
    repeatingTimes: number = 1;
    children: Block[] = [];
    private variableContext?: VariableContext;
    operations: BaseOperation[] = [];

    constructor(block?: any) {
        this.blockContent = new BlockContent();
        
        if (block instanceof Block) {
            // Si es un Block, usar clone
            const cloned = block.clone();
            this.id = cloned.id;
            this.label = cloned.label;
            this.commands = cloned.commands;
            this.blockContent = cloned.blockContent;
            this.pulse = cloned.pulse;
            this.repeatingTimes = Math.max(0, cloned.repeatingTimes);
            this.children = cloned.children;
            this.operations = cloned.operations;
            console.log(`Cloned block with operations: ${JSON.stringify(this.operations)}`);
        } else if (block) {
            // Si es un objeto plano, construir normalmente
            this.label = block.label || '';
            this.commands = block.commands?.map((cmd: any) => new Command(cmd)) || [];
            this.children = block.children?.map((child: any) => new Block(child)) || [];
            this.operations = block.operations?.map((op: any) => {
                switch (op.type) {
                    case 'INCREMENT':
                        return new IncrementOperation(op.variableName, op.value);
                    case 'DECREMENT':
                        return new DecrementOperation(op.variableName, op.value);
                    case 'ASSIGN':
                        return new AssignOperation(op.variableName, op.value);
                    default:
                        throw new Error(`Unknown operation type: ${op.type}`);
                }
            }) || [];
            console.log(`Initialized block with operations: ${JSON.stringify(this.operations)}`);
            
            if (block.blockContent) {
                this.blockContent.notes = block.blockContent.notes || '';
                this.blockContent.isVariable = block.blockContent.isVariable || false;
                this.blockContent.variableName = block.blockContent.variableName || '';
            }
            this.pulse = block.pulse || 0;
            this.repeatingTimes = Math.max(0, block.repeatingTimes || 1);
        }
        console.log(`Block created with ID: ${this.id}, Label: ${this.label}, Operations: ${JSON.stringify(this.operations)}`);
    }

    setVariableContext(context: VariableContext) {
        this.variableContext = context;
        this.blockContent.setVariableContext(context);
        
        // Propagar el contexto a los bloques hijos
        this.children.forEach(child => child.setVariableContext(context));
    }

    removeBlock(block: Block) {
        const index = this.children.indexOf(block);
        if (index !== -1) {
            this.children.splice(index, 1);
        }
    }

    clone(): Block {
        const clonedBlock = new Block();
        clonedBlock.id = Block._id++;
        clonedBlock.label = this.label;
        clonedBlock.pulse = this.pulse;
        clonedBlock.repeatingTimes = this.repeatingTimes;
        
        // Clonar blockContent
        const clonedContent = new BlockContent();
        clonedContent.notes = this.blockContent.notes;
        clonedContent.isVariable = this.blockContent.isVariable;
        clonedContent.variableName = this.blockContent.variableName;
        clonedBlock.blockContent = clonedContent;
        
        // Clonar commands
        clonedBlock.commands = this.commands.map(command => new Command({
            type: command.type,
            value: command.value,
            isVariable: command.isVariable
        }));
        
        // Clonar children recursivamente
        clonedBlock.children = this.children.map(child => child.clone());
        
        // Clonar operations
        clonedBlock.operations = this.operations.map(operation => {
            if (operation instanceof IncrementOperation) {
                return new IncrementOperation(operation.variableName, operation.value);
            } else if (operation instanceof DecrementOperation) {
                return new DecrementOperation(operation.variableName, operation.value);
            } else if (operation instanceof AssignOperation) {
                return new AssignOperation(operation.variableName, operation.value);
            } else {
                throw new Error(`Unknown operation type: ${operation.constructor.name}`);
            }
        });
        
        return clonedBlock;
    }

    toJSON() {
        return {
            commands: this.commands,
            children: this.children,
            blockContent: this.blockContent
        };
    }
}