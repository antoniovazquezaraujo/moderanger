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
        console.log(`[VaryOperation EXECUTE START] Variable: ${this.variableName}`);
        const currentValue = VariableContext.getValue(this.variableName);
        const playModeNames = getPlayModeNames();
        const scaleNames = Scale.getScaleNames();
        const step = typeof this.value === 'number' ? this.value : 1;

        console.log(`  -> Current Value: ${currentValue} (Type: ${typeof currentValue})`);
        console.log(`  -> Step Value: ${step}`);

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
                console.log(`   Calculated PlayMode New Value: ${newValue}`);
            } else if (scaleNames.includes(currentValue)) {
                const currentIndex = scaleNames.indexOf(currentValue);
                const nextIndex = (currentIndex + step) % scaleNames.length;
                newValue = scaleNames[(nextIndex + scaleNames.length) % scaleNames.length];
                console.log(`   Calculated Scale New Value: ${newValue}`);
            } else {
                console.warn(`   Cannot vary variable ${this.variableName}: String value '${currentValue}' is not recognized. Aborting execute.`);
                return;
            }
        } else if (typeof currentValue === 'number') {
            newValue = currentValue + step;
            console.log(`   Calculated Number New Value: ${newValue}`);
        } else {
            console.warn(`   Cannot vary variable ${this.variableName}: Unexpected value type '${typeof currentValue}'. Aborting execute.`);
            return;
        }

        if (newValue !== undefined) {
            console.log(`   Attempting to set Variable ${this.variableName} to ${newValue}`);
            VariableContext.setValue(this.variableName, newValue);
            console.log(`[VaryOperation EXECUTE END] Variable ${this.variableName} set.`);
        } else {
            console.log(`[VaryOperation EXECUTE END] No new value calculated. Variable ${this.variableName} not set.`);
        }
    }
}

export class AssignOperation extends BaseOperation {
    execute(): void {
        console.log(`AssignOperation: Asignando a ${this.variableName} el valor: ${this.value} (tipo: ${typeof this.value})`);
        VariableContext.setValue(this.variableName, this.value);
    }
}
