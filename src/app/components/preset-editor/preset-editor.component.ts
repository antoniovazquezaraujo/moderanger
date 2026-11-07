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
import { Bind } from 'primeng/bind';
import { Button } from 'primeng/button';
import { Tooltip } from 'primeng/tooltip';
import { Subscription } from 'rxjs';
import { Command, CommandType } from 'src/app/model/command';
import { Preset } from 'src/app/model/content';
import { NoteDuration } from 'src/app/model/melody';
import { PlayMode } from 'src/app/model/play.mode';
import {
    playModeDescription as playModeDescriptionText,
    playModeOptions as buildPlayModeOptions,
    playModeSymbol as playModeSymbolText,
    PlayModeOption
} from 'src/app/model/play-mode-display';
import { Scale } from 'src/app/model/scale';
import { SongPlayer } from 'src/app/model/song.player';
import { VariableContext } from 'src/app/model/variable.context';
import { MelodyEditorComponent } from '../melody-editor/melody-editor.component';
import { ScaleSelectComponent } from '../scale-select/scale-select.component';
import {
    buildAvailableVariables,
    buildStringVariables,
    canonicalDecorationValueOrRaw,
    commandTypeDescription,
    commandTypeLabel,
    createShiftCommands,
    defaultCommandValue,
    filterVariables,
    isVariableOfType,
    resolveEditorOptions,
    showCommandColon,
    SHIFT_COMMAND_TYPES,
    VariableOption
} from '../content-editors/command-ui';

/**
 * Editor de un `Preset`: la antigua fila de Commands extraída de
 * `block-commands`. Edita `Preset.settings` y conserva la lógica de variables,
 * PATTERN y DECORATION (misma presentación y clases CSS que la fila original).
 */
@Component({
    selector: 'app-preset-editor',
    templateUrl: './preset-editor.component.html',
    styleUrls: ['./preset-editor.component.scss'],
    imports: [Tooltip, FormsModule, MelodyEditorComponent, Bind, Button, ScaleSelectComponent]
})
export class PresetEditorComponent implements OnInit, OnChanges, OnDestroy {
    @Input() preset: Preset = new Preset();

    readonly commandTypes = CommandType;
    readonly syntheticShift = 'SHIFT';
    commandTypeNames: string[] = Object.values(CommandType);
    /** Tipos que se pueden elegir en una fila normal; los tres Shift se agrupan. */
    private baseCommandTypeNames: string[] = Object.values(CommandType)
        .filter(type => !SHIFT_COMMAND_TYPES.includes(type as CommandType));
    playModeNames: string[] = [];
    playModeOptions: PlayModeOption[] = [];
    scaleNames: string[] = [];
    availableVariables: VariableOption[] = [];
    stringVariables: VariableOption[] = [];
    currentDefaultDuration: NoteDuration = '4n';

    private variablesSubscription?: Subscription;
    private durationSubscription?: Subscription;
    private variableWarningScheduled = false;
    private destroyed = false;

    constructor(
        private readonly cdr: ChangeDetectorRef,
        private readonly songPlayer: SongPlayer
    ) {
        const { playModeNames, scaleNames } = resolveEditorOptions();
        this.playModeNames = playModeNames;
        this.scaleNames = scaleNames;
        this.playModeOptions = buildPlayModeOptions(playModeNames);
    }

    ngOnInit(): void {
        if (!this.scaleNames || this.scaleNames.length === 0) {
            this.scaleNames = Scale.getScaleNames();
        }
        this.commandTypeNames = Object.values(CommandType);
        this.updateAvailableVariables();
        this.subscribeToVariableChanges();
        this.durationSubscription = this.songPlayer.globalDefaultDuration$.subscribe(duration => {
            this.currentDefaultDuration = duration;
            this.cdr.detectChanges();
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['preset'] && !changes['preset'].firstChange) {
            this.updateAvailableVariables();
            this.syncVariableCommands();
            this.cdr.detectChanges();
        }
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.variablesSubscription?.unsubscribe();
        this.durationSubscription?.unsubscribe();
    }

    /** Etiqueta de tipo para la vista (`INV` → `Inv`); el modelo no cambia. */
    typeLabel(type: string): string {
        return commandTypeLabel(type);
    }

    /** Lista de tipos de una fila; los Shift existentes conservan sus tipos. */
    typeOptions(command: Command): string[] {
        if (SHIFT_COMMAND_TYPES.includes(command.type)) {
            return this.commandTypeNames;
        }
        return [...this.baseCommandTypeNames, this.syntheticShift];
    }

    /** Descripción contextual del tipo seleccionado. */
    typeDescription(type: string): string {
        return commandTypeDescription(type);
    }

    removeCommand(command: Command): void {
        this.preset.settings = this.preset.settings.filter(setting => setting !== command);
        this.cdr.detectChanges();
    }

    addCommand(): void {
        this.preset.settings.push(new Command({ type: CommandType.OCT, value: 0 }));
        this.cdr.detectChanges();
    }

    toggleVariableMode(command: Command, event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        command.isVariable = !command.isVariable;
        if (command.isVariable) {
            this.updateAvailableVariables();
            const compatibleVariables = this.getFilteredVariables(command);
            if (compatibleVariables.length > 0) {
                command.setVariable(compatibleVariables[0].value);
            } else {
                command.setVariable(null);
            }
        } else {
            command.setValue(this.getDefaultValueForCommandType(command.type));
        }
        this.cdr.detectChanges();
    }

    /** Alterna entre valor directo y variable, conservando el texto de PATTERN. */
    showVariableSelector(command: Command, event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        if (command.isVariable) {
            const resolvedString =
                command.type === CommandType.PATTERN || command.type === CommandType.DECORATION
                    ? String(command.value ?? '')
                    : '';
            command.isVariable = false;
            command.setValue(
                command.type === CommandType.PATTERN || command.type === CommandType.DECORATION
                    ? resolvedString
                    : this.getDefaultValueForCommandType(command.type)
            );
        } else {
            this.updateAvailableVariables();
            const compatibleVariables = this.getFilteredVariables(command);
            if (compatibleVariables.length > 0) {
                command.isVariable = true;
                command.setVariable(compatibleVariables[0].value);
            }
        }
        this.cdr.detectChanges();
    }

    handleValueInput(event: unknown, command: Command): void {
        try {
            if (command.isVariable) {
                const value = this.eventValue(event);
                if (value === null || value === '') {
                    command.isVariable = false;
                    command.setValue(this.getDefaultValueForCommandType(command.type));
                } else {
                    command.setVariable(String(value));
                }
            } else {
                const value = this.eventValue(event);
                if (command.type !== CommandType.PATTERN && command.type !== CommandType.DECORATION) {
                    command.setValue(value as string | number | null);
                }
            }
            this.cdr.detectChanges();
        } catch {
            command.isVariable = false;
            command.setValue(this.getDefaultValueForCommandType(command.type));
            this.cdr.detectChanges();
        }
    }

    getSelectedValue(command: Command): string {
        return command.isVariable ? command.getVariableName() || '' : '';
    }

    showCommandColon(command: Command): boolean {
        return showCommandColon(command);
    }

    getFilteredVariables(command: Command): VariableOption[] {
        return filterVariables(
            command,
            this.availableVariables,
            this.stringVariables,
            this.playModeNames,
            this.scaleNames
        );
    }

    onVariableSelected(_value: string): void {
        this.cdr.detectChanges();
    }

    trackByVariable(_index: number, variable: VariableOption): string {
        return variable.value;
    }

    onCommandTypeChange(command: Command): void {
        // El tipo sintético `SHIFT` no existe en el modelo: al elegirlo se
        // sustituye la fila por los tres ajustes que forman la ventana.
        if (String(command.type) === this.syntheticShift) {
            const index = this.preset.settings.indexOf(command);
            if (index !== -1) {
                this.preset.settings.splice(index, 1, ...createShiftCommands());
                this.cdr.detectChanges();
            }
            return;
        }
        if (command.type === CommandType.PATTERN || command.type === CommandType.DECORATION) {
            command.isVariable = false;
        }
        command.setValue(this.getDefaultValueForCommandType(command.type));
        this.cdr.detectChanges();
    }

    playModeSymbol(name: string): string {
        return playModeSymbolText(name);
    }

    playModeDescription(name: string): string {
        return playModeDescriptionText(name);
    }

    getPlayModeString(command: Command): string {
        if (command.type !== CommandType.PLAYMODE) {
            return '';
        }
        const value = command.value;
        if (typeof value === 'number' && PlayMode[value] !== undefined) {
            return PlayMode[value];
        }
        if (typeof value === 'string' && this.playModeNames.includes(value)) {
            return value;
        }
        return this.playModeNames[0] || '';
    }

    setPlayModeFromString(modeString: string, command: Command): void {
        if (command.type === CommandType.PLAYMODE) {
            command.setValue(modeString);
            this.cdr.detectChanges();
        }
    }

    scaleName(command: Command): string {
        return String(command.value ?? 'WHITE');
    }

    handleScaleSelected(scale: string, command: Command): void {
        if (command.type === CommandType.SCALE) {
            command.setValue(scale);
            this.cdr.detectChanges();
        }
    }

    isVariableOfType(variableName: string, type: 'number' | 'playmode' | 'scale'): boolean {
        return isVariableOfType(variableName, type, this.playModeNames, this.scaleNames);
    }

    getDefaultValueForCommandType(type: CommandType): string | number {
        return defaultCommandValue(type, this.playModeNames, this.scaleNames);
    }

    getPatternValueAsString(command: Command): string {
        return command.type === CommandType.PATTERN ? String(command.value || '') : '';
    }

    getDecorationValueAsString(command: Command): string {
        return command.type === CommandType.DECORATION ? String(command.value || '') : '';
    }

    /** Edición del DECORATION con el editor de melodía: valor canonicalizado. */
    onDecorationValueChange(value: string, command: Command): void {
        if (command.type === CommandType.DECORATION) {
            command.value = canonicalDecorationValueOrRaw(value);
        }
    }

    private subscribeToVariableChanges(): void {
        this.variablesSubscription?.unsubscribe();
        this.variablesSubscription = VariableContext.onVariablesChange.subscribe(() => {
            this.updateAvailableVariables();
            this.syncVariableCommands();
            this.scheduleMissingVariableWarningCheck();
            this.cdr.detectChanges();
        });
    }

    /** Re-vincula los comandos `$` cuya variable sigue existiendo (sin avisar). */
    private syncVariableCommands(): void {
        this.preset.settings.forEach(command => {
            const name = command.isVariable ? command.getVariableName() : null;
            if (name && VariableContext.context.has(name)) {
                command.setVariable(name);
            }
        });
    }

    private scheduleMissingVariableWarningCheck(): void {
        if (this.variableWarningScheduled) {
            return;
        }
        this.variableWarningScheduled = true;
        setTimeout(() => {
            this.variableWarningScheduled = false;
            if (!this.destroyed) {
                this.warnMissingCommandVariables();
            }
        }, 0);
    }

    private warnMissingCommandVariables(): void {
        this.preset.settings.forEach(command => {
            const name = command.isVariable ? command.getVariableName() : null;
            if (name && !VariableContext.context.has(name)) {
                console.warn(
                    `Variable ${name} used by setting ${command.type} no longer exists or is inaccessible.`
                );
            }
        });
    }

    private updateAvailableVariables(): void {
        this.availableVariables = buildAvailableVariables(this.playModeNames, this.scaleNames);
        this.stringVariables = buildStringVariables(this.playModeNames, this.scaleNames);
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
