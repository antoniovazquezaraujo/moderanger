import { Block } from './block';
import { BlockReference } from './block-reference';
import { Part, PartItem } from './part';
import { Song } from './song';

/**
 * Helpers de la biblioteca de bloques reutilizables (`Song.blocks`) para la
 * GUI de la fase 2 (ADR-002): búsqueda de definiciones, usos de una definición
 * y renombrado en cascada. Funciones puras y pequeñas, sin estado, para que la
 * vista no manipule directamente la unión `Block | BlockReference`.
 */

/** Definiciones de la biblioteca de la canción (nunca `undefined`). */
export function blockDefinitions(song: Song): Block[] {
  return song?.blocks ?? [];
}

/** Definición de la biblioteca con ese label exacto, si existe. */
export function findBlockDefinition(song: Song, label: string): Block | undefined {
  return blockDefinitions(song).find(definition => definition.label === label);
}

/** Una referencia a una definición, con la parte en la que vive. */
export interface BlockUsage {
  /** Índice de la part dentro de la canción. */
  partIndex: number;
  /** Parte que contiene la referencia. */
  part: Part;
  /** Nombre visible de la part (puede estar vacío). */
  partName: string;
  /** La referencia concreta (ítem de `Part.items`). */
  reference: BlockReference;
}

/** Todas las referencias `use` de la canción que apuntan a `label`. */
export function blockUsages(song: Song, label: string): BlockUsage[] {
  const usages: BlockUsage[] = [];
  (song?.parts ?? []).forEach((part, partIndex) => {
    (part.items ?? []).forEach((item: PartItem) => {
      if (item.kind === 'reference' && item.targetLabel === label) {
        usages.push({ partIndex, part, partName: part.name, reference: item });
      }
    });
  });
  return usages;
}

/** `true` si `label` no está vacío y ninguna otra definición lo usa. */
export function isBlockLabelAvailable(song: Song, label: string, except?: Block): boolean {
  const trimmed = (label ?? '').trim();
  if (trimmed === '') {
    return false;
  }
  return !blockDefinitions(song).some(definition => definition !== except && definition.label === label);
}

/**
 * Renombra una definición y actualiza en cascada todas las referencias que
 * apuntaban a su label anterior. Devuelve `false` (sin tocar nada) si el nuevo
 * label está vacío o ya lo usa otra definición.
 */
export function renameBlockDefinition(song: Song, definition: Block, oldLabel: string, newLabel: string): boolean {
  if (oldLabel === newLabel) {
    return true;
  }
  if (!isBlockLabelAvailable(song, newLabel, definition)) {
    return false;
  }
  definition.label = newLabel;
  (song?.parts ?? []).forEach(part => {
    (part.items ?? []).forEach(item => {
      if (item.kind === 'reference' && item.targetLabel === oldLabel) {
        item.targetLabel = newLabel;
      }
    });
  });
  return true;
}

/** Label por defecto libre para una nueva definición (`Block 1`, `Block 2`…). */
export function nextBlockLabel(song: Song): string {
  let index = blockDefinitions(song).length + 1;
  while (!isBlockLabelAvailable(song, `Block ${index}`)) {
    index++;
  }
  return `Block ${index}`;
}

/** Crea una definición nueva con un label libre (o el propuesto, si lo está). */
export function createBlockDefinition(song: Song, label?: string): Block {
  const definition = new Block();
  definition.label = label !== undefined && isBlockLabelAvailable(song, label) ? label : nextBlockLabel(song);
  return definition;
}

/** Crea una referencia `use` a `targetLabel` (reutiliza el constructor del modelo). */
export function createBlockReference(targetLabel: string): BlockReference {
  const reference = new BlockReference();
  reference.targetLabel = targetLabel;
  return reference;
}

/**
 * Elimina una definición de la biblioteca **y** todas sus referencias (para no
 * dejar `use` huérfanos que el parser no aceptaría). Devuelve cuántas
 * referencias se han eliminado.
 */
export function removeBlockDefinition(song: Song, definition: Block): number {
  const usages = blockUsages(song, definition.label);
  usages.forEach(usage => {
    const { part } = usage;
    // `forEach` sobre una copia (`blockUsages`) para no mutar el array en curso.
    part.removeItem(usage.reference);
  });
  const removed = usages.length;
  const index = (song.blocks ?? []).indexOf(definition);
  if (index !== -1) {
    song.blocks.splice(index, 1);
  }
  return removed;
}
