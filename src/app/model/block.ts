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
        console.log('Initializing Block with input:', block);
        this.blockContent = new BlockContent();
        
        if (block instanceof Block) {
            // Si es un Block, copiar directamente sus propiedades
            this.id = Block._id++;
            this.label = block.label;
            this.commands = block.commands.map(command => new Command({
                type: command.type,
                value: command.value,
                isVariable: command.isVariable
            }));
            
            // Clonar blockContent
            const clonedContent = new BlockContent();
            clonedContent.notes = block.blockContent.notes;
            clonedContent.isVariable = block.blockContent.isVariable;
            clonedContent.variableName = block.blockContent.variableName;
            this.blockContent = clonedContent;
            
            this.pulse = block.pulse;
            this.repeatingTimes = Math.max(0, block.repeatingTimes);
            this.children = block.children.map(child => new Block(child));
            
            // Clonar operations
            this.operations = block.operations.map(operation => {
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
            
            console.log(`Cloned block with operations: ${JSON.stringify(this.operations)}`);
            return;
        }
        
        // Si es un objeto plano, construir normalmente
        if (block) {
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

    executeOperations(): void {
        if (!this.variableContext) {
            console.warn('No variable context available for executing operations');
            return;
        }

        console.log(`Executing operations for block ${this.id}:`, this.operations);
        this.operations.forEach(operation => {
            try {
                operation.execute(this.variableContext!);
                // Obtener el valor actual después de la operación para logging
                const currentValue = this.variableContext!.getValue(operation.variableName);
                console.log(`Operation executed: ${operation.constructor.name} on ${operation.variableName}, new value: ${currentValue}`);
            } catch (error) {
                console.error(`Error executing operation:`, error);
            }
        });
    }

    // Método para ejecutar el bloque
    execute(): void {
        if (this.variableContext) {
            // Ejecutar el bloque tantas veces como indique repeatingTimes
            for (let i = 0; i < this.repeatingTimes; i++) {
                // Ejecutar las operaciones al inicio de cada repetición
                this.executeOperations();
                
                // Ejecutar los comandos si es necesario
                // ... código existente para ejecutar comandos ...

                // Ejecutar bloques hijos si hay
                this.children.forEach(child => child.execute());
            }
        } else {
            console.warn('No variable context available for block execution');
        }
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