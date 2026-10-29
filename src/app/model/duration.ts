/**
 * Conversión pura de duraciones del DSL a segundos.
 *
 * Vive en el modelo (no en el compilador) para que el parser y la generación
 * de notas no dependan de `Tone.Time` y puedan ejecutarse también en Node.
 * El BPM solo escala el resultado; para comparar duraciones relativas da igual
 * el valor que se use.
 */

export const DEFAULT_DURATION_BPM = 120;

/**
 * Convierte `4n`, `8t`, `0.333s`, etc. a segundos.
 *
 * - `n`: figura binaria (negra = 1/4 de redonda).
 * - `t`: tresillo (2/3 de la figura equivalente).
 * - `s`: segundos explícitos.
 */
export function durationToSeconds(value: string | number, bpm: number = DEFAULT_DURATION_BPM): number {
    if (typeof value === 'number') {
        return value;
    }

    const trimmed = String(value).trim();

    const secondsMatch = /^([\d.]+)s$/.exec(trimmed);
    if (secondsMatch) {
        return parseFloat(secondsMatch[1]);
    }

    const noteMatch = /^([\d.]+)(n|t)$/.exec(trimmed);
    if (!noteMatch) {
        return 0;
    }

    const amount = parseFloat(noteMatch[1]);
    if (!amount) {
        return 0;
    }

    const quarterSeconds = 60 / bpm;
    const beats = (4 / amount) * (noteMatch[2] === 't' ? 2 / 3 : 1);
    return beats * quarterSeconds;
}
