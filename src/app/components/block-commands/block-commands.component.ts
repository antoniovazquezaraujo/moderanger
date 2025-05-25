import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command, CommandType } from 'src/app/model/command';
import { OperationType, BaseOperation, VaryOperation, AssignOperation } from 'src/app/model/operation';
import { getPlayModeNames, PlayMode, getPlayModeFromString } from 'src/app/model/play.mode';
import { Scale } from 'src/app/model/scale';
import { VariableContext } from 'src/app/model/variable.context';
import { Subscription } from 'rxjs';
import { SongPlayer } from 'src/app/model/song.player';
import { NoteDuration, NoteConverter, MusicElement } from 'src/app/model/melody';
import { NoteData } from 'src/app/model/note';
import { MelodyEditorComponent } from '../melody-editor/melody-editor.component';

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
    public PlayMode = PlayMode;

    commandTypeNames: string[] = [];
    commandTypes = CommandType;
    playModeNames: string[];
    scaleNames: string[];
    availableVariables: VariableOption[] = [];
    private variablesSubscription?: Subscription;
    operationTypes = OperationType;
    operationTypeNames: string[] = Object.values(OperationType);
    selectedVariable: string | null = null;
    
    operations: { type: OperationType, variableName: string, value: string | number }[] = [];

    currentDefaultDuration: NoteDuration = '4n';
    private durationSubscription?: Subscription;

    constructor(
        private cdr: ChangeDetectorRef, 
        private songPlayer: SongPlayer
        ) {         
        this.playModeNames = getPlayModeNames();
        this.scaleNames = Scale.getScaleNames();
    }

    ngOnInit(): void {
        if (!this.scaleNames || this.scaleNames.length === 0) {
            this.scaleNames = Scale.getScaleNames();
        }
        this.commandTypeNames = Object.values(CommandType);
        this.operationTypeNames = Object.values(OperationType);
        this.updateAvailableVariables();
        this.subscribeToVariableChanges();
        this.initializeOperationsFromBlock();
        this.durationSubscription = this.songPlayer.globalDefaultDuration$.subscribe(duration => {
            this.currentDefaultDuration = duration;
            this.cdr.detectChanges();
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['block'] && !changes['block'].firstChange) {
            this.initializeOperationsFromBlock();
        }
    }

    ngOnDestroy(): void {
        this.variablesSubscription?.unsubscribe();
        this.durationSubscription?.unsubscribe();
    }

    private subscribeToVariableChanges(): void {
        this.variablesSubscription?.unsubscribe();
        this.variablesSubscription = VariableContext.onVariablesChange.subscribe(() => {
            this.updateAvailableVariables();
            if (this.block.commands) {
                this.block.commands.forEach(command => {
                    if (command.isVariable && command.getVariableName()) {
                        const currentVarName = command.getVariableName();
                        if (currentVarName && VariableContext.context.has(currentVarName)) {
                            command.setVariable(currentVarName);
                        } else {
                             console.warn(`Variable ${currentVarName} used by command ${command.type} no longer exists or is inaccessible.`);
                        }
                    }
                });
            }
            this.cdr.detectChanges();
        });
    }

    private updateAvailableVariables(): void {
        const variables = VariableContext.context;
        this.availableVariables = Array.from(variables.entries())
            .filter(([name, value]) => { 
                 if (typeof value === 'string') {
                     return this.playModeNames.includes(value) || this.scaleNames.includes(value);
                 }
                 return typeof value === 'number';
            })
            .map(([name, value]) => ({
                label: `${name} (${value})`,
                value: name
            }));

        if (!this.selectedVariable && this.availableVariables.length > 0) {
             if (!this.availableVariables.some(v => v.value === this.selectedVariable)) {
                 this.selectedVariable = this.availableVariables[0].value;
             }
        } else if (this.availableVariables.length === 0) {
             this.selectedVariable = null;
        }
    }

    removeCommand(command: Command): void {
        if (this.block.commands) {
            this.block.commands = this.block.commands.filter(t => t !== command);
            this.cdr.detectChanges(); 
        }
    }

    addElement(type: 'command' | 'operation'): void {
        console.log(`[BlockCommands] addElement called with type: ${type}`);
        if (type === 'command') {
            if (!this.block.commands) {
                this.block.commands = [];
            }
            const newCommand = new Command({ type: CommandType.OCT, value: 0 });
            this.block.commands.push(newCommand);
            console.log(`[BlockCommands] Added command. New count: ${this.block.commands.length}`);
        } else if (type === 'operation') {
            if (!this.operations) {
                this.operations = [];
            }
            const defaultOpType = OperationType.ASSIGN;

            if (!this.selectedVariable && this.availableVariables.length > 0) {
                this.selectedVariable = this.availableVariables[0].value;
                console.log(`[BlockCommands] Defaulted selectedVariable to: ${this.selectedVariable}`);
            }
            if (!this.selectedVariable) {
                 console.warn("[BlockCommands] Cannot add operation: No variable selected or available.");
                 return;
            }

            let initialValue: string | number = 0; 
            if (defaultOpType === OperationType.ASSIGN) {
                if (this.isVariableOfType(this.selectedVariable, 'scale')) {
                    initialValue = this.scaleNames[0] || 'WHITE';
                } else if (this.isVariableOfType(this.selectedVariable, 'playmode')) {
                     initialValue = this.playModeNames[0] || 'CHORD'; 
                }
            } else if (defaultOpType === OperationType.VARY) {
                 initialValue = 1;
            }
            console.log(`[BlockCommands] Determined initialValue: ${initialValue} for variable ${this.selectedVariable}`);

            const newOperation = { 
                type: defaultOpType,
                variableName: this.selectedVariable, 
                value: initialValue
            };
            console.log("[BlockCommands] Created new operation object:", newOperation);
            
            const oldLength = this.operations.length;
            this.operations = [...this.operations, newOperation];
            console.log(`[BlockCommands] Updated local operations array. Old length: ${oldLength}, New length: ${this.operations.length}`, this.operations);
            
            this.updateBlockOperations();
        }
        console.log("[BlockCommands] Triggering change detection after addElement.");
        this.cdr.detectChanges();
    }

    private updateBlockOperations(): void {
        console.log("[BlockCommands] updateBlockOperations started. Input local operations:", this.operations);
        if (!this.operations) {
            this.block.operations = [];
            console.log("[BlockCommands] updateBlockOperations: No local operations, block.operations set to empty.");
            return;
        }
        try {
            this.block.operations = this.operations.map(op => {
                const variableName = op.variableName || '';
                let value = op.value;
                console.log(`[BlockCommands] Mapping operation: type=${op.type}, varName=${variableName}, value=${value}`);

                switch (op.type) {
                    case OperationType.VARY:
                        const varyStep = typeof value === 'number' ? value : (parseInt(String(value)) || 1);
                        return new VaryOperation(variableName, varyStep);
                    case OperationType.ASSIGN:
                         if (this.isVariableOfType(variableName, 'scale')) {
                             value = String(value || this.scaleNames[0] || 'WHITE');
                         } else if (this.isVariableOfType(variableName, 'playmode')) {
                             value = String(value || this.playModeNames[0] || 'CHORD');
                         } else { 
                             value = typeof value === 'number' ? value : (parseFloat(String(value)) || 0);
                         }
                        return new AssignOperation(variableName, value);
                    default:
                        console.error(`[BlockCommands] Unknown operation type in updateBlockOperations: ${op.type}`);
                        return new AssignOperation(variableName, 0); 
                }
            });
            console.log("[BlockCommands] updateBlockOperations finished. Result block.operations:", this.block.operations);
        } catch (error) {
             console.error("[BlockCommands] Error during updateBlockOperations mapping:", error);
             this.block.operations = []; 
        }
    }

    removeOperation(index: number): void {
        this.operations = this.operations.filter((_, i) => i !== index);
        this.updateBlockOperations();
        this.cdr.detectChanges();
    }

    toggleVariableMode(command: Command, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        
        if (command.type === CommandType.PATTERN) {
            return;
        }
        
        const wasVariable = command.isVariable;
        command.isVariable = !wasVariable;
        
        if (command.isVariable) { 
            this.updateAvailableVariables(); 
            const compatibleVars = this.getFilteredVariables(command);
            if (compatibleVars.length > 0) {
                command.setVariable(compatibleVars[0].value);
            } else {
                 command.setVariable(null); 
                 console.warn(`No compatible variables found for command type ${command.type}`);
            }
        } else { 
             command.setValue(this.getDefaultValueForCommandType(command.type));
        }
        this.cdr.detectChanges();
    }

    /**
     * New improved method for variable selection with proper user choice
     */
    showVariableSelector(command: Command, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        
        if (command.type === CommandType.PATTERN) {
            return;
        }
        
        if (command.isVariable) {
            // If already a variable, convert back to direct value
            command.isVariable = false;
            command.setValue(this.getDefaultValueForCommandType(command.type));
            console.log(`[BlockCommands] Converted command ${command.type} from variable to direct value`);
        } else {
            // Convert to variable mode and pre-select the first compatible variable
            this.updateAvailableVariables();
            const compatibleVars = this.getFilteredVariables(command);
            
            if (compatibleVars.length > 0) {
                command.isVariable = true;
                command.setVariable(compatibleVars[0].value); // Pre-select first compatible variable
                console.log(`[BlockCommands] Converted command ${command.type} to variable mode. Pre-selected: ${compatibleVars[0].value}`);
            } else {
                console.warn(`[BlockCommands] No compatible variables found for command type ${command.type}`);
                alert('No compatible variables available for this command type. Please create variables first.');
                return;
            }
        }
        
        this.cdr.detectChanges();
    }

    handleValueInput(event: any, command: Command): void {
        try {
            let valueToSet: string | number | null;
            if (command.isVariable) {
                valueToSet = typeof event === 'object' ? event.value : event; 
                 if (valueToSet === null || valueToSet === '') {
                     command.isVariable = false;
                     command.setValue(this.getDefaultValueForCommandType(command.type));
                 } else {
                    command.setVariable(String(valueToSet));
                 }
            } else {
                valueToSet = typeof event === 'object' ? event.target?.value : event;
                if (command.type !== CommandType.PATTERN) {
                    command.setValue(valueToSet);
                }
            }
            this.cdr.detectChanges();
        } catch (error) {
            console.error('Error handling value input:', error, command, event);
            command.isVariable = false;
            command.setValue(this.getDefaultValueForCommandType(command.type)); 
            this.cdr.detectChanges();
        }
    }

    getSelectedValue(command: Command): string {
        if (command.isVariable) {
            return command.getVariableName() || '';
        }
        return ''; 
    }

    getFilteredVariables(command: Command): VariableOption[] {
        return this.availableVariables.filter(v => {
            if (command.type === CommandType.PLAYMODE) {
                return this.isVariableOfType(v.value, 'playmode');
            } else if (command.type === CommandType.SCALE) {
                return this.isVariableOfType(v.value, 'scale');
            } else { 
                return this.isVariableOfType(v.value, 'number');
            }
        });
    }

    onVariableSelected(value: string): void {
        console.log('Operation variable selected for potential new op:', value);
        this.selectedVariable = value;
        this.cdr.detectChanges(); 
    }

    onCommandTypeChange(command: Command): void {
        console.log(`Command type changed to: ${command.type}`);
        if (command.type === CommandType.PATTERN) {
             command.isVariable = false;
        }
        command.setValue(this.getDefaultValueForCommandType(command.type));
        this.cdr.detectChanges();
    }

    isCommand(element: any): element is Command {
        return element instanceof Command;
    }

    isOperation(element: any): boolean {
        return typeof element === 'object' && element !== null && 
               'type' in element && Object.values(OperationType).includes(element.type as OperationType) && 
               'variableName' in element && 'value' in element;
    }

    onOperationTypeChange(): void {
        console.log('Operation type changed in list');
        this.operations.forEach(op => {
             if (op.type === OperationType.ASSIGN) {
                 if (this.isVariableOfType(op.variableName, 'scale')) {
                     op.value = String(op.value || this.scaleNames[0] || 'WHITE');
                 } else if (this.isVariableOfType(op.variableName, 'playmode')) {
                     op.value = String(op.value || this.playModeNames[0] || 'CHORD');
                 } else {
                     op.value = typeof op.value === 'number' ? op.value : (parseFloat(String(op.value)) || 0);
                 }
             } else if (op.type === OperationType.VARY) {
                 op.value = typeof op.value === 'number' ? op.value : (parseInt(String(op.value)) || 1);
             }
        });
        this.updateBlockOperations(); 
        this.cdr.detectChanges();
    }

    private initializeOperationsFromBlock(): void {
        if (!this.block.operations) {
            this.operations = [];
            return;
        }
        this.operations = this.block.operations.map(operation => {
            let type: OperationType;
            if (operation instanceof VaryOperation) type = OperationType.VARY;
            else if (operation instanceof AssignOperation) type = OperationType.ASSIGN;
            else { 
                console.warn("[BlockCommands] Unknown operation type during initialization:", operation);
                type = OperationType.ASSIGN;
            }                 
            return {
                type: type,
                variableName: operation.variableName,
                value: operation.value
            };
        });
        this.cdr.detectChanges();
    }

    getPlayModeString(command: Command): string {
        if (command.type === CommandType.PLAYMODE) {
             const numValue = command.value;
             if (typeof numValue === 'number' && PlayMode[numValue] !== undefined) {
                 return PlayMode[numValue];
             } else if (typeof numValue === 'string' && this.playModeNames.includes(numValue)) {
                 return numValue;
             } 
             return this.playModeNames[0] || ''; 
        }
        return '';
    }

    setPlayModeFromString(modeString: string, command: Command): void {
        if (command.type === CommandType.PLAYMODE) {
            command.setValue(modeString); 
            this.cdr.detectChanges();
        }
    }

    isVariableOfType(variableName: string, type: 'number' | 'playmode' | 'scale'): boolean {
        if (!variableName) return false;
        const value = VariableContext.getValue(variableName);
        if (value === undefined) return false;
        
        if (type === 'scale') {
             return typeof value === 'string' && this.scaleNames.includes(value);
        } else if (type === 'number') {
            return typeof value === 'number';
        } else if (type === 'playmode') {
            return typeof value === 'string' && this.playModeNames.includes(value);
        }
        return false;
    }

    onOperationValueChange(operation: { type: OperationType, variableName: string, value: string | number }, event: any): void {
        let newValue: string | number;
        if (event && event.target && typeof event.target.value !== 'undefined') {
            newValue = event.target.value;
        } else {
            newValue = event;
        }

        if (operation.type === OperationType.VARY || this.isVariableOfType(operation.variableName, 'number')) {
            const numVal = parseFloat(String(newValue));
            operation.value = isNaN(numVal) ? (operation.type === OperationType.VARY ? 1 : 0) : numVal;
        } else {
            operation.value = String(newValue);
        }
        
        this.updateBlockOperations();
        this.cdr.detectChanges();
    }

    getDefaultValueForCommandType(type: CommandType): string | number {
        if (type === CommandType.PLAYMODE) {
            return this.playModeNames[0] || 'CHORD';
        } else if (type === CommandType.SCALE) {
            return this.scaleNames[0] || 'WHITE';
        } else if (type === CommandType.PATTERN) {
            return '';
        } else {
            return 0;
        }
    }

    getPatternValueAsString(command: Command): string {
        if (command.type === CommandType.PATTERN) {
            return String(command.value || ''); 
        }
        return '';
    }
}
