import { Note, Rest, SoundBit } from './note';
import { ASTKinds, BLOCK, BLOCK_CONTENT, NOTE, NOTE_GROUP, SIMPLE_NOTE } from './block.parser';

export function parseBlock(block: BLOCK, duration: string, soundBits: SoundBit[]): SoundBit[] {
  soundBits = parseBlockContent(block.head, duration, soundBits);
  block.tail.forEach(t => {
    soundBits = parseBlock(t.content, duration, soundBits);
  });
  return soundBits;
}

export function parseBlockContent(blockContent: BLOCK_CONTENT, duration: string, soundBits: SoundBit[]): SoundBit[] {
  if ((blockContent.kind === ASTKinds.BLOCK_CONTENT_2)) { //note
    soundBits.push(parseNote(blockContent.note, duration));
    return soundBits;
  } else { //note_group
    return parseNoteGroup(blockContent.noteGroup, duration, soundBits);
  }
}
export function parseNote(note: NOTE, duration: string): SoundBit {
  let finalDuration = duration;
  if (note.duration !== null) {
    finalDuration = note.duration.value;
  }
  return parseSimpleNote(note.simpleNote, finalDuration!);
}
export function parseSimpleNote(simpleNote: SIMPLE_NOTE, duration: string): SoundBit {
  if (simpleNote.kind === ASTKinds.SIMPLE_NOTE_2) {
    return new Note(duration, parseInt(simpleNote.note));
  } else { //silence
    return new Rest(duration);
  }
}
export function parseNoteGroup(noteGroup: NOTE_GROUP, duration: string, soundBits: SoundBit[]): SoundBit[] {
  return parseBlock(noteGroup.block, noteGroup.duration.value, soundBits);
}
