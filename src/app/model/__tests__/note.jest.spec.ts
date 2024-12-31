import { describe, expect, it } from '@jest/globals';
import { NoteData } from '../note';

describe('NoteData', () => {
    it('should create with default values', () => {
        const note = new NoteData();
        expect(note.type).toBe('note');
        expect(note.duration).toBe('4t');
        expect(note.note).toBeUndefined();
        expect(note.noteDatas).toBeUndefined();
    });

    it('should create with partial data', () => {
        const note = new NoteData({
            type: 'chord',
            duration: '1/4',
            note: 60
        });
        
        expect(note.type).toBe('chord');
        expect(note.duration).toBe('1/4');
        expect(note.note).toBe(60);
    });

    it('should create with nested noteDatas', () => {
        const note = new NoteData({
            type: 'arpeggio',
            duration: '1/4',
            noteDatas: [
                new NoteData({ note: 60 }),
                new NoteData({ note: 64 })
            ]
        });
        
        expect(note.type).toBe('arpeggio');
        expect(note.noteDatas).toHaveLength(2);
        expect(note.noteDatas![0].note).toBe(60);
        expect(note.noteDatas![1].note).toBe(64);
    });
}); 