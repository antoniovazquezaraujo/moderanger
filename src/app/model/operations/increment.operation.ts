import { VariableContext } from '../variable.context';

export class IncrementOperation {
    variableName: string;
    incrementValue: number;

    constructor(variableName: string, incrementValue: number) {
        this.variableName = variableName;
        this.incrementValue = incrementValue;
    }

    execute(variableContext: VariableContext): void {
        console.log(`Executing IncrementOperation on variable ${this.variableName}`);
        
        // Asegurarse de que se use el Singleton de VariableContext
        const sharedContext = VariableContext.getInstance();
        
        // Verificar que el contexto pasado sea el mismo que el Singleton
        if (variableContext !== sharedContext) {
            console.warn(`Warning: Variable context passed to IncrementOperation is not the Singleton instance`);
            variableContext = sharedContext;
        }
        
        // Obtener el valor actual antes de incrementar
        const oldValue = variableContext.getValue(this.variableName);
        console.log(`Current value of ${this.variableName} before increment: ${oldValue}`);
        
        // Incrementar el valor
        variableContext.setVariable(this.variableName, oldValue + this.incrementValue);
        
        // Obtener el nuevo valor para logging
        const newValue = variableContext.getValue(this.variableName);
        console.log(`New value of ${this.variableName} after increment: ${newValue}`);
        console.log(`All variables after increment:`, 
                    Array.from(variableContext.getAllVariables().entries()));
    }
} 