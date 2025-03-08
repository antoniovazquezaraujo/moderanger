import { Subscription } from 'rxjs';
import { VariableContext } from './variable.context';

export class BlockContent {
    private _notes: string = '';
    private _isVariable: boolean = false;
    private _variableName: string = '';
    private variableSubscription?: Subscription;

    constructor() {
    }

    get notes(): string {
        return this._notes;
    }

    set notes(value: string) {
        this._notes = value;
    }

    get isVariable(): boolean {
        return this._isVariable;
    }

    set isVariable(value: boolean) {
        this._isVariable = value;
        if (!value) {
            this.unsubscribeFromVariables();
        }
    }

    get variableName(): string {
        return this._variableName;
    }

    set variableName(value: string) {
        this._variableName = value;
        if (this.isVariable && value) {
            this.subscribeToVariable();
        }
    }


    private subscribeToVariable() {
        this.unsubscribeFromVariables();
            const value = VariableContext.getValue(this.variableName);
            if (typeof value === 'string') {
                this._notes = value;
            }

            // Suscribirse a cambios
            this.variableSubscription = VariableContext.onVariablesChange.subscribe(() => {
                const value = VariableContext?.getValue(this.variableName);
                if (typeof value === 'string') {
                    this._notes = value;
                }
            });
    }

    private unsubscribeFromVariables() {
        if (this.variableSubscription) {
            this.variableSubscription.unsubscribe();
            this.variableSubscription = undefined;
        }
    }

    toJSON() {
        return {
            notes: this._notes,
            isVariable: this._isVariable,
            variableName: this._variableName
        };
    }
} 