/**
 * Utilidades de presentación compartidas por los editores de presets y
 * procedimientos.
 *
 * Todo lo de este módulo es lógica de vista (opciones de variables, etiquetas
 * legibles y canonicalización del texto de DECORATION). El modelo y el `.mr`
 * siguen usando los enums y valores de dominio sin cambios.
 */
import { Command, CommandType } from 'src/app/model/command';
import { getPlayModeNames } from 'src/app/model/play.mode';
import { Scale } from 'src/app/model/scale';
import { VariableContext } from 'src/app/model/variable.context';
import { canonicalDecoration } from 'src/app/model/mr/decoration.parser';

export interface VariableOption {
    label: string;
    value: string;
}

/** `INV` → `Inv`, `PATTERN_GAP` → `Pattern gap`. */
export function commandTypeLabel(type: string): string {
    const words = type.toLowerCase().replace(/_/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Descripciones breves de los ajustes para la ayuda contextual de la GUI. */
const COMMAND_DESCRIPTIONS: Record<string, string> = {
    OCT: 'Base octave used to interpret melody degrees.',
    SCALE: 'Scale used to turn degrees into notes.',
    GAP: 'Distance between generated chord notes.',
    PLAYMODE: 'How notes are generated: single note, chord, arpeggio…',
    INV: 'Chord inversion: moves the first notes up an octave.',
    WIDTH: 'Number of notes in the chord (0 = one note).',
    KEY: 'Key: semitones added to generated notes.',
    SHIFTSTART: 'First note in the octave-shift window.',
    SHIFTSIZE: 'Number of notes in the shift window.',
    SHIFTVALUE: 'Octaves added to the window; may be negative.',
    PATTERN_GAP: 'Pattern separator (deprecated; no effect).',
    PATTERN: 'Pattern melody used instead of normal generation.',
    DECORATION: 'Ornaments applied to chord or arpeggio notes.',
    SHIFT: 'Octave-shift window: Start, Size and Value together.'
};

/** Descripción corta de un tipo de ajuste (incluye el grupo sintético SHIFT). */
export function commandTypeDescription(type: string): string {
    return COMMAND_DESCRIPTIONS[type] ?? 'Playback setting.';
}

/** Tipos que forman el grupo Shift en la GUI. */
export const SHIFT_COMMAND_TYPES: readonly CommandType[] = [
    CommandType.SHIFTSTART,
    CommandType.SHIFTSIZE,
    CommandType.SHIFTVALUE
];

/** Crea los tres ajustes del grupo Shift con valores neutros. */
export function createShiftCommands(): Command[] {
    return SHIFT_COMMAND_TYPES.map(type => new Command({ type, value: 0 }));
}

export interface VariableAwareCommand {
    isVariable: boolean;
    getVariableName(): string | null;
}

/**
 * El `:` de la lectura se oculta cuando el control de valor es un select de
 * variable en estado placeholder: sin valor elegido no hay nada que separar.
 */
export function showCommandColon(command: VariableAwareCommand): boolean {
    return !(command.isVariable && !command.getVariableName());
}

export function showOperationColon(operation: { variableName: string }): boolean {
    return !!operation.variableName;
}

/**
 * Valor de un comando `DECORATION` en la GUI. El editor de melodía emite texto
 * de notas; antes de guardarlo se canonicaliza. Si todavía no es parseable se
 * conserva tal cual para poder seguir editando.
 */
export function canonicalDecorationValueOrRaw(value: string): string {
    try {
        return canonicalDecoration(value);
    } catch {
        return value;
    }
}

export function resolveEditorOptions(): {
    playModeNames: string[];
    scaleNames: string[];
} {
    return {
        playModeNames: getPlayModeNames(),
        scaleNames: Scale.getScaleNames()
    };
}

export function buildAvailableVariables(
    playModeNames: readonly string[],
    scaleNames: readonly string[]
): VariableOption[] {
    return Array.from(VariableContext.context.entries())
        .filter(([, value]) => {
            if (typeof value === 'string') {
                return playModeNames.includes(value) || scaleNames.includes(value);
            }
            return typeof value === 'number';
        })
        .map(([name, value]) => ({
            label: `${name} (${value})`,
            value: name
        }));
}

/** Variables string libres (no playmode/escala): patrones/melodías. */
export function buildStringVariables(
    playModeNames: readonly string[],
    scaleNames: readonly string[]
): VariableOption[] {
    return Array.from(VariableContext.context.entries())
        .filter(([, value]) =>
            typeof value === 'string' &&
            !playModeNames.includes(value) &&
            !scaleNames.includes(value)
        )
        .map(([name, value]) => ({ label: `${name} (${value})`, value: name }));
}

export function isVariableOfType(
    variableName: string,
    type: 'number' | 'playmode' | 'scale',
    playModeNames: readonly string[],
    scaleNames: readonly string[]
): boolean {
    if (!variableName) {
        return false;
    }
    const value = VariableContext.getValue(variableName);
    if (value === undefined) {
        return false;
    }
    if (type === 'scale') {
        return typeof value === 'string' && scaleNames.includes(value);
    }
    if (type === 'number') {
        return typeof value === 'number';
    }
    return typeof value === 'string' && playModeNames.includes(value);
}

export function filterVariables(
    command: Command,
    available: readonly VariableOption[],
    stringVariables: readonly VariableOption[],
    playModeNames: readonly string[],
    scaleNames: readonly string[]
): VariableOption[] {
    if (command.type === CommandType.PATTERN || command.type === CommandType.DECORATION) {
        return [...stringVariables];
    }
    return available.filter(variable => {
        if (command.type === CommandType.PLAYMODE) {
            return isVariableOfType(variable.value, 'playmode', playModeNames, scaleNames);
        }
        if (command.type === CommandType.SCALE) {
            return isVariableOfType(variable.value, 'scale', playModeNames, scaleNames);
        }
        return isVariableOfType(variable.value, 'number', playModeNames, scaleNames);
    });
}

export function defaultCommandValue(
    type: CommandType,
    playModeNames: readonly string[],
    scaleNames: readonly string[]
): string | number {
    if (type === CommandType.PLAYMODE) {
        return playModeNames[0] || 'CHORD';
    }
    if (type === CommandType.SCALE) {
        return scaleNames[0] || 'WHITE';
    }
    if (type === CommandType.PATTERN || type === CommandType.DECORATION) {
        return '';
    }
    return 0;
}
