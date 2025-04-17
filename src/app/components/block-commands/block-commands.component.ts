import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command, CommandType } from 'src/app/model/command';
import { OperationType } from 'src/app/model/operation';
import { getPlayModeNames, PlayMode, getPlayModeFromString } from 'src/app/model/play.mode';
import { Scale } from 'src/app/model/scale';
import { VariableContext } from 'src/app/model/variable.context';
import { Subscription } from 'rxjs';
import { IncrementOperation, DecrementOperation, AssignOperation } from 'src/app/model/operation';
import { MelodyEditorService } from 'src/app/services/melody-editor.service';
import { SongPlayer } from 'src/app/model/song.player';
import { NoteDuration } from 'src/app/model/melody';

interface VariableOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-block-commands',
    templateUrl: './block-commands.component.html',
    styleUrls: ['./block-commands.component.scss']
})
export class BlockCommandsComponent implements OnInit, OnChanges, OnDestroy {
    @Input() block: Block = new Block();

    commandTypeNames: string[] = [];
    commandTypes = CommandType;
    playModeNames: string[];
    scaleNames: string[];
    availableVariables: VariableOption[] = [];
    private variablesSubscription?: Subscription;
    private commandBeingConverted: Command | null = null;
    operationTypes = OperationType;
    operationTypeNames: string[] = Object.values(OperationType);
    selectedElementType: 'command' | 'operation' = 'command';
    selectedOperationType: OperationType | null = null;
    showOperationControls: boolean = false;
    selectedVariable: string | null = null;
    selectedValue: string | null = null;
    
    // Editor de melodías
    showMelodyEditorFor: string = '';

    // Initialize operations array
    operations: { type: OperationType, variableName: string, value: string | number }[] = [];

    operationDropdownOptions = this.operationTypeNames.map(type => ({ label: type, value: type }));
    currentDefaultDuration: NoteDuration = '4n';
    private durationSubscription?: Subscription;

    constructor(
        private cdr: ChangeDetectorRef, 
        private songPlayer: SongPlayer
        ) {         
        this.playModeNames = getPlayModeNames();
        this.scaleNames = Scale.getScaleNames();
        console.log('Scale names initialized in constructor:', this.scaleNames);
    }

    ngOnInit(): void {
        console.log('BlockCommandsComponent initialized with block:', this.block);
        
        // Asegurar que scaleNames esté inicializado correctamente
        if (!this.scaleNames || this.scaleNames.length === 0) {
            this.scaleNames = Scale.getScaleNames();
            console.log('Scale names initialized in ngOnInit:', this.scaleNames);
        }
        
        this.commandTypeNames = Object.values(CommandType);
        this.operationTypeNames = Object.values(OperationType);
        
        this.updateAvailableVariables();
        this.subscribeToVariableChanges();
        
        this.initializeOperationsFromBlock();
        
        this.selectedOperationType = this.operationTypeNames[0] as OperationType;
        
        // Subscribe to global duration changes
        this.durationSubscription = this.songPlayer.globalDefaultDuration$.subscribe(duration => {
            this.currentDefaultDuration = duration;
            console.log(`[BlockCommands] Global duration updated to: ${duration}`);
            this.cdr.detectChanges();
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['block'] && !changes['block'].firstChange) {
            console.log('Block changed:', changes['block'].currentValue);
            this.initializeOperationsFromBlock();
        }
        this.cdr.detectChanges();
    }

    ngOnDestroy(): void {
        if (this.variablesSubscription) {
            this.variablesSubscription.unsubscribe();
        }
        if (this.durationSubscription) {
            this.durationSubscription.unsubscribe();
        }
    }

    private subscribeToVariableChanges(): void {
        if (this.variablesSubscription) {
            this.variablesSubscription.unsubscribe();
        }
        
        this.variablesSubscription = VariableContext.onVariablesChange.subscribe(() => {
            this.updateAvailableVariables();
            
            // Actualizar blockContent si usa variable
            if (this.block.blockContent.isVariable && this.block.blockContent.variableName) {
                const value = VariableContext.getValue(this.block.blockContent.variableName);
                if (typeof value === 'string') {
                    this.block.blockContent.notes = value;
                }
            }
            
            // Actualizar todos los comandos que usan variables
            if (this.block.commands) {
                this.block.commands.forEach(command => {
                    if (command.isVariable && command.getVariableName()) {
                        // Esto fuerza al UI a actualizar el selector
                        const currentVarName = command.getVariableName();
                        if (currentVarName && VariableContext.context.has(currentVarName)) {
                            // Reafirmar el valor actual para refrescar la UI
                            command.setVariable(currentVarName);
                        }
                    }
                });
            }
            
            this.cdr.detectChanges();
        });
    }

    private updateAvailableVariables(): void {
        const variables = VariableContext.context;
        // Preservar las variables seleccionadas actualmente
        const currentVariableSelections = new Map();
        
        // Guardar las variables seleccionadas de las operaciones
        this.operations.forEach(op => {
            if (op.variableName) {
                currentVariableSelections.set(op.variableName, true);
            }
        });
        
        // Guardar las variables seleccionadas de los comandos
        this.block.commands.forEach(cmd => {
            if (cmd.isVariable && cmd.getVariableName()) {
                currentVariableSelections.set(cmd.getVariableName(), true);
            }
        });
        
        // Actualizar la lista de variables disponibles
        this.availableVariables = Array.from(variables.entries())
            .map(([name, value]) => ({
                label: `${name} (${value})`,
                value: name
            }));

        // Si no hay variable seleccionada pero hay variables disponibles, seleccionar la primera
        if (!this.selectedVariable && this.availableVariables.length > 0) {
            this.selectedVariable = this.availableVariables[0].value;
        }
        
        this.cdr.detectChanges();
    }

    removeCommand(command: Command): void {
        if (this.block.commands) {
            this.block.commands = this.block.commands.filter(t => t !== command);
        }
    }

    addElement(type: 'command' | 'operation'): void {
        console.log('addElement called with type:', type);
        if (type === 'command') {
            if (!this.block.commands) {
                this.block.commands = [];
            }
            const newCommand = new Command();
            newCommand.type = CommandType.OCT;
            newCommand.setValue(0);
            this.block.commands.push(newCommand);
            this.cdr.detectChanges();
        } else if (type === 'operation') {
            
            if (!this.selectedOperationType) {
                this.selectedOperationType = OperationType.INCREMENT;
            }
            
            if (!this.selectedVariable && this.availableVariables.length > 0) {
                this.selectedVariable = this.availableVariables[0].value;
            }

            let initialValue: string | number = 1; // Valor por defecto para INCREMENT/DECREMENT
            
            // Para ASSIGN, inicializar con el valor adecuado según el tipo de variable
            if (this.selectedOperationType === OperationType.ASSIGN && this.selectedVariable) {
                if (this.isVariableOfType(this.selectedVariable, 'melody')) {
                    initialValue = '1 2 3'; // Valor por defecto para melodías
                } else if (this.isVariableOfType(this.selectedVariable, 'scale')) {
                    initialValue = this.scaleNames[0] || 'WHITE'; // Valor por defecto para escalas
                } else if (this.isVariableOfType(this.selectedVariable, 'number')) {
                    initialValue = 0; // Valor por defecto para números
                }
            }

            const newOperation = { 
                type: this.selectedOperationType || OperationType.INCREMENT, 
                variableName: this.selectedVariable || '', 
                value: initialValue
            };
            
            if (!this.operations) {
                this.operations = [];
            }
            
            this.operations = [...this.operations, newOperation];
            
            this.updateBlockOperations();
            
            console.log('Added new operation:', newOperation);
            console.log('Current operations:', this.operations);
            this.cdr.detectChanges();
        }
    }

    private updateBlockOperations(): void {
        if (!this.block.operations) {
            this.block.operations = [];
        }
        
        this.block.operations = this.operations.map(op => {
            const variableName = op.variableName || '';
            
            // Si estamos asignando a una variable de tipo melody, el valor debe ser una cadena
            if (op.type === OperationType.ASSIGN) {
                if (this.isVariableOfType(variableName, 'melody')) {
                    // Asegurarse de que el valor sea una cadena para melodías
                    const melodyValue = typeof op.value === 'string' ? op.value : String(op.value || '');
                    return new AssignOperation(variableName, melodyValue);
                } else if (this.isVariableOfType(variableName, 'scale')) {
                    // Asegurarse de que el valor sea una cadena para escalas
                    const scaleValue = typeof op.value === 'string' ? op.value : String(op.value || '');
                    return new AssignOperation(variableName, scaleValue);
                }
            }
            
            // Para el resto de los casos, seguir con la lógica original
            switch (op.type) {
                case OperationType.INCREMENT:
                    // Asegurarse de que el valor sea numérico para incremento
                    const incValue = typeof op.value === 'number' ? op.value : (parseInt(String(op.value)) || 1);
                    return new IncrementOperation(variableName, incValue);
                case OperationType.DECREMENT:
                    // Asegurarse de que el valor sea numérico para decremento
                    const decValue = typeof op.value === 'number' ? op.value : (parseInt(String(op.value)) || 1);
                    return new DecrementOperation(variableName, decValue);
                case OperationType.ASSIGN:
                    return new AssignOperation(variableName, op.value || 0);
                default:
                    throw new Error(`Unknown operation type: ${op.type}`);
            }
        });
    }

    removeOperation(index: number): void {
        this.operations = this.operations.filter((_, i) => i !== index);
        this.updateBlockOperations();
        this.cdr.detectChanges();
    }

    toggleVariableMode(command: Command, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        
        const wasVariable = command.isVariable;
        const oldValue = command.value;
        
        command.isVariable = !wasVariable;
        
        if (!wasVariable && this.availableVariables.length > 0) {
            // Cambiando a variable
            this.commandBeingConverted = command;
            
            // Determinar el tipo basado en el comando actual
            if (command.type === CommandType.PLAYMODE) {
                // Filtrar solo variables de tipo playmode
                this.updateAvailableVariables();
                const playModeVariables = this.availableVariables.filter(v => {
                    const value = VariableContext.getValue(v.value);
                    return typeof value === 'string' && this.playModeNames.includes(value as string);
                });
                
                if (playModeVariables.length > 0) {
                    command.setVariable(playModeVariables[0].value);
                }
            } else if (command.type === CommandType.SCALE) {
                // Filtrar solo variables de tipo scale
                this.updateAvailableVariables();
                const scaleVariables = this.availableVariables.filter(v => {
                    const value = VariableContext.getValue(v.value);
                    return typeof value === 'string' && this.scaleNames.includes(value as string);
                });
                
                if (scaleVariables.length > 0) {
                    command.setVariable(scaleVariables[0].value);
                }
            } else if (command.type === CommandType.PATTERN) {
                // Filtrar solo variables de tipo pattern
                this.updateAvailableVariables();
                const patternVariables = this.availableVariables.filter(v => {
                    const value = VariableContext.getValue(v.value);
                    return typeof value === 'string' && /[0-9]/.test(value);
                });
                
                if (patternVariables.length > 0) {
                    command.setVariable(patternVariables[0].value);
                }
            } else {
                // Filtrar solo variables numéricas
                this.updateAvailableVariables();
                const numericVariables = this.availableVariables.filter(v => {
                    const value =VariableContext.getValue(v.value);
                    return typeof value === 'number';
                });
                
                if (numericVariables.length > 0) {
                    command.setVariable(numericVariables[0].value);
                }
            }
            
            this.commandBeingConverted = null;
        } else if (wasVariable) {
            // Cambiando de variable a valor normal
            if (typeof oldValue === 'string') {
                if (command.type === CommandType.PLAYMODE) {
                    command.setValue(this.playModeNames[0]);
                } else if (command.type === CommandType.SCALE) {
                    command.setValue(this.scaleNames[0]);
                } else if (command.type === CommandType.PATTERN) {
                    command.setValue('');
                } else {
                    const numValue = VariableContext.getValue(oldValue);
                    command.setValue(typeof numValue === 'number' ? numValue : 0);
                }
            } else {
                if (command.type === CommandType.PLAYMODE) {
                    command.setValue(this.playModeNames[0]);
                } else if (command.type === CommandType.SCALE) {
                    command.setValue(this.scaleNames[0]);
                } else if (command.type === CommandType.PATTERN) {
                    command.setValue('');
                } else {
                    command.setValue(0);
                }
            }
        }
        this.cdr.detectChanges();
    }

    handleValueInput(event: any, command: Command): void {
        try {
            if (command.isVariable) {
                if (event === null) {
                    command.isVariable = false;
                    command.setValue(0);
                } else {
                    const variableName = typeof event === 'object' ? event.value : event;
                    command.setVariable(variableName);
                }
            } else {
                const value = typeof event === 'object' ? event.target?.value : event;
                console.log(`[BlockCommands] Setting command ${command.type} value to:`, value);
                command.setValue(value);
            }
            this.cdr.detectChanges();
        } catch (error) {
            console.error('Error handling value input:', error);
            command.setValue(0);
            command.isVariable = false;
            this.cdr.detectChanges();
        }
    }

    getSelectedValue(command: Command): string | null {
        try {
            if (command.isVariable) {
                // Obtener el nombre de la variable sin el prefijo $
                const varName = command.getVariableName();
                // Siempre devolver el nombre de la variable si existe
                if (varName) {
                    return varName;
                }
            }
            
            // Para PlayMode, convertimos el valor numérico a string para mostrar en UI
            if (command.type === CommandType.PLAYMODE && typeof command.value === 'number') {
                return PlayMode[command.value as number];
            }
            
            return '';
        } catch (error) {
            console.error('Error getting selected value:', error);
            return '';
        }
    }

    getFilteredVariables(command: Command): VariableOption[] {

        return this.availableVariables.filter(v => {
            const value = VariableContext.getValue(v.value);
            if (command.type === CommandType.PLAYMODE) {
                return typeof value === 'string' && this.playModeNames.includes(value);
            } else if (command.type === CommandType.SCALE) {
                return typeof value === 'string' && this.scaleNames.includes(value);
            } else if (command.type === CommandType.PATTERN) {
                return typeof value === 'string' && /[0-9]/.test(value);
            } else {
                return typeof value === 'number';
            }
        });
    }

    getMelodyVariables(): VariableOption[] {

        return Array.from(VariableContext.context.entries())
            .filter(([_, value]) => {
                if (typeof value !== 'string') return false;
                if (this.playModeNames.includes(value)) return false;
                return /[0-9]/.test(value);
            })
            .map(([name, value]) => ({
                label: `${name} (${value})`,
                value: name
            }));
    }

    toggleMelodyVariable(event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        const wasVariable = this.block.blockContent.isVariable;
        
        this.block.blockContent.isVariable = !wasVariable;
        
        if (!wasVariable) {
            const melodyVars = this.getMelodyVariables();
            if (melodyVars.length > 0) {
                this.block.blockContent.variableName = melodyVars[0].value;
                const value = VariableContext.getValue(melodyVars[0].value);
                if (typeof value === 'string') {
                    this.block.blockContent.notes = value;
                }
            } else {
                this.block.blockContent.isVariable = false;
            }
        } else {
            const currentNotes = this.block.blockContent.notes;
            this.block.blockContent.variableName = '';
            this.block.blockContent.notes = currentNotes;
        }
    }

    onVariableSelected(value: string): void {
        console.log('Variable selected:', value);
        this.selectedVariable = value;
        
        // Para cada operación que usa esta variable, ajustar el valor según el tipo
        this.operations.forEach(op => {
            if (op.variableName === value && op.type === OperationType.ASSIGN) {
                // Ajustar el valor según el tipo de variable
                if (this.isVariableOfType(value, 'melody')) {
                    // Si es una melodía, asegurarse de que el valor sea una cadena
                    if (typeof op.value !== 'string' || !/^[\s\d]+$/.test(op.value)) {
                        op.value = '1 2 3'; // Valor por defecto para melodías
                    }
                } else if (this.isVariableOfType(value, 'scale')) {
                    // Si es una escala, asegurarse de que el valor sea una de las escalas válidas
                    if (typeof op.value !== 'string' || !this.scaleNames.includes(op.value)) {
                        op.value = this.scaleNames[0] || 'WHITE'; // Valor por defecto para escalas
                    }
                } else if (this.isVariableOfType(value, 'number')) {
                    // Si es un número, asegurarse de que el valor sea numérico
                    if (typeof op.value !== 'number') {
                        op.value = 0;
                    }
                }
            }
        });
        
        this.updateBlockOperations();
        this.cdr.detectChanges();
    }

    handleMelodyVariableChange(variableName: string): void {
        if (!variableName) {
            this.block.blockContent.notes = '';
            return;
        }

        const value =VariableContext.getValue(variableName);
        if (typeof value === 'string') {
            this.block.blockContent.notes = value;
            this.block.blockContent.variableName = variableName;
        }
    }

    handleNotesChange(notes: string): void {
        if (this.block.blockContent.isVariable && this.block.blockContent.variableName) {
            VariableContext.setValue(this.block.blockContent.variableName, notes);
        }
    }

    onCommandTypeChange(command: Command | OperationType): void {
        if (command instanceof Command && command.type === this.commandTypes.OCT) {
            command.isVariable = true;
            const numericVariables = this.getFilteredVariables(command);
            if (numericVariables.length > 0) {
                command.setVariable(numericVariables[0].value);
            }
        } else if (typeof command === 'string' && command === this.operationTypes.INCREMENT) {
            const variableName = this.selectedVariable;
            if ( variableName) {
                const currentValue = VariableContext.getValue(variableName);
                if (typeof currentValue === 'number') {
                    VariableContext.setValue(variableName, currentValue + 1);
                }
            }
        }
    }

    addOperation(): void {
        this.operations.push({ type: OperationType.INCREMENT, variableName: '', value: 0 });
    }

    isCommand(element: any): boolean {
        return element instanceof Command;
    }

    isOperation(element: any): boolean {
        return typeof element === 'object' && 'type' in element && element.type in this.operationTypes;
    }

    onOperationTypeChange(): void {
        console.log('Operation type changed');
        
        // Ajustar valores por defecto según el tipo de operación
        this.operations.forEach(op => {
            // Si es una operación ASSIGN para una variable de tipo melody, asegurar que el valor sea un string
            if (op.type === OperationType.ASSIGN && this.isVariableOfType(op.variableName, 'melody')) {
                if (typeof op.value !== 'string') {
                    op.value = '1 2 3'; // Valor por defecto para melodías
                }
            } 
            // Si es una operación ASSIGN para una variable de tipo scale, asegurar que el valor sea un string válido de escala
            else if (op.type === OperationType.ASSIGN && this.isVariableOfType(op.variableName, 'scale')) {
                if (typeof op.value !== 'string' || !this.scaleNames.includes(op.value)) {
                    op.value = this.scaleNames[0] || 'WHITE'; // Valor por defecto para escalas
                }
            }
            // Para operaciones INCREMENT/DECREMENT, asegurar que el valor sea un número
            else if ((op.type === OperationType.INCREMENT || op.type === OperationType.DECREMENT) && 
                     typeof op.value !== 'number') {
                op.value = parseInt(String(op.value)) || 1;
            }
        });
        
        this.updateBlockOperations();
        this.cdr.detectChanges();
    }

    logSelectedVariableChange(event: any): void {
        console.log('Dropdown change event triggered:', event);
        console.log('Selected Variable changed:', event);
        this.selectedVariable = event;
        console.log('Updated selectedVariable:', this.selectedVariable);
    }

    private initializeOperationsFromBlock(): void {
        console.log('Initializing operations from block:', this.block.operations);
        if (!this.block.operations || this.block.operations.length === 0) {
            // Si no hay operaciones, mantener el array vacío
            this.operations = [];
            return;
        }
        
        // Crear un mapa de las operaciones actuales para preservar sus valores
        const currentOperationsMap = new Map();
        this.operations.forEach(op => {
            const key = `${op.type}-${op.variableName}`;
            currentOperationsMap.set(key, op);
        });

        this.operations = this.block.operations.map(operation => {
            const type = operation instanceof IncrementOperation ? OperationType.INCREMENT :
                  operation instanceof DecrementOperation ? OperationType.DECREMENT :
                  OperationType.ASSIGN;
                  
            // Intentar encontrar una operación actual que coincida para preservar sus valores
            const key = `${type}-${operation.variableName}`;
            const existingOp = currentOperationsMap.get(key);
            
            return {
                type: type,
                variableName: operation.variableName,
                value: operation.value
            };
        });
        
        console.log('Initialized operations:', this.operations);
        this.cdr.detectChanges();
    }

    getPlayModeString(command: Command): string {
        if (command.type === CommandType.PLAYMODE) {
            const numValue = command.value as number;
            // Convertir el valor numérico a nombre del enum
            return PlayMode[numValue] || '';
        }
        return '';
    }

    setPlayModeFromString(modeString: string, command: Command): void {
        if (command.type === CommandType.PLAYMODE) {
            // Convertir el nombre a valor numérico usando la función existente
            const modeValue = getPlayModeFromString(modeString);
            command.setValue(modeValue);
            this.cdr.detectChanges();
        }
    }

    isVariableOfType(variableName: string, type: 'number' | 'playmode' | 'melody' | 'scale'): boolean {
        if (!variableName) return false;
        
        const value = VariableContext.getValue(variableName);
        
        // Verificar si el valor está definido
        if (value === undefined) {
            console.log(`Variable ${variableName} no tiene valor definido`);
            return false;
        }
        
        // Obtener todas las variables para depuración
        const allVariables = Array.from(VariableContext.context.entries());
        console.log('All variables:', allVariables);
        
        console.log(`Checking if ${variableName} (value: ${value}, type: ${typeof value}) is of type ${type}`);
        
        if (type === 'scale') {
            console.log('ScaleNames:', this.scaleNames);
            
            // Verificar si es una escala válida comprobando si su valor está en la lista de nombres de escala
            if (typeof value === 'string' && this.scaleNames.includes(value)) {
                console.log(`✅ ${variableName} ES una variable de tipo scale`);
                return true;
            } else {
                console.log(`❌ ${variableName} NO es una variable de tipo scale`);
                return false;
            }
        }
        
        // Resto de los tipos
        if (type === 'number') {
            return typeof value === 'number';
        } else if (type === 'playmode') {
            const playModeNames = ['CHORD', 'ASCENDING', 'DESCENDING', 'RANDOM'];
            return typeof value === 'string' && playModeNames.includes(value);
        } else if (type === 'melody') {
            // Melody es una cadena que contiene solo dígitos y espacios
            return typeof value === 'string' && /^[\s\d]+$/.test(value);
        }
        
        return false;
    }

    onOperationValueChange(operation: any, event: any): void {
        console.log('Operation value changed:', operation, 'New value:', event);
        
        // Para los inputs de tipo number, extraer el valor numérico
        if (event && event.target && typeof event.target.value !== 'undefined') {
            if (this.isVariableOfType(operation.variableName, 'melody')) {
                // Para melodías, asegurarse de que sea un string
                operation.value = String(event.target.value);
            } else {
                // Para otros tipos, convertir a número si es posible
                const numValue = parseFloat(event.target.value);
                operation.value = isNaN(numValue) ? 0 : numValue;
            }
        } else {
            // Si el evento no tiene target (por ejemplo, para [(ngModel)]), usarlo directamente
            operation.value = event;
        }
        
        // Actualizar las operaciones del bloque
        this.updateBlockOperations();
        this.cdr.detectChanges();
    }

    logDebug(value: string): string {
        console.log(value);
        return '';
    }

    // Métodos para el editor de melodías
    toggleMelodyEditor(operation: any): void {
        if (this.showMelodyEditorFor === operation.variableName) {
            this.closeMelodyEditor();
        } else {
            this.showMelodyEditorFor = operation.variableName;
        }
    }

    closeMelodyEditor(): void {
        this.showMelodyEditorFor = '';
    }

    onMelodyChange(newValue: string, operation: any): void {
        operation.value = newValue;
        this.onOperationValueChange(operation, newValue);
    }

    isBlockVariableMelody(): boolean {
        if (!this.block.blockContent.variableName) return false;
        
        return this.isVariableOfType(this.block.blockContent.variableName, 'melody');
    }

    handleBlockMelodyChange(newValue: string): void {
        if (this.block.blockContent.isVariable && this.block.blockContent.variableName) {
            // Si estamos editando un bloque que usa una variable, actualizar la variable
            VariableContext.setValue(this.block.blockContent.variableName, newValue);
        }
        
        // Actualizar el bloque directamente
        this.block.blockContent.notes = newValue;
    }
}
