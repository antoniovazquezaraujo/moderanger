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
     * Reinicia todas las variables a sus valores iniciales.
     * Útil para limpiar las variables cuando se detiene la reproducción.
     * 
     * En lugar de eliminar las variables, restaura sus valores a 0, '' o valores predeterminados
     * según su tipo.
     */
    static resetAll(): void {
        console.log("[VariableContext] resetAll() CALLED");
        const variableBackup = new Map<string, VariableValue>();
        
        const variables = Array.from(VariableContext.context.entries());
        for (const [name, _] of variables) {
            variableBackup.set(name, null as any);
        }
        
        for (const [name, _] of variableBackup.entries()) {
            const currentValue = VariableContext.context.get(name);
            
            // Comentar o eliminar el reinicio para variables numéricas
            // if (typeof currentValue === 'number') {
            //     VariableContext.setValue(name, 0);
            // }
            
            if (typeof currentValue === 'string') {
                // Solo reiniciamos variables de playmode
                if (['CHORD', 'ASCENDING', 'DESCENDING', 'RANDOM'].includes(currentValue)) {
                    VariableContext.setValue(name, 'CHORD');
                }
            }
        }
        
        VariableContext.onVariablesChange.next();
    }
}
