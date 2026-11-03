import type { Block } from './block';
import type { BlockReference } from './block-reference';

/**
 * Nodo del árbol de una parte o de un bloque: un bloque inline o una
 * referencia `use` a una definición de `blocks`.
 *
 * Es una unión discriminada por `kind` (`'block'` / `'reference'`). Las
 * referencias son hojas: no tienen `children`.
 */
export type SongNode = Block | BlockReference;

export function isBlock(node: SongNode): node is Block {
  return node.kind === 'block';
}

export function isBlockReference(node: SongNode): node is BlockReference {
  return node.kind === 'reference';
}
