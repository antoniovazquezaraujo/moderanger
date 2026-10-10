import { NoteDuration } from '../../model/melody';

/** Duraciones ordenadas de más larga a más corta (orden interno estable). */
export const DURATION_CYCLE: readonly NoteDuration[] = ['1n', '2n', '4n', '8n', '16n', '4t', '8t'];

/** Sentido del giro de la rueda sobre la zona de duración. */
export type DurationDirection = 'longer' | 'shorter';

/**
 * Normaliza el valor de duración leído del modelo: solo los valores del ciclo
 * son válidos, así que `''`, `null` o un token desconocido se tratan como
 * "sin duración" (heredada) en lugar de romper el cálculo del índice.
 */
export function normalizeDuration(value: string | null | undefined): NoteDuration | undefined {
    return (DURATION_CYCLE as readonly string[]).includes(value ?? '') ? (value as NoteDuration) : undefined;
}

/**
 * Siguiente duración del anillo cuando se gira la rueda sobre una nota.
 *
 * El anillo tiene **8 estados**: las 7 duraciones más el estado "en blanco"
 * (sin duración explícita; la nota hereda la del grupo), situado entre `1n` y
 * `8t`:
 *
 *   (más larga) 1n → blanco → 8t (más corta)
 *
 * Cada sentido recorre el anillo **completo**: ambos pasan por los mismos 8
 * estados, uno al revés del otro:
 *
 *   largo:   8t → 4t → 16n → 8n → 4n → 2n → 1n → blanco → 8t → …
 *   corto:   blanco → 1n → 2n → 4n → 8n → 16n → 4t → 8t → blanco → …
 *
 * Desde blanco, girar hacia largo entra por `8t` y hacia corto por `1n`. No
 * hay reenganche por la duración del grupo ni por el `defaultDuration`: el
 * estado de la nota es solo el suyo (así los dos sentidos muestran siempre la
 * misma lista de valores).
 *
 * @param current   Duración explícita actual (`undefined`/`''`/desconocida =
 *                  en blanco).
 * @param direction `longer` o `shorter`.
 */
export function nextDuration(
    current: NoteDuration | string | null | undefined,
    direction: DurationDirection,
    durations: readonly NoteDuration[] = DURATION_CYCLE
): NoteDuration | undefined {
    const cycle: Array<NoteDuration | undefined> = [undefined, ...durations];
    const normalized = normalizeDuration(current);
    const rawIndex = normalized === undefined ? 0 : cycle.indexOf(normalized);
    const index = rawIndex === -1 ? 0 : rawIndex;
    const step = direction === 'longer' ? -1 : 1;
    return cycle[(index + step + cycle.length) % cycle.length];
}
