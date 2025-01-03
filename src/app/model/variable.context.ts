import { EventEmitter } from '@angular/core';

export type VariableValue = number | string;

export class VariableContext {
    private variables: Map<string, VariableValue> = new Map();
    public onVariablesChange = new EventEmitter<void>();

    setValue(name: string, value: VariableValue): void {
        this.variables.set(name, value);
        this.onVariablesChange.emit();
    }

    getValue(name: string): VariableValue | undefined {
        return this.variables.get(name);
    }

    hasVariable(name: string): boolean {
        return this.variables.has(name);
    }

    removeVariable(name: string): void {
        this.variables.delete(name);
        this.onVariablesChange.emit();
    }

    getAllVariables(): Map<string, VariableValue> {
        return new Map(this.variables);
    }

    clear(): void {
        this.variables.clear();
        this.onVariablesChange.emit();
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