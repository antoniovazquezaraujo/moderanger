import { Component, Input, Output, EventEmitter } from '@angular/core';
import { VariableContext } from 'src/app/model/variable.context';
import { getPlayModeNames } from 'src/app/model/play.mode';

interface VariableDeclaration {
    name: string;
    value: string | number;
    type: 'number' | 'playmode';
}

@Component({
    selector: 'app-variable-declaration',
    templateUrl: './variable-declaration.component.html',
    styleUrls: ['./variable-declaration.component.scss']
})
export class VariableDeclarationComponent {
    @Input() variableContext?: VariableContext;
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

    constructor() {
        this.updateVariablesList();
    }

    addVariable(event: Event): void {
        event.preventDefault();
        if (this.variableContext && this.newVariable.name) {
            const value = this.newVariable.type === 'playmode' ? 
                this.newVariable.value : 
                Number(this.newVariable.value);

            this.variableContext.setVariable(this.newVariable.name, value);
            this.newVariable = { name: '', value: '', type: 'number' };
            this.updateVariablesList();
            this.variableAdded.emit();
        }
    }

    removeVariable(index: number): void {
        const variable = this.variables[index];
        if (this.variableContext && variable) {
            this.variableContext.removeVariable(variable.name);
            this.updateVariablesList();
            this.variableRemoved.emit();
        }
    }

    updateVariable(index: number): void {
        const variable = this.variables[index];
        if (this.variableContext && variable) {
            const value = variable.type === 'playmode' ? 
                variable.value : 
                Number(variable.value);

            this.variableContext.setVariable(variable.name, value);
            this.variableUpdated.emit();
        }
    }

    private updateVariablesList(): void {
        if (this.variableContext) {
            const variables = this.variableContext.getAllVariables();
            this.variables = Array.from(variables.entries()).map(([name, value]) => ({
                name,
                value,
                type: typeof value === 'string' ? 'playmode' : 'number'
            }));
        }
    }
} 