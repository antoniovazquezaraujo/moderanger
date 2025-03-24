import { BlockContent } from './block.content';
import { Command } from './command';
import { BaseOperation, IncrementOperation, DecrementOperation, AssignOperation } from './operation';
import { VariableContext } from './variable.context';

export class Block {
    static _id: number = 0;
    id: number = Block._id++;
    label: string = '';
    pulse: number = 0;
    repeatingTimes: number = 1;
    commands: Command[] = [];
    blockContent: BlockContent = new BlockContent();
    children: Block[] = [];
    operations: BaseOperation[] = [];

    constructor() {

        // if (block instanceof Block) {
        //     // Si es un Block, copiar directamente sus propiedades
        //     this.label = block.label;
        //     this.commands = block.commands.map(command => new Command({
        //         type: command.type,
        //         value: command.value,
        //         isVariable: command.isVariable
        //     }));

        //     // Clonar blockContent
        //     clonedContent.notes = block.blockContent.notes;
        //     clonedContent.isVariable = block.blockContent.isVariable;
        //     clonedContent.variableName = block.blockContent.variableName;
        //     this.blockContent = clonedContent;

        //     this.pulse = block.pulse;
        //     this.repeatingTimes = Math.max(0, block.repeatingTimes);
        //     this.children = block.children.map(child => new Block(child));

        //     // Clonar operations
        //     this.operations = block.operations.map(operation => {
        //         if (operation instanceof IncrementOperation) {
        //             return new IncrementOperation(operation.variableName, operation.value);
        //         } else if (operation instanceof DecrementOperation) {
        //             return new DecrementOperation(operation.variableName, operation.value);
        //         } else if (operation instanceof AssignOperation) {
        //             return new AssignOperation(operation.variableName, operation.value);
        //         } else {
        //             throw new Error(`Unknown operation type: ${operation.constructor.name}`);
        //         }
        //     });


        //     return;
        // }

        // Si es un objeto plano, construir normalmente
        // if (block) {
        //     this.label = block.label || '';
        //     this.commands = block.commands?.map((cmd: any) => new Command(cmd)) || [];
        //     this.children = block.children?.map((child: any) => new Block(child)) || [];
        //     this.operations = block.operations?.map((op: any) => {
        //         switch (op.type) {
        //             case 'INCREMENT':
        //                 return new IncrementOperation(op.variableName, op.value);
        //             case 'DECREMENT':
        //                 return new DecrementOperation(op.variableName, op.value);
        //             case 'ASSIGN':
        //                 return new AssignOperation(op.variableName, op.value);
        //             default:
        //                 throw new Error(`Unknown operation type: ${op.type}`);
        //         }
        //     }) || [];


        //     if (block.blockContent) {
        //         this.blockContent.notes = block.blockContent.notes || '';
        //         this.blockContent.isVariable = block.blockContent.isVariable || false;
        //         this.blockContent.variableName = block.blockContent.variableName || '';
        //     }
        //     this.pulse = block.pulse || 0;
        //     this.repeatingTimes = Math.max(0, block.repeatingTimes || 1);
        // }

    }


    executeBlockOperations(): void {
            this.operations.forEach(operation => {
                try {
                    operation.execute();
                } catch (error) {
                    console.error(`Error executing operation:`, error);
                }
            });
            this.children.forEach(child => child.executeBlockOperations());
    }

    removeBlock(block: Block) {
        const index = this.children.indexOf(block);
        if (index !== -1) {
            this.children.splice(index, 1);
        }
    }

    clone(): Block {
        const clonedBlock = new Block();
        clonedBlock.label = this.label;
        clonedBlock.pulse = this.pulse;
        clonedBlock.repeatingTimes = this.repeatingTimes;

        const clonedContent = new BlockContent();
        clonedContent.notes = this.blockContent.notes;
        clonedContent.isVariable = this.blockContent.isVariable;
        clonedContent.variableName = this.blockContent.variableName;
        clonedBlock.blockContent = clonedContent;

        clonedBlock.commands = this.commands.map(command => {
            const clonedCommand = new Command({
                type: command.type,
                isVariable: command.isVariable
            });
            
            // Si es una variable, usar el método getVariableName() para obtener el nombre de la variable
            if (command.isVariable) {
                const variableName = command.getVariableName();
                if (variableName) {
                    clonedCommand.setVariable(variableName);
                }
            } else {
                clonedCommand.setValue(command.value);
            }
            
            return clonedCommand;
        });

        clonedBlock.children = this.children.map(child => child.clone());

        clonedBlock.operations = this.operations.map(operation => {
            if (operation instanceof IncrementOperation) {
                // Garantizar que el valor sea numérico
                const numValue = typeof operation.value === 'number' ? operation.value : 
                    (parseInt(String(operation.value)) || 1);
                return new IncrementOperation(operation.variableName, numValue);
            } else if (operation instanceof DecrementOperation) {
                // Garantizar que el valor sea numérico
                const numValue = typeof operation.value === 'number' ? operation.value : 
                    (parseInt(String(operation.value)) || 1);
                return new DecrementOperation(operation.variableName, numValue);
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
            id: this.id,
            label: this.label,
            commands: this.commands,
            children: this.children,
            blockContent: this.blockContent,
            pulse: this.pulse,
            repeatingTimes: this.repeatingTimes,
            operations: this.operations.map(operation => {
                return {
                    type: operation instanceof IncrementOperation ? 'INCREMENT' :
                        operation instanceof DecrementOperation ? 'DECREMENT' :
                            operation instanceof AssignOperation ? 'ASSIGN' : 'UNKNOWN',
                    variableName: operation.variableName,
                    value: operation.value
                };
            })
        };
    }
}