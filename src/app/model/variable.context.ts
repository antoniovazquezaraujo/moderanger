import { Subject } from 'rxjs';

export type VariableValue = number | string;

export class VariableContext {
    private variables = new Map<string, VariableValue>();
    onVariablesChange = new Subject<void>();

    setVariable(name: string, value: VariableValue): void {
        this.variables.set(name, value);
        this.onVariablesChange.next();
    }

    removeVariable(name: string): void {
        this.variables.delete(name);
        this.onVariablesChange.next();
    }

    getValue(name: string): VariableValue | undefined {
        return this.variables.get(name);
    }

    hasVariable(name: string): boolean {
        return this.variables.has(name);
    }

    getAllVariables(): Map<string, VariableValue> {
        return new Map(this.variables);
    }
}

export class BlockVariableContext extends VariableContext {
    private parent?: VariableContext;

    constructor(parent?: VariableContext) {
        super();
        this.parent = parent;
    }

    override getValue(name: string): VariableValue | undefined {
        return this.hasVariable(name) 
            ? super.getValue(name) 
            : this.parent?.getValue(name);
    }
} 