import { VariableContext } from './variable.context';
import { getPlayModeNames } from './play.mode';
import { Scale } from './scale';

export enum OperationType {
    VARY = 'VARY',
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

export class VaryOperation extends BaseOperation {
    constructor(variableName: string, value: number | string) {
        const step = typeof value === 'number' ? value : 1;
        super(variableName, step);
    }
    
    execute(): void {
        const currentValue = VariableContext.getValue(this.variableName);
        const playModeNames = getPlayModeNames();
        const scaleNames = Scale.getScaleNames();
        const step = typeof this.value === 'number' ? this.value : 1;

        if (currentValue === undefined) {
            console.warn(`   Variable ${this.variableName} is undefined. Aborting execute.`);
            return;
        }

        let newValue: string | number | undefined;

        if (typeof currentValue === 'string') {
            if (playModeNames.includes(currentValue)) {
                const currentIndex = playModeNames.indexOf(currentValue);
                const nextIndex = (currentIndex + step) % playModeNames.length;
                newValue = playModeNames[(nextIndex + playModeNames.length) % playModeNames.length];
            } else if (scaleNames.includes(currentValue)) {
                const currentIndex = scaleNames.indexOf(currentValue);
                const nextIndex = (currentIndex + step) % scaleNames.length;
                newValue = scaleNames[(nextIndex + scaleNames.length) % scaleNames.length];
            } else {
                console.warn(`   Cannot vary variable ${this.variableName}: String value '${currentValue}' is not recognized. Aborting execute.`);
                return;
            }
        } else if (typeof currentValue === 'number') {
            newValue = currentValue + step;
        } else {
            console.warn(`   Cannot vary variable ${this.variableName}: Unexpected value type '${typeof currentValue}'. Aborting execute.`);
            return;
        }

        if (newValue !== undefined) {
            VariableContext.setValue(this.variableName, newValue);
        } else {
        }
    }
}

export class AssignOperation extends BaseOperation {
    execute(): void {
        console.log(`AssignOperation: Asignando a ${this.variableName} el valor: ${this.value} (tipo: ${typeof this.value})`);
        VariableContext.setValue(this.variableName, this.value);
    }
}
