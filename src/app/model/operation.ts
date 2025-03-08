import { VariableContext } from './variable.context';

export enum OperationType {
    INCREMENT = 'INCREMENT',
    DECREMENT = 'DECREMENT',
    ASSIGN = 'ASSIGN'
}

export abstract class BaseOperation {
    variableName: string;
    value: number;

    constructor(variableName: string, value: number) {
        this.variableName = variableName;
        this.value = value;
    }

    abstract execute(): void;
}

export class IncrementOperation extends BaseOperation {
    execute(): void {
        const currentValue = VariableContext.getValue(this.variableName);
        if (currentValue === undefined || typeof currentValue !== 'number') {
            console.warn(`Variable ${this.variableName} is undefined or not a number.`);
            return;
        }
        const newValue = currentValue + this.value;
        VariableContext.setValue(this.variableName, newValue);
    }
}

export class DecrementOperation extends BaseOperation {
    execute(): void {
        const currentValue = VariableContext.getValue(this.variableName);
        if (currentValue === undefined || typeof currentValue !== 'number') {
            console.warn(`Variable ${this.variableName} is undefined or not a number.`);
            return;
        }
        VariableContext.setValue(this.variableName, currentValue - this.value);
    }
}

export class AssignOperation extends BaseOperation {
    execute(): void {
        VariableContext.setValue(this.variableName, this.value);
    }
}
