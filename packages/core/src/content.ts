/**
 * Bibliotecas globales de contenido (ADR-004): melodías, presets y
 * procedimientos.
 *
 * Las tres entidades son **hojas**: no contienen bloques ni referencian otras
 * entidades. Un `Block` puede referenciar como máximo una de cada una; editar
 * la definición afecta a todas sus apariciones en la canción.
 */
import { BlockContent } from './block.content';
import { cloneCommand, Command } from './command';
import { BaseOperation, cloneOperation, VaryOperation } from './operation';

/** Alias de dominio para una entrada de `Preset` (antes `Command`). */
export type Setting = Command;

/**
 * Colección ordenada y reutilizable de notas. La gramática es la misma que la
 * sección `notes` del `.mr`; `BlockContent` se conserva internamente para no
 * duplicar la lógica de notas variables y duración por defecto.
 */
export class Melody {
    static _id: number = 0;
    id: number = Melody._id++;
    label: string = '';
    readonly content: BlockContent = new BlockContent();

    get notes(): string {
        return this.content.notes;
    }

    set notes(value: string) {
        this.content.notes = value;
    }

    get defaultDuration(): string | undefined {
        return this.content.defaultDuration;
    }

    set defaultDuration(value: string | undefined) {
        this.content.defaultDuration = value;
    }

    get isVariable(): boolean {
        return this.content.isVariable;
    }

    get variableName(): string {
        return this.content.variableName;
    }

    setVariableReference(name: string): void {
        this.content.setVariableReference(name);
    }

    clone(): Melody {
        const cloned = new Melody();
        cloned.label = this.label;
        if (this.content.isVariable) {
            cloned.content.setVariableReference(this.content.variableName);
        } else {
            cloned.content.notes = this.content.notes;
        }
        cloned.content.defaultDuration = this.content.defaultDuration;
        return cloned;
    }

    toJSON() {
        return {
            id: this.id,
            label: this.label,
            notes: this.notes,
            isVariable: this.isVariable,
            variableName: this.variableName,
            defaultDuration: this.defaultDuration
        };
    }
}

/** Colección ordenada y reutilizable de ajustes de reproducción. */
export class Preset {
    static _id: number = 0;
    id: number = Preset._id++;
    label: string = '';
    settings: Setting[] = [];

    clone(): Preset {
        const cloned = new Preset();
        cloned.label = this.label;
        cloned.settings = this.settings.map(cloneCommand);
        return cloned;
    }

    toJSON() {
        return {
            id: this.id,
            label: this.label,
            settings: this.settings
        };
    }
}

/** Colección ordenada y reutilizable de operaciones (`VARY`, `ASSIGN`, …). */
export class Procedure {
    static _id: number = 0;
    id: number = Procedure._id++;
    label: string = '';
    operations: BaseOperation[] = [];

    clone(): Procedure {
        const cloned = new Procedure();
        cloned.label = this.label;
        cloned.operations = this.operations.map(cloneOperation);
        return cloned;
    }

    toJSON() {
        return {
            id: this.id,
            label: this.label,
            operations: this.operations.map(operation => ({
                type: operation instanceof VaryOperation ? 'VARY' : 'ASSIGN',
                variableName: operation.variableName,
                value: operation.value
            }))
        };
    }
}

export type ContentKind = 'melody' | 'preset' | 'procedure';
