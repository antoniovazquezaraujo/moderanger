import { Block, ContentResolver } from './block';
import { InstrumentType } from "./instrument-type";

/**
 * Parte de la canción: nombre, instrumento y una secuencia de bloques
 * estructurales. Ya no hay `BlockReference` ni `PartItem` (ADR-004).
 */
export class Part {
    static _id: number = 0;
    id = Part._id++;
    name: string = '';
    items: Block[] = [new Block()];
    instrumentType: InstrumentType = InstrumentType.PIANO;

    constructor() { }

    removeItem(item: Block): void {
        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
        }
    }

    /** Elimina un bloque del cuerpo de la parte (azúcar de `removeItem`). */
    removeBlock(block: Block): void {
        this.removeItem(block);
    }

    clone(resolver?: ContentResolver): Part {
        const clonedPart = new Part();
        clonedPart.name = this.name;
        clonedPart.instrumentType = this.instrumentType;
        clonedPart.items = this.items.map(item => item.clone(resolver));
        return clonedPart;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            items: this.items,
            instrumentType: this.instrumentType
        };
    }
}
