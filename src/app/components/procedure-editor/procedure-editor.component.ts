import {
    ChangeDetectorRef,
    Component,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Tooltip } from 'primeng/tooltip';
import { Subscription } from 'rxjs';
import { Procedure } from 'src/app/model/content';
import {
    AssignOperation,
    BaseOperation,
    OperationType,
    VaryOperation
} from 'src/app/model/operation';
import { VariableContext } from 'src/app/model/variable.context';
import {
    playModeDescription as playModeDescriptionText,
    playModeOptions as buildPlayModeOptions,
    PlayModeOption
} from 'src/app/model/play-mode-display';
import {
    buildAvailableVariables,
    commandTypeLabel,
    isVariableOfType,
    resolveEditorOptions,
    showOperationColon,
    VariableOption
} from '../content-editors/command-ui';

interface OperationView {
    type: OperationType;
    variableName: string;
    value: string | number;
}

/**
 * Editor de un `Procedure`: la antigua fila de Operations extraída de
 * `block-commands`. Edita `Procedure.operations` y conserva la lógica de
 * variables/escala/playmode y las mismas clases CSS de la fila original.
 */
@Component({
    selector: 'app-procedure-editor',
    templateUrl: './procedure-editor.component.html',
    styleUrls: ['./procedure-editor.component.scss'],
    imports: [Tooltip, FormsModule, Button]
})
export class ProcedureEditorComponent implements OnInit, OnChanges, OnDestroy {
    @Input() procedure: Procedure = new Procedure();

    readonly operationTypes = OperationType;
    operationTypeNames: string[] = Object.values(OperationType);
    playModeNames: string[] = [];
    playModeOptions: PlayModeOption[] = [];
    scaleNames: string[] = [];
    availableVariables: VariableOption[] = [];
    selectedVariable: string | null = null;
    operations: OperationView[] = [];

    private variablesSubscription?: Subscription;

    constructor(
        private readonly cdr: ChangeDetectorRef
    ) {
        const { playModeNames, scaleNames } = resolveEditorOptions();
        this.playModeNames = playModeNames;
        this.scaleNames = scaleNames;
        this.playModeOptions = buildPlayModeOptions(playModeNames);
    }

    ngOnInit(): void {
        this.operationTypeNames = Object.values(OperationType);
        this.updateAvailableVariables();
        this.subscribeToVariableChanges();
        this.initializeOperationsFromProcedure();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['procedure'] && !changes['procedure'].firstChange) {
            this.initializeOperationsFromProcedure();
        }
    }

    ngOnDestroy(): void {
        this.variablesSubscription?.unsubscribe();
    }

    typeLabel(type: string): string {
        return commandTypeLabel(type);
    }

    addOperation(): void {
        const defaultOpType = OperationType.ASSIGN;
        if (!this.selectedVariable && this.availableVariables.length > 0) {
            this.selectedVariable = this.availableVariables[0].value;
        }
        if (!this.selectedVariable) {
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

        this.operations = [
            ...this.operations,
            {
                type: defaultOpType,
                variableName: this.selectedVariable,
                value: initialValue
            }
        ];
        this.updateProcedureOperations();
        this.cdr.detectChanges();
    }

    removeOperation(index: number): void {
        this.operations = this.operations.filter((_, position) => position !== index);
        this.updateProcedureOperations();
        this.cdr.detectChanges();
    }

    onOperationTypeChange(): void {
        this.operations.forEach(operation => {
            if (operation.type === OperationType.ASSIGN) {
                if (this.isVariableOfType(operation.variableName, 'scale')) {
                    operation.value = String(operation.value || this.scaleNames[0] || 'WHITE');
                } else if (this.isVariableOfType(operation.variableName, 'playmode')) {
                    operation.value = String(operation.value || this.playModeNames[0] || 'CHORD');
                } else {
                    operation.value =
                        typeof operation.value === 'number'
                            ? operation.value
                            : (parseFloat(String(operation.value)) || 0);
                }
            } else if (operation.type === OperationType.VARY) {
                operation.value =
                    typeof operation.value === 'number'
                        ? operation.value
                        : (parseInt(String(operation.value)) || 1);
            }
        });
        this.updateProcedureOperations();
        this.cdr.detectChanges();
    }

    onVariableSelected(value: string): void {
        this.selectedVariable = value;
        this.cdr.detectChanges();
    }

    trackByVariable(_index: number, variable: VariableOption): string {
        return variable.value;
    }

    showOperationColon(operation: { variableName: string }): boolean {
        return showOperationColon(operation);
    }

    isVariableOfType(variableName: string, type: 'number' | 'playmode' | 'scale'): boolean {
        return isVariableOfType(variableName, type, this.playModeNames, this.scaleNames);
    }

    onOperationValueChange(operation: OperationView, event: unknown): void {
        const value = this.eventValue(event);
        if (operation.type === OperationType.VARY || this.isVariableOfType(operation.variableName, 'number')) {
            const numberValue = parseFloat(String(value));
            operation.value = isNaN(numberValue)
                ? (operation.type === OperationType.VARY ? 1 : 0)
                : numberValue;
        } else {
            operation.value = String(value);
        }
        this.updateProcedureOperations();
        this.cdr.detectChanges();
    }

    operationPlayModeDescription(value: string | number): string {
        return playModeDescriptionText(String(value));
    }

    private subscribeToVariableChanges(): void {
        this.variablesSubscription?.unsubscribe();
        this.variablesSubscription = VariableContext.onVariablesChange.subscribe(() => {
            this.updateAvailableVariables();
            this.cdr.detectChanges();
        });
    }

    private updateAvailableVariables(): void {
        this.availableVariables = buildAvailableVariables(this.playModeNames, this.scaleNames);
    }

    private initializeOperationsFromProcedure(): void {
        this.operations = this.procedure.operations.map(operation => {
            let type: OperationType = OperationType.ASSIGN;
            if (operation instanceof VaryOperation) {
                type = OperationType.VARY;
            } else if (operation instanceof AssignOperation) {
                type = OperationType.ASSIGN;
            }
            return {
                type,
                variableName: operation.variableName,
                value: operation.value
            };
        });
        this.cdr.detectChanges();
    }

    private updateProcedureOperations(): void {
        this.procedure.operations = this.operations.map((operation): BaseOperation => {
            const variableName = operation.variableName || '';
            let value = operation.value;

            if (operation.type === OperationType.VARY) {
                const step = typeof value === 'number' ? value : (parseInt(String(value)) || 1);
                return new VaryOperation(variableName, step);
            }

            if (this.isVariableOfType(variableName, 'scale')) {
                value = String(value || this.scaleNames[0] || 'WHITE');
            } else if (this.isVariableOfType(variableName, 'playmode')) {
                value = String(value || this.playModeNames[0] || 'CHORD');
            } else {
                value = typeof value === 'number' ? value : (parseFloat(String(value)) || 0);
            }
            return new AssignOperation(variableName, value);
        });
    }

    private eventValue(event: unknown): unknown {
        if (event !== null && typeof event === 'object') {
            const withValue = event as { value?: unknown; target?: { value?: unknown } };
            if (withValue.value !== undefined) {
                return withValue.value;
            }
            if (withValue.target) {
                return withValue.target.value;
            }
        }
        return event;
    }
}
