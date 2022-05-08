// import * as Parser from './parser';
import { Note, Rest, SoundBit } from './note';
import { BLOCK, Parser, BLOCK_CONTENT, NOTE, ASTKinds } from './parser';


export function parseTimedBlock(block: BLOCK, duration: number): SoundBit[] {
    let soundBits: SoundBit[] = [];
    soundBits = soundBits.concat(parseBlockContent(block.head, duration));
    block.tail.forEach(t => {
        soundBits = soundBits.concat(parseTimedBlock(t.content, duration));
    });
    return soundBits;
}
export function parseBlock(block: BLOCK): SoundBit[] {
    let soundBits: SoundBit[] = [];
    soundBits = soundBits.concat(parseBlockContent(block.head, 0));
    block.tail.forEach(t => {
        soundBits = soundBits.concat(parseBlock(t.content));
    });
    return soundBits;
}

export function parseBlockContent(blockContent: BLOCK_CONTENT, duration: number): SoundBit[] {

    if ((typeof blockContent)  === typeof ASTKinds.NOTE) {
        let soundBits: SoundBit[] = [];
        soundBits.push(parseNote(blockContent.value, duration));
        return soundBits;
    } else {
        return parseNoteGroup(blockContent.noteGroup, duration);
    }
}
export function parseNote(note: NOTE, duration: number): SoundBit {
    if (typeof note  === typeof ASTKinds.SIMPLE_NOTE_1) {
        return parseSimpleNote(note.value, duration);
    } else {
        return parseTimedNote(note.timedNote );
    }
}

export function parseSimpleNote(timedNote: any, duration: number): SoundBit {
    if (timedNote.kind === ASTKinds.SIMPLE_NOTE_1) {
        return new Note({ note: timedNote.noteValue, duration: timedNote.duration });
    } else { // SILENCE SIGN
        return new Rest( duration );
    }
}
export function parseTimedNote(timedNote: any): SoundBit {
    return parseSimpleNote(timedNote.value, timedNote.duration);
}
export function parseNoteGroup(noteGroup: any, duration: number): SoundBit[] {
    let soundBits: SoundBit[] = [];
    noteGroup.block.forEach((t: BLOCK) => {
        soundBits = soundBits.concat(parseTimedBlock(t, noteGroup.duration));
    });
    return soundBits;
}