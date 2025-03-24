import { VariableContext } from './variable.context';

export enum OperationType {
    INCREMENT = 'INCREMENT',
    DECREMENT = 'DECREMENT',
    ASSIGN = 'ASSIGN'
}

export abstract class BaseOperation {
    variableName: string;
    value: string | number;

    constructor(variableName: string, value: string | number) {
        this.variableName = variableName;
        this.value = value;
    }

    abstract execute(): void;
}

export class IncrementOperation extends BaseOperation {
    constructor(variableName: string, value: number) {
        super(variableName, value);
    }
    
    execute(): void {
        const currentValue = VariableContext.getValue(this.variableName);
        if (currentValue === undefined || typeof currentValue !== 'number') {
            console.warn(`Variable ${this.variableName} is undefined or not a number.`);
            return;
        }
        const newValue = currentValue + (typeof this.value === 'number' ? this.value : 0);
        VariableContext.setValue(this.variableName, newValue);
    }
}

export class DecrementOperation extends BaseOperation {
    constructor(variableName: string, value: number) {
        super(variableName, value);
    }
    
    execute(): void {
        const currentValue = VariableContext.getValue(this.variableName);
        if (currentValue === undefined || typeof currentValue !== 'number') {
            console.warn(`Variable ${this.variableName} is undefined or not a number.`);
            return;
        }
        VariableContext.setValue(this.variableName, currentValue - (typeof this.value === 'number' ? this.value : 0));
    }
}

export class AssignOperation extends BaseOperation {
    execute(): void {
        console.log(`AssignOperation: Asignando a ${this.variableName} el valor: ${this.value} (tipo: ${typeof this.value})`);
        VariableContext.setValue(this.variableName, this.value);
    }
}
