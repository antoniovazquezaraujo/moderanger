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

    /**
     * Copia del estado actual de las variables. La usa la reproducción para
     * restaurar al parar el estado previo al Play (las operaciones no se
     * acumulan entre reproducciones). Los valores son primitivos: basta con un
     * `Map` nuevo.
     */
    static snapshot(): Map<string, VariableValue> {
        return new Map(VariableContext.context);
    }

    /**
     * Restaura un snapshot: repone sus valores y elimina las claves que se
     * añadieron después. Sin snapshot no hace nada (parada sin Play). Es
     * idempotente: si el estado ya coincide, no emite ningún cambio.
     */
    static restore(snapshot: Map<string, VariableValue> | null): void {
        if (!snapshot || VariableContext.matches(snapshot)) {
            return;
        }
        VariableContext.context.clear();
        snapshot.forEach((value, name) => VariableContext.context.set(name, value));
        VariableContext.onVariablesChange.next();
    }

    /** `true` si el contexto actual coincide exactamente con el snapshot. */
    private static matches(snapshot: Map<string, VariableValue>): boolean {
        if (VariableContext.context.size !== snapshot.size) {
            return false;
        }
        for (const [name, value] of snapshot) {
            if (VariableContext.context.get(name) !== value) {
                return false;
            }
        }
        return true;
    }
}
