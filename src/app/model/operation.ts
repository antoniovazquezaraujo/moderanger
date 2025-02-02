import { VariableContext } from './variable.context';

export enum OperationType {
    INCREMENT = 'INCREMENT',
    DECREMENT = 'DECREMENT',
    ASSIGN = 'ASSIGN'
}
export class Operation {
    type: OperationType;
    variableName: string;
    value: number;

    constructor(type: OperationType, variableName: string, value: number) {
        this.type = type;
        this.variableName = variableName;
        this.value = value;
    }

    execute(context: VariableContext): void {
        const currentValue = context.getValue(this.variableName);
        if (currentValue === undefined || typeof currentValue !== 'number') {
            console.warn(`Variable ${this.variableName} is undefined or not a number.`);
            return;
        }
        switch (this.type) {
            case OperationType.INCREMENT:
                context.setVariable(this.variableName, currentValue + this.value);
                break;
            case OperationType.DECREMENT:
                context.setVariable(this.variableName, currentValue - this.value);
                break;
            case OperationType.ASSIGN:
                context.setVariable(this.variableName, this.value);
                break;
        }
    }
}
