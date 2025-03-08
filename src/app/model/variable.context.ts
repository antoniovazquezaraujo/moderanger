import { Subject } from 'rxjs';

export type ScaleType = 'WHITE' | 'BLUE' | 'RED' | 'BLACK' | 'PENTA' | 'TONES' | 'FULL';
export type VariableValue = number | string | ScaleType;

export class VariableContext {
    static context = new Map<string, VariableValue>();
    static onVariablesChange = new Subject<void>();
    
    // Implementación del patrón Singleton
    private static instance: VariableContext;
    
    static setValue(name: string, value: VariableValue): void {        
        VariableContext.context.set(name, value);
        VariableContext.onVariablesChange.next();        
    }

    static removeValue(name: string): void {
        VariableContext.context.delete(name);
        VariableContext.onVariablesChange.next();
    }

    static getValue(name: string): VariableValue | undefined {
        return VariableContext.context.get(name);
    }

    static hasValue(name: string): boolean {
        return VariableContext.context.has(name);
    }

}
