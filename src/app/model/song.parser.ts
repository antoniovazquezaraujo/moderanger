// import * as Parser from './parser';
import { NoteData } from './note';
import { ASTKinds, BLOCK, BLOCK_CONTENT, NOTE, NOTE_GROUP, SIMPLE_NOTE } from './parser';

export function parseBlock(block: BLOCK, duration: string, noteDatas: NoteData[]): NoteData[] {
    noteDatas = parseBlockContent(block.head, duration, noteDatas);
    block.tail.forEach(t => {
        noteDatas = parseBlock(t.content, duration, noteDatas);
    });
    return noteDatas;
} 
 
export function parseBlockContent(blockContent: BLOCK_CONTENT, duration:string, noteDatas: NoteData[]): NoteData[] {
    if ((blockContent.kind === ASTKinds.BLOCK_CONTENT_2)) { //note
        noteDatas.push(parseNote(blockContent.note, duration));
        return noteDatas;
    } else { //note_group
        return parseNoteGroup(blockContent.noteGroup, duration, noteDatas);
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
export function parseNoteGroup(noteGroup: NOTE_GROUP, duration:string, noteDatas: NoteData[]): NoteData[] {
    return parseBlock(noteGroup.block, noteGroup.duration.value, noteDatas);
}
