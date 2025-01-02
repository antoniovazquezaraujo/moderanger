export type VariableValue = number | string;

export class VariableContext {
    private variables: Map<string, VariableValue> = new Map();

    setValue(name: string, value: VariableValue): void {
        this.variables.set(name, value);
    }

    getValue(name: string): VariableValue | undefined {
        return this.variables.get(name);
    }

    hasVariable(name: string): boolean {
        return this.variables.has(name);
    }

    clear(): void {
        this.variables.clear();
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