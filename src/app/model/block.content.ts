import { Subscription } from 'rxjs';
import { VariableContext } from './variable.context';

export class BlockContent {
    private _notes: string = '';
    private _isVariable: boolean = false;
    private _variableName: string = '';
    private _defaultDuration?: string;
    private variableSubscription?: Subscription;

    constructor() {
    }

    get notes(): string {
        return this._notes;
    }

    set notes(value: string) {
        console.log(`[BlockContent] Setter called for notes. Current: "${this._notes}", New: "${value}"`);
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

    /** Duración por defecto del bloque (`notes default <duración>` en `.mr`). */
    get defaultDuration(): string | undefined {
        return this._defaultDuration;
    }

    set defaultDuration(value: string | undefined) {
        this._defaultDuration = value;
    }

    /**
     * Declara que las notas del bloque vienen de una variable **sin** leer ni
     * suscribirse a `VariableContext` (lo usa el parser `.mr`, que no debe
     * tener efectos sobre el estado global de reproducción).
     */
    setVariableReference(name: string): void {
        this._variableName = name;
        this._isVariable = true;
        this._notes = '';
        this.unsubscribeFromVariables();
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
        const json: Record<string, unknown> = {
            notes: this._notes,
            isVariable: this._isVariable,
            variableName: this._variableName
        };
        if (this._defaultDuration !== undefined) {
            json['defaultDuration'] = this._defaultDuration;
        }
        return json;
    }
} 