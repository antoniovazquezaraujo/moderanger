// import * as Parser from './parser';
import { Note, Rest, NoteData } from './note';
import { ASTKinds, BLOCK, BLOCK_CONTENT, NOTE, NOTE_GROUP, SIMPLE_NOTE } from './parser';

export function parseBlock(block: BLOCK, duration: string, soundBits: NoteData[]): NoteData[] {
    soundBits = parseBlockContent(block.head, duration, soundBits);
    block.tail.forEach(t => {
        soundBits = parseBlock(t.content, duration, soundBits);
    });
    return soundBits;
} 
 
export function parseBlockContent(blockContent: BLOCK_CONTENT, duration:string, soundBits: NoteData[]): NoteData[] {
    if ((blockContent.kind === ASTKinds.BLOCK_CONTENT_2)) { //note
        soundBits.push(parseNote(blockContent.note, duration));
        return soundBits;
    } else { //note_group
        return parseNoteGroup(blockContent.noteGroup, duration, soundBits);
    }
}
export function parseNote(note: NOTE, duration:string): NoteData {
    let finalDuration = duration;
    if(note.duration !== null){
        finalDuration = note.duration.value;
    }
    return parseSimpleNote(note.simpleNote, finalDuration!);
}  
export function parseSimpleNote(simpleNote: SIMPLE_NOTE, theDuration: string): NoteData {
    if (simpleNote.kind === ASTKinds.SIMPLE_NOTE_2) {
        return new NoteData({type:'note', duration:theDuration, note: parseInt(simpleNote.note)});
    } else { //silence
        return new NoteData({type:'rest', duration:theDuration});
    }
}
export function parseNoteGroup(noteGroup: NOTE_GROUP, duration:string, soundBits: NoteData[]): NoteData[] {
    return parseBlock(noteGroup.block, noteGroup.duration.value, soundBits);
}
