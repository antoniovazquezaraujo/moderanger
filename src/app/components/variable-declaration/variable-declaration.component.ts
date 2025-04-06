import { Component, Input, Output, EventEmitter } from '@angular/core';
import { VariableContext } from 'src/app/model/variable.context';
import { getPlayModeNames } from 'src/app/model/play.mode';
import { Scale } from 'src/app/model/scale';
import { MelodyEditorService } from 'src/app/services/melody-editor.service';

interface VariableDeclaration {
    name: string;
    value: string | number;
    type: 'number' | 'playmode' | 'melody' | 'scale';
}

@Component({
    selector: 'app-variable-declaration',
    templateUrl: './variable-declaration.component.html',
    styleUrls: ['./variable-declaration.component.scss'],
    providers: [MelodyEditorService]
})
export class VariableDeclarationComponent {
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

    constructor(private melodyEditorService: MelodyEditorService) {
        this.updateVariablesList();
    }

    addVariable(event: Event): void {
        event.preventDefault();
        if (this.newVariable.name) {
            let value: any;
            if (this.newVariable.type === 'playmode') {
                value = this.newVariable.value;
            } else if (this.newVariable.type === 'melody') {
                value = String(this.newVariable.value || '');
            } else if (this.newVariable.type === 'scale') {
                value = this.newVariable.value;
            } else {
                value = this.newVariable.value === '' ? 0 : Number(this.newVariable.value);
            }

            VariableContext.setValue(this.newVariable.name, value);
            this.newVariable = { name: '', value: '', type: 'number' };
            this.updateVariablesList();
            this.variableAdded.emit();
        }
    }

    removeVariable(index: number): void {
        const variable = this.variables[index];
        if (VariableContext && variable) {
            VariableContext.removeValue(variable.name);
            this.variableRemoved.emit();
        }
    }

    updateVariable(index: number): void {
        const variable = this.variables[index];
        if (VariableContext && variable) {
            let value: any;
            if (variable.type === 'playmode') {
                value = variable.value;
            } else if (variable.type === 'melody') {
                value = String(variable.value || '');
            } else if (variable.type === 'scale') {
                value = variable.value;
            } else {
                value = variable.value === '' ? 0 : Number(variable.value);
            }

            VariableContext.setValue(variable.name, value);
            this.variableUpdated.emit();
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
                        return { name, value, type: 'melody' as const };
                    }
                }
                return { name, value, type: 'number' as const };
            });
        }
    }

    toString(value: any): string {
        return String(value || '');
    }
} 