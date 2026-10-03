import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { VariableContext } from 'src/app/model/variable.context';
import { getPlayModeNames } from 'src/app/model/play.mode';
import { Scale } from 'src/app/model/scale';
import { Subscription } from 'rxjs';

interface VariableDeclaration {
    name: string;
    value: string | number;
    type: 'number' | 'playmode' | 'scale';
}

@Component({
    selector: 'app-variable-declaration',
    templateUrl: './variable-declaration.component.html',
    styleUrls: ['./variable-declaration.component.scss']
})
export class VariableDeclarationComponent implements OnInit, OnDestroy {
    @Output() variableAdded = new EventEmitter<void>();
    @Output() variableRemoved = new EventEmitter<void>();
    @Output() variableUpdated = new EventEmitter<void>();

    newVariable: VariableDeclaration = {
        name: '',
        value: '',
        type: 'number'
    };

    variables: VariableDeclaration[] = [];
    playModeNames: string[] = getPlayModeNames();
    scaleNames: string[] = Scale.getScaleNames();

    private contextSubscription: Subscription | null = null;

    constructor() {
    }

    ngOnInit(): void {
       this.contextSubscription = VariableContext.onVariablesChange.subscribe(() => {
           this.updateVariablesList();
       });
        this.updateVariablesList();
    }

    ngOnDestroy(): void {
        this.contextSubscription?.unsubscribe();
    }

    addVariable(): void {
        if (this.newVariable.name) {
            let value: any;
            if (this.newVariable.type === 'playmode') {
                value = this.newVariable.value || this.playModeNames[0];
            } else if (this.newVariable.type === 'scale') {
                value = this.newVariable.value || this.scaleNames[0];
            } else {
                value = this.newVariable.value === '' ? 0 : Number(this.newVariable.value);
            }

            VariableContext.setValue(this.newVariable.name, value);
            this.newVariable = { name: '', value: '', type: 'number' };
            this.variableAdded.emit();
        }
    }

    updateVariable(index: number): void {
        const variable = this.variables[index];
        
        if (VariableContext && variable) {
            let value: any;
            if (variable.type === 'playmode') {
                value = variable.value;
            } else if (variable.type === 'scale') {
                value = variable.value;
            } else {
                const numValue = Number(variable.value);
                value = isNaN(numValue) ? 0 : numValue;
            }
            VariableContext.setValue(variable.name, value);
            this.variableUpdated.emit();
        }
    }

    removeVariable(index: number): void {
        const variable = this.variables[index];
        if (VariableContext && variable) {
            VariableContext.removeValue(variable.name);
            this.variableRemoved.emit();
        }
    }

    private updateVariablesList(): void {
        if (VariableContext) {
            const variables = VariableContext.context;
            this.variables = Array.from(variables.entries()).map(([name, value]) => {
                if (typeof value === 'string') {
                    if (this.playModeNames.includes(value)) {
                        return { name, value, type: 'playmode' as const };
                    } else if (this.scaleNames.includes(value)) {
                        return { name, value, type: 'scale' as const };
                    } else {
                        return null;
                    }
                } else if (typeof value === 'number') {
                    return { name, value, type: 'number' as const };
                }
                return null;
            }).filter(v => v !== null) as VariableDeclaration[];
        }
    }
} 