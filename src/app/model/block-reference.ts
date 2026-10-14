import { cloneCommand, Command } from './command';
import { AssignOperation, BaseOperation, cloneOperation, VaryOperation } from './operation';

/**
 * Referencia a una definición de la biblioteca `blocks` (sintaxis `use`).
 *
 * Una `BlockReference` es un ítem directo del cuerpo de una `Part` (junto a los
 * `Block` inline): representa "toca la definición `targetLabel`", con sus
 * propios `commands`/`operations` de llamada y sus repeticiones. No admite
 * `notes` ni bloques hijos en v1 (el material viene de la definición).
 *
 * `kind` es el discriminador de la unión `PartItem` (`Block | BlockReference`).
 */
export class BlockReference {
    static _id: number = 0;
    id: number = BlockReference._id++;
    readonly kind: 'reference' = 'reference';
    /** Nombre de la definición referenciada (label de `Song.blocks`). */
    targetLabel: string = '';
    /** Repeticiones de la llamada (`repeats`); el total de pasadas es N × las de la definición. */
    repeatingTimes: number = 1;
    /** Comandos propios de la llamada; se ejecutan tras los de la definición. */
    commands: Command[] = [];
    /** Operaciones propias de la llamada; se ejecutan tras las de la definición. */
    operations: BaseOperation[] = [];

    constructor() {

    }

    clone(): BlockReference {
        const cloned = new BlockReference();
        cloned.targetLabel = this.targetLabel;
        cloned.repeatingTimes = this.repeatingTimes;
        cloned.commands = this.commands.map(cloneCommand);
        cloned.operations = this.operations.map(cloneOperation);
        return cloned;
    }

    toJSON() {
        return {
            id: this.id,
            kind: this.kind,
            targetLabel: this.targetLabel,
            repeatingTimes: this.repeatingTimes,
            commands: this.commands,
            operations: this.operations.map(operation => {
                return {
                    type: operation instanceof VaryOperation ? 'VARY' :
                        operation instanceof AssignOperation ? 'ASSIGN' : 'UNKNOWN',
                    variableName: operation.variableName,
                    value: operation.value
                };
            })
        };
    }
}
