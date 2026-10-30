/**
 * Instrumentos disponibles en el modelo.
 *
 * Vive fuera de `audio-engine.service.ts` para que el modelo (y el
 * compilador MIDI) no arrastren Angular ni Tone al importar `Part`.
 */
export enum InstrumentType {
    PIANO = 'Piano'
}
