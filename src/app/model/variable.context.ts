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
        // En lugar de eliminar las variables, restauramos sus valores iniciales
        const variableBackup = new Map<string, VariableValue>();
        
        // Primero hacemos una copia de todas las variables y sus nombres
        // para mantener un registro de cuáles existen
        const variables = Array.from(VariableContext.context.entries());
        for (const [name, _] of variables) {
            variableBackup.set(name, null as any);
        }
        
        // Luego para cada variable, determinamos un valor inicial apropiado
        for (const [name, _] of variableBackup.entries()) {
            // El valor actual lo obtenemos del contexto original
            const currentValue = VariableContext.context.get(name);
            
            if (typeof currentValue === 'number') {
                VariableContext.setValue(name, 0); // Valores numéricos a 0
            } else if (typeof currentValue === 'string') {
                // Las escalas se mantienen como string
                if (['WHITE', 'BLUE', 'RED', 'BLACK', 'PENTA', 'TONES', 'FULL'].includes(currentValue)) {
                    VariableContext.setValue(name, 'WHITE');
                } 
                // Los modos de reproducción pueden ser string o números
                else if (['CHORD', 'ASCENDING', 'DESCENDING', 'RANDOM'].includes(currentValue)) {
                    VariableContext.setValue(name, 'CHORD');
                }
                // Para cualquier otro string
                else {
                    VariableContext.setValue(name, ''); 
                }
            }
        }
        
        VariableContext.onVariablesChange.next();
    }
}
