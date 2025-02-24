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

    abstract execute(context: VariableContext): void;
}

export class IncrementOperation extends BaseOperation {
    execute(context: VariableContext): void {
        const currentValue = context.getValue(this.variableName);
        console.log(`Executing IncrementOperation for variable: ${this.variableName}, current value: ${currentValue}`);
        if (currentValue === undefined || typeof currentValue !== 'number') {
            console.warn(`Variable ${this.variableName} is undefined or not a number.`);
            return;
        }
        const newValue = currentValue + this.value;
        context.setVariable(this.variableName, newValue);
        console.log(`Variable ${this.variableName} incremented to: ${newValue}`);
    }
}

export class DecrementOperation extends BaseOperation {
    execute(context: VariableContext): void {
        const currentValue = context.getValue(this.variableName);
        if (currentValue === undefined || typeof currentValue !== 'number') {
            console.warn(`Variable ${this.variableName} is undefined or not a number.`);
            return;
        }
        context.setVariable(this.variableName, currentValue - this.value);
        console.log(`Variable ${this.variableName} decremented to: ${context.getValue(this.variableName)}`);
    }
}

export class AssignOperation extends BaseOperation {
    execute(context: VariableContext): void {
        context.setVariable(this.variableName, this.value);
    }
}

// Usage example:
// const operation = new IncrementOperation('x', 5);
// operation.execute(context);
