import { CompiledPart, CompiledSong } from './types';

/** Evento MIDI ya resuelto a tick absoluto. */
interface TimedEvent {
    tick: number;
    /** Menor se escribe antes cuando comparten tick. */
    priority: number;
    bytes: number[];
}

const NOTE_OFF_PRIORITY = 10;
const NOTE_ON_PRIORITY = 20;

/**
 * Escribe un Standard MIDI File tipo 1.
 *
 * - Pista 0: conductor (nombre, tempo y compás 4/4).
 * - Una pista por parte, con su `program change`, nombre y notas.
 * - Los `note off` se ordenan antes que los `note on` del mismo tick para que
 *   una nota repetida no se corte inmediatamente.
 */
export function buildMidi(song: CompiledSong): Buffer {
    if (song.parts.length > 16) {
        throw new Error(`MIDI admite como máximo 16 partes (canales); la canción tiene ${song.parts.length}.`);
    }

    const tracks: Buffer[] = [];
    tracks.push(buildConductorTrack(song));
    song.parts.forEach(part => tracks.push(buildPartTrack(part)));

    const header = Buffer.alloc(14);
    header.write('MThd', 0, 'ascii');
    header.writeUInt32BE(6, 4);
    header.writeUInt16BE(1, 8); // format 1
    header.writeUInt16BE(tracks.length, 10);
    header.writeUInt16BE(song.ppq, 12);

    return Buffer.concat([header, ...tracks]);
}

function buildConductorTrack(song: CompiledSong): Buffer {
    const events: TimedEvent[] = [
        metaEvent(0, 0x03, textBytes(song.title || 'Untitled Song')),
        metaEvent(0, 0x51, tempoBytes(song.bpm)),
        metaEvent(0, 0x58, [4, 2, 24, 8]) // 4/4
    ];
    return buildTrack(events, 0);
}

function buildPartTrack(part: CompiledPart): Buffer {
    if (part.channel < 0 || part.channel > 15) {
        throw new Error(`Canal MIDI fuera de rango para la parte '${part.name}': ${part.channel}.`);
    }
    const events: TimedEvent[] = [
        metaEvent(0, 0x03, textBytes(part.name || `Part ${part.channel + 1}`)),
        {
            tick: 0,
            priority: 5,
            bytes: [0xc0 | part.channel, part.program & 0x7f]
        }
    ];

    part.notes.forEach(note => {
        if (!Number.isInteger(note.midi) || note.midi < 0 || note.midi > 127) {
            throw new Error(`Nota MIDI inválida en la parte '${part.name}': ${note.midi}.`);
        }
        const duration = Math.max(1, Math.round(note.durationTicks));
        const velocity = Math.max(1, Math.min(127, Math.round(note.velocity)));
        events.push({
            tick: note.tick,
            priority: NOTE_ON_PRIORITY,
            bytes: [0x90 | part.channel, note.midi, velocity]
        });
        events.push({
            tick: note.tick + duration,
            priority: NOTE_OFF_PRIORITY,
            bytes: [0x80 | part.channel, note.midi, 0]
        });
    });

    const endTick = part.notes.reduce((max, note) => Math.max(max, note.tick + Math.max(1, note.durationTicks)), 0);
    return buildTrack(events, endTick);
}

function metaEvent(tick: number, type: number, data: number[]): TimedEvent {
    return {
        tick,
        priority: 0,
        bytes: [0xff, type, ...vlq(data.length), ...data]
    };
}

function buildTrack(events: TimedEvent[], endTick: number): Buffer {
    const sorted = [...events].sort((a, b) => a.tick - b.tick || a.priority - b.priority);
    const chunks: Buffer[] = [];
    let previousTick = 0;

    sorted.forEach(event => {
        const tick = Math.max(previousTick, Math.round(event.tick));
        chunks.push(Buffer.from(vlq(tick - previousTick)));
        chunks.push(Buffer.from(event.bytes));
        previousTick = tick;
    });

    const end = Math.max(previousTick, Math.round(endTick));
    chunks.push(Buffer.from(vlq(end - previousTick)));
    chunks.push(Buffer.from([0xff, 0x2f, 0x00]));

    const body = Buffer.concat(chunks);
    const header = Buffer.alloc(8);
    header.write('MTrk', 0, 'ascii');
    header.writeUInt32BE(body.length, 4);
    return Buffer.concat([header, body]);
}

/** Entero a variable-length quantity MIDI. */
function vlq(value: number): number[] {
    let remaining = Math.max(0, Math.round(value));
    const bytes = [remaining & 0x7f];
    remaining >>>= 7;
    while (remaining > 0) {
        bytes.unshift((remaining & 0x7f) | 0x80);
        remaining >>>= 7;
    }
    return bytes;
}

function tempoBytes(bpm: number): number[] {
    const micros = Math.max(1, Math.round(60_000_000 / bpm));
    return [(micros >> 16) & 0xff, (micros >> 8) & 0xff, micros & 0xff];
}

function textBytes(text: string): number[] {
    return Array.from(Buffer.from(text, 'utf8'));
}
