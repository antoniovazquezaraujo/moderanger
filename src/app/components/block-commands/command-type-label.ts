/**
 * Etiqueta legible para los tipos de comando/operación en la GUI
 * (`INV` → `Inv`, `PATTERN` → `Pattern`, `PATTERN_GAP` → `Pattern gap`).
 *
 * Es solo presentación: el valor del modelo y el `.mr` siguen usando el
 * enum en mayúsculas; no se toca parser ni modelo.
 */
export function commandTypeLabel(type: string): string {
  const words = type.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
