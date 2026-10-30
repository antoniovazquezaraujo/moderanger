import { BlockContent } from './block.content';
import { cloneCommand, Command } from './command';
import { AssignOperation, BaseOperation, cloneOperation, VaryOperation } from './operation';

export class Block {
    static _id: number = 0;
    id: number = Block._id++;
    /** Discriminador de la unión `PartItem` (`Block | BlockReference`). */
    readonly kind: 'block' = 'block';
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


    /**
     * `true` si el bloque tiene contenido propio que merece una fila visible
     * (label, notas, `notes default` u operaciones). Un bloque sin contenido
     * actúa como contenedor: la GUI pinta únicamente a sus hijos.
     */
    hasOwnContent(): boolean {
        const notes = this.blockContent?.notes ?? '';
        const defaultDuration = this.blockContent?.defaultDuration ?? '';
        return (
            (this.label ?? '').trim() !== '' ||
            notes.trim() !== '' ||
            defaultDuration.trim() !== '' ||
            (this.commands?.length ?? 0) > 0 ||
            (this.operations?.length ?? 0) > 0
        );
    }

    executeBlockOperations(): void {
            this.operations.forEach(operation => {
                try {
                    operation.execute();
                } catch (error) {
                    console.error(`Error executing operation:`, error);
                }
            });
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
        if (this.blockContent.isVariable) {
            // Sin suscripción a VariableContext: el clon no debe observar el estado global.
            clonedContent.setVariableReference(this.blockContent.variableName);
        } else {
            clonedContent.notes = this.blockContent.notes;
        }
        clonedContent.defaultDuration = this.blockContent.defaultDuration;
        clonedBlock.blockContent = clonedContent;

        clonedBlock.commands = this.commands.map(cloneCommand);

        clonedBlock.children = this.children.map(child => child.clone());

        clonedBlock.operations = this.operations.map(cloneOperation);
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
                    type: operation instanceof VaryOperation ? 'VARY' :
                        operation instanceof AssignOperation ? 'ASSIGN' : 'UNKNOWN',
                    variableName: operation.variableName,
                    value: operation.value
                };
            })
        };
    }
}