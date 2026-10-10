/**
 * Reparto de anchos entre parts vecinas al arrastrar un splitter.
 *
 * Es lógica pura (sin DOM) para poder probarla en Jest: el componente mide
 * los anchos en px y delega aquí el cálculo del nuevo par (izquierda/derecha).
 */

/** Ancho mínimo de una part (sincronizado con `min-width` en CSS). */
export const MIN_PART_WIDTH = 260;

/** Paso de teclado (flechas ←/→) sobre el splitter. */
export const KEYBOARD_RESIZE_STEP = 20;

/**
 * Aplica el desplazamiento `delta` al borde entre dos parts manteniendo la
 * suma de anchos y respetando el mínimo por part. El resultado no da saltos:
 * el borde sigue al puntero hasta topar con un clamp.
 *
 * @param left  Ancho actual de la part izquierda (px).
 * @param right Ancho actual de la part derecha (px).
 * @param delta Desplazamiento horizontal del puntero (px).
 * @param minWidth Mínimo por part (por defecto `MIN_PART_WIDTH`).
 */
export function clampBoundary(
    left: number,
    right: number,
    delta: number,
    minWidth: number = MIN_PART_WIDTH
): { left: number; right: number } {
    const total = left + right;
    // Si las dos parts no suman 2×min (contenedor muy estrecho), se reparte a
    // la mitad para no dejar el borde bloqueado.
    const min = Math.min(minWidth, Math.floor(total / 2));
    const newLeft = Math.min(Math.max(left + delta, min), total - min);
    const roundedLeft = Math.round(newLeft);
    return { left: roundedLeft, right: Math.round(total) - roundedLeft };
}
