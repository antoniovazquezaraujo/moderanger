import { Block } from './block';
import { BlockReference } from './block-reference';
import { InstrumentType } from "../services/audio-engine.service";

/**
 * Ítem directo del cuerpo de una `Part`: un bloque inline o una referencia a
 * una definición de la biblioteca `blocks`. La unión se discrimina por `kind`
 * (`'block'` / `'reference'`).
 */
export type PartItem = Block | BlockReference;

export class Part {
    static _id: number = 0;
    id = Part._id++;
    name: string = '';
    /**
     * Ítems de la parte en orden de reproducción: bloques inline y referencias
     * `use` a la biblioteca. Antes era `blocks: Block[]`; el renombrado hace
     * evidente la unión discriminada (ver ADR-002).
     */
    items: PartItem[] = [new Block()];
    instrumentType: InstrumentType = InstrumentType.PIANO;

    constructor() {

    }

    removeItem(item: PartItem) {
        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
        }
    }

    /** Elimina un bloque inline del cuerpo de la parte (azúcar de `removeItem`). */
    removeBlock(block: Block) {
        this.removeItem(block);
    }

    clone(): Part {
        const clonedPart = new Part();
        clonedPart.name = this.name;
        clonedPart.instrumentType = this.instrumentType;

        clonedPart.items = this.items.map(item => item.clone());

        return clonedPart;
    }

    toJSON() {
        return {
            id: this.id,
            items: this.items,
            instrumentType: this.instrumentType
        };
    }
}
