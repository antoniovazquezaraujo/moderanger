import { durationToSeconds } from './timing';

export interface CapturedNoteEvent {
    instrumentId: string;
    /** Nota MIDI. */
    midi: number;
    /** Duración en notación del DSL o en segundos (`0.333s`). */
    duration: string | number;
    /** Inicio absoluto en segundos. */
    time: number;
}

interface CapturedLoop {
    id: string;
    callback: (time: number) => void;
}

/**
 * Motor de audio de captura para el compilador.
 *
 * Implementa la superficie de `AudioEngineService` que usa `SongPlayer`, pero
 * no reproduce nada: guarda los `triggerAttackRelease` y permite avanzar el
 * loop del scheduler manualmente. Así el compilador reutiliza exactamente la
 * semántica del player (repeticiones, referencias, comandos, operaciones,
 * acordes, arpegios y PATTERN) sin depender de Tone ni del navegador.
 */
export class CaptureAudioEngine {
    bpm = 120;
    stopped = false;

    readonly notes: CapturedNoteEvent[] = [];
    readonly instrumentIds: string[] = [];

    private currentTime = 0;
    private nextInstrumentId = 0;
    private nextLoopId = 0;
    private nextListenerId = 0;
    private readonly loops = new Map<string, CapturedLoop>();
    private readonly stopListeners = new Map<string, () => void>();

    async createInstrument(_type: unknown): Promise<string> {
        const id = `capture-instrument-${this.nextInstrumentId++}`;
        this.instrumentIds.push(id);
        return id;
    }

    midiToFrequency(midi: number): number {
        // El compilador no necesita frecuencias: conserva el número MIDI.
        return midi;
    }

    triggerAttackRelease(
        instrumentId: string,
        noteOrFreq: number | number[],
        duration: string | number,
        time?: number
    ): void {
        const notes = Array.isArray(noteOrFreq) ? noteOrFreq : [noteOrFreq];
        notes.forEach(midi => {
            this.notes.push({
                instrumentId,
                midi,
                duration,
                time: time ?? this.currentTime
            });
        });
    }

    onTransportStop(listener: () => void): string {
        const id = `capture-stop-${this.nextListenerId++}`;
        this.stopListeners.set(id, listener);
        return id;
    }

    offTransportStop(listenerId: string): void {
        this.stopListeners.delete(listenerId);
    }

    cancelTransportEvents(): void {
        // No hay eventos de Transport que cancelar.
    }

    stopTransport(_stopTime?: unknown): void {
        this.stopped = true;
        // El player espera el evento `stop` para limpiar su estado. Se emite
        // una sola vez, como Tone.
        const listeners = Array.from(this.stopListeners.values());
        listeners.forEach(listener => listener());
    }

    setTransportBpm(bpm: number): void {
        this.bpm = bpm;
    }

    getTransportBpm(): number {
        return this.bpm;
    }

    setTransportPosition(_position: unknown): void {
        // El compilador siempre empieza en 0.
    }

    getTransportTime(): number {
        return this.currentTime;
    }

    timeToSeconds(duration: string | number): number {
        return durationToSeconds(duration, this.bpm);
    }

    scheduleLoop(callback: (time: number) => void, _interval: string | number): string {
        const id = `capture-loop-${this.nextLoopId++}`;
        this.loops.set(id, { id, callback });
        return id;
    }

    startLoop(_loopId: string, _startTime?: unknown): void {
        // El compilador ejecuta el callback manualmente.
    }

    stopLoop(loopId: string): void {
        // Se conserva hasta que `disposeLoop` lo elimine; el flag `stopped`
        // corta el bucle del compilador.
        void loopId;
    }

    disposeLoop(loopId: string): void {
        this.loops.delete(loopId);
    }

    async startTransport(_startTime?: unknown): Promise<void> {
        // Sin audio real.
    }

    getTransportContextState(): string {
        return 'running';
    }

    disposeInstrument(_instrumentId: string): void {
        // Sin recursos que liberar.
    }

    stopInstrumentNotes(_instrumentId: string): void {
        // Sin audio real.
    }

    /** `true` mientras quede un loop programado. */
    hasLoop(): boolean {
        return this.loops.size > 0;
    }

    /** Ejecuta un tick del loop con el tiempo indicado. */
    runLoopTick(timeSeconds: number): void {
        this.currentTime = timeSeconds;
        const loop = Array.from(this.loops.values())[0];
        if (loop) {
            loop.callback(timeSeconds);
        }
    }
}
