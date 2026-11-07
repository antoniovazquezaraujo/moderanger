import { Melody, Preset, Procedure } from './content';

/**
 * Resolución de referencias de contenido al clonar. `Song.clone` construye un
 * mapa para que las copias de los bloques apunten a las copias de las
 * bibliotecas (y no compartan estado entre canciones).
 */
export interface ContentResolver {
    melody?: (melody: Melody) => Melody;
    preset?: (preset: Preset) => Preset;
    procedure?: (procedure: Procedure) => Procedure;
}

/**
 * Bloque estructural: posición en la canción, repeticiones y anidación.
 *
 * El contenido vive en las bibliotecas globales. Un bloque puede referenciar
 * como máximo una melodía, un preset y un procedimiento; los hijos aportan la
 * secuencia. No hay contenido inline ni referencias entre bloques (ADR-004).
 */
export class Block {
    static _id: number = 0;
    id: number = Block._id++;
    /** Etiqueta opcional, solo para la GUI; no es una referencia global. */
    label: string = '';
    pulse: number = 0;
    repeatingTimes: number = 1;
    melody?: Melody;
    preset?: Preset;
    procedure?: Procedure;
    children: Block[] = [];

    constructor() { }

    /**
     * `true` si el bloque tiene contenido propio que merece una fila visible
     * (label o alguna referencia de contenido). Un bloque sin contenido actúa
     * como contenedor: la GUI pinta únicamente a sus hijos.
     */
    hasOwnContent(): boolean {
        return (
            (this.label ?? '').trim() !== '' ||
            this.melody !== undefined ||
            this.preset !== undefined ||
            this.procedure !== undefined
        );
    }

    /** Ejecuta las operaciones del procedimiento referenciado (si existe). */
    executeProcedure(): void {
        this.procedure?.operations.forEach(operation => {
            try {
                operation.execute();
            } catch (error) {
                console.error(`Error executing operation:`, error);
            }
        });
    }

    removeBlock(block: Block): void {
        const index = this.children.indexOf(block);
        if (index !== -1) {
            this.children.splice(index, 1);
        }
    }

    /**
     * Copia del bloque. Las referencias de contenido se comparten por defecto:
     * melodías, presets y procedimientos pertenecen a la biblioteca de la
     * canción y editar la definición debe afectar a todas las apariciones.
     * Con `resolver`, la copia apunta a la entidad indicada (lo usa
     * `Song.clone` para resolver contra las bibliotecas clonadas).
     */
    clone(resolver?: ContentResolver): Block {
        const cloned = new Block();
        cloned.label = this.label;
        cloned.pulse = this.pulse;
        cloned.repeatingTimes = this.repeatingTimes;

        if (this.melody !== undefined) {
            cloned.melody = resolver?.melody ? resolver.melody(this.melody) : this.melody;
        }
        if (this.preset !== undefined) {
            cloned.preset = resolver?.preset ? resolver.preset(this.preset) : this.preset;
        }
        if (this.procedure !== undefined) {
            cloned.procedure = resolver?.procedure ? resolver.procedure(this.procedure) : this.procedure;
        }
        cloned.children = this.children.map(child => child.clone(resolver));
        return cloned;
    }

    toJSON() {
        return {
            id: this.id,
            label: this.label,
            pulse: this.pulse,
            repeatingTimes: this.repeatingTimes,
            melody: this.melody?.label ?? null,
            preset: this.preset?.label ?? null,
            procedure: this.procedure?.label ?? null,
            children: this.children
        };
    }
}
