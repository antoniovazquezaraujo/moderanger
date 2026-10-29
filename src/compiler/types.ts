/**
 * Modelo compilado `.mr` → MIDI.
 *
 * No contiene objetos de Angular, Tone ni del navegador: solo números y
 * cadenas. El escritor MIDI consume este modelo y el compilador lo produce.
 */

/** Nota MIDI con posición y duración absolutas en ticks. */
export interface CompiledNote {
    /** Tick absoluto desde el inicio de la canción. */
    tick: number;
    /** Duración en ticks (siempre > 0). */
    durationTicks: number;
    /** Nota MIDI 0–127. */
    midi: number;
    /** Velocidad MIDI 1–127. */
    velocity: number;
}

/** Pista MIDI de una parte de la canción. */
export interface CompiledPart {
    /** Nombre visible de la parte (puede estar vacío). */
    name: string;
    /** Programa General MIDI; en v1 siempre 0 (Acoustic Grand Piano). */
    program: number;
    /** Canal MIDI 0–15. */
    channel: number;
    notes: CompiledNote[];
}

/** Canción lista para el escritor MIDI. */
export interface CompiledSong {
    title: string;
    bpm: number;
    /** Ticks por negra. */
    ppq: number;
    parts: CompiledPart[];
    /** Avisos no bloqueantes emitidos durante la compilación. */
    warnings: string[];
}
