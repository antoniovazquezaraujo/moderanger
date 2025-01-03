import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command, CommandType } from 'src/app/model/command';
import { getPlayModeNames } from 'src/app/model/play.mode';
import { Scale } from 'src/app/model/scale';
import { VariableContext } from 'src/app/model/variable.context';
import { Subscription } from 'rxjs';

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
    @Input() variableContext?: VariableContext;

    commandTypeNames: string[] = [];
    commandTypes = CommandType;
    playModeNames: string[];
    scaleNames: string[];
    availableVariables: VariableOption[] = [];
    private variablesSubscription?: Subscription;
  
    constructor(private cdr: ChangeDetectorRef) {         
        this.playModeNames = getPlayModeNames();
        this.scaleNames = Scale.getScaleNames();
    }

    ngOnInit(): void {
        this.commandTypeNames = Object.values(CommandType);
        this.updateAvailableVariables();
        this.subscribeToVariableChanges();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['variableContext']) {
            this.updateAvailableVariables();
            this.subscribeToVariableChanges();
            this.cdr.detectChanges();
        }
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
        
        if (this.variableContext) {
            this.variablesSubscription = this.variableContext.onVariablesChange.subscribe(() => {
                this.updateAvailableVariables();
                this.cdr.detectChanges();
            });
        }
    }

    private updateAvailableVariables(): void {
        if (this.variableContext) {
            const variables = this.variableContext.getAllVariables();
            this.availableVariables = Array.from(variables.entries()).map(([name, value]) => ({
                label: `${name} (${value})`,
                value: name
            }));
            
            // Actualizar los comandos que usan variables
            if (this.block.commands) {
                this.block.commands.forEach(command => {
                    if (command.isVariable && !this.availableVariables.find(v => v.value === command.value)) {
                        command.setValue(0);
                        command.isVariable = false;
                    }
                });
            }
        }
    }

    removeCommand(command: Command): void {
        if (this.block.commands) {
            this.block.commands = this.block.commands.filter(t => t !== command);
        }
    }

    addCommand(): void {
        if (!this.block.commands) {
            this.block.commands = [];
        }
        this.block.commands.push(new Command());
    }

    toggleVariableMode(command: Command, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        
        const wasVariable = command.isVariable;
        const oldValue = command.value;
        
        command.isVariable = !wasVariable;
        
        if (!wasVariable && this.availableVariables.length > 0) {
            // Cambiando a variable
            command.setVariable(this.availableVariables[0].value);
        } else if (wasVariable) {
            // Cambiando de variable a valor normal
            if (typeof oldValue === 'string') {
                if (command.type === CommandType.PLAYMODE) {
                    // Para PLAYMODE, establecer un modo válido
                    command.setValue(this.playModeNames[0]);
                } else {
                    // Para otros tipos, obtener el valor numérico
                    const numValue = this.variableContext?.getValue(oldValue);
                    command.setValue(numValue !== undefined ? numValue : 0);
                }
            } else {
                command.setValue(command.type === CommandType.PLAYMODE ? this.playModeNames[0] : 0);
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
                    // Si es un evento del dropdown, event.value contendrá el nombre de la variable
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
            return null;
        } catch (error) {
            console.error('Error getting selected value:', error);
            return null;
        }
    }
}
