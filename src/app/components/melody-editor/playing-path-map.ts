/**
 * Mapeo entre el origen de una nota generada (`sourcePath`, ruta de índices en
 * el árbol de notas del bloque) y los elementos visuales del editor.
 *
 * El editor y el parser construyen el mismo árbol posicional (notas/silencios
 * y grupos anidados), así que la ruta exacta suele existir. Si no existe
 * (p. ej. el editor recibió los elementos por otra vía), se sube al ancestro
 * más cercano para no dejar el resaltado vacío ni romper nada.
 */
import { CompositeNote, GenericGroup, MusicElement } from '../../model/melody';

/** Clave estable de una ruta de índices (`[0,2]` → `'0.2'`). */
export function playingPathKey(path: readonly number[]): string {
  return path.join('.');
}

/** Mapa `ruta → id` de todos los nodos del árbol del editor. */
export function collectElementIdsByPath(
  elements: MusicElement[],
  parentPath: number[] = [],
  map: Map<string, string> = new Map<string, string>()
): Map<string, string> {
  elements.forEach((element, index) => {
    const path = [...parentPath, index];
    map.set(playingPathKey(path), element.id);
    if (element.type === 'group') {
      collectElementIdsByPath((element as GenericGroup).children ?? [], path, map);
    } else if (element.type === 'arpeggio' || element.type === 'chord') {
      collectElementIdsByPath((element as CompositeNote).notes ?? [], path, map);
    }
  });
  return map;
}

/**
 * Resuelve las rutas que están sonando a ids del editor. Para cada ruta usa el
 * ancestro más cercano disponible; las rutas sin ningún ancestro se ignoran.
 * El resultado puede contener ids de grupos (fallback), no solo de notas.
 */
export function resolvePlayingElementIds(
  elements: MusicElement[],
  playingPaths: ReadonlyArray<readonly number[]>
): Set<string> {
  const idsByPath = collectElementIdsByPath(elements);
  const ids = new Set<string>();
  for (const path of playingPaths) {
    for (let length = path.length; length >= 0; length--) {
      const id = idsByPath.get(playingPathKey(path.slice(0, length)));
      if (id !== undefined) {
        ids.add(id);
        break;
      }
    }
  }
  return ids;
}
