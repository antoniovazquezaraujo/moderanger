import { NoteDuration } from '../../model/melody';

/** Duraciones ordenadas de más larga a más corta (la rueda las recorre en ciclo). */
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
 * Siguiente duración del ciclo cuando se gira la rueda sobre una nota.
 *
 * El ciclo completo incluye el estado "en blanco" (sin duración explícita, la
 * nota hereda la del grupo) situado entre `1n` y `8t`:
 *
 *   ... 2n → 1n → (en blanco) → 8t → 4t → ...
 *
 * - Con duración explícita, girar más allá de `1n` o `8t` deja la nota en
 *   blanco: es el comportamiento de diseño ("volver a heredar").
 * - Si la nota YA está en blanco (o su duración es desconocida/`''`), el giro
 *   nunca puede devolver "en blanco": se salta ese estado una vez para que la
 *   rueda siempre pueda volver a una duración explícita (antes, con fallback
 *   `1n` hacia larga o `8t` hacia corta, el ciclo quedaba bloqueado).
 *
 * @param current  Duración efectiva actual (explícita o la del grupo/editor).
 * @param isBlank  `true` si la nota no tiene duración explícita utilizable.
 * @param direction `longer` al girar hacia duraciones más largas, `shorter`
 *                  hacia más cortas.
 */
export function nextDuration(
    current: NoteDuration | undefined,
    isBlank: boolean,
    direction: DurationDirection,
    durations: readonly NoteDuration[] = DURATION_CYCLE
): NoteDuration | undefined {
    const cycle: Array<NoteDuration | undefined> = [undefined, ...durations];
    const rawIndex = current === undefined ? 0 : cycle.indexOf(current);
    const index = rawIndex === -1 ? 0 : rawIndex;
    const step = direction === 'longer' ? -1 : 1;

    const next = cycle[(index + step + cycle.length) % cycle.length];
    if (next === undefined && (isBlank || rawIndex === -1)) {
        // Ya estábamos en blanco (o el índice era inválido): saltar el estado
        // en blanco para no dejarlo nunca bloqueado.
        return cycle[(index + step * 2 + cycle.length * 2) % cycle.length];
    }
    return next;
}
