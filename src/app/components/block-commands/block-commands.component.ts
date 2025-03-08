import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command, CommandType } from 'src/app/model/command';
import { OperationType } from 'src/app/model/operation';
import { getPlayModeNames, PlayMode, getPlayModeFromString } from 'src/app/model/play.mode';
import { Scale } from 'src/app/model/scale';
import { VariableContext } from 'src/app/model/variable.context';
import { Subscription } from 'rxjs';
import { IncrementOperation, DecrementOperation, AssignOperation } from 'src/app/model/operation';

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

    // Initialize operations array
    operations: { type: OperationType, variableName: string, value: number }[] = [];

    operationDropdownOptions = this.operationTypeNames.map(type => ({ label: type, value: type }));

    constructor(private cdr: ChangeDetectorRef) {         
        this.playModeNames = getPlayModeNames();
        this.scaleNames = Scale.getScaleNames();
    }

    ngOnInit(): void {
        console.log('BlockCommandsComponent initialized with block:', this.block);
        this.commandTypeNames = Object.values(CommandType);
        this.operationTypeNames = Object.values(OperationType);
        
       
        this.updateAvailableVariables();
        this.subscribeToVariableChanges();
        
        this.initializeOperationsFromBlock();
        
        this.selectedOperationType = this.operationTypeNames[0] as OperationType;
    }

    ngOnChanges(changes: SimpleChanges): void {
        // if (changes['variableContext']) {
        //     this.updateAvailableVariables();
        //     this.subscribeToVariableChanges();
        // }
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
    }

    private subscribeToVariableChanges(): void {
        if (this.variablesSubscription) {
            this.variablesSubscription.unsubscribe();
        }
        
            this.variablesSubscription = VariableContext.onVariablesChange.subscribe(() => {
                this.updateAvailableVariables();
                if (this.block.blockContent.isVariable && this.block.blockContent.variableName) {
                    const value = VariableContext.getValue(this.block.blockContent.variableName);
                    if (typeof value === 'string') {
                        this.block.blockContent.notes = value;
                    }
                }
                this.cdr.detectChanges();
            });
    }

    private updateAvailableVariables(): void {
            const variables = VariableContext.context;
            this.availableVariables = Array.from(variables.entries())
                .map(([name, value]) => ({
                    label: `${name} (${value})`,
                    value: name
                }));

            if (!this.selectedVariable && this.availableVariables.length > 0) {
                this.selectedVariable = this.availableVariables[0].value;
            }
            
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

            const newOperation = { 
                type: this.selectedOperationType || OperationType.INCREMENT, 
                variableName: this.selectedVariable || '', 
                value: 1 // Cambiado de 0 a 1 para que el incremento/decremento sea más intuitivo
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
            
            switch (op.type) {
                case OperationType.INCREMENT:
                    return new IncrementOperation(variableName, op.value || 1);
                case OperationType.DECREMENT:
                    return new DecrementOperation(variableName, op.value || 1);
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
            if (command.isVariable && typeof command.value === 'string') {
                const value = command.value;
                return value.startsWith('$') ? value.substring(1) : value;
            }
            
            // Para PlayMode, convertimos el valor numérico a string para mostrar en UI
            if (command.type === CommandType.PLAYMODE && typeof command.value === 'number') {
                return PlayMode[command.value as number];
            }
            
            return null;
        } catch (error) {
            console.error('Error getting selected value:', error);
            return null;
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
        this.operations = this.block.operations.map(operation => {
            return {
                type: operation instanceof IncrementOperation ? OperationType.INCREMENT :
                      operation instanceof DecrementOperation ? OperationType.DECREMENT :
                      OperationType.ASSIGN,
                variableName: operation.variableName,
                value: operation.value
            };
        });
        console.log('Initialized operations:', this.operations);
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
}
