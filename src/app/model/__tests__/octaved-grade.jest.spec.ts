import { describe, expect, it, beforeEach } from '@jest/globals';
import { Scale } from '../scale';
import { OctavedGrade } from '../octaved-grade';

describe('OctavedGrade', () => {
    let scale: Scale;

    beforeEach(() => {
        scale = new Scale([0, 2, 3, 5, 7, 9, 10]);
    });

    describe('constructor', () => {
        it('should create instance with correct values', () => {
            const grade = new OctavedGrade(scale, 2, 1, '1/4');
            expect(grade.grade).toBe(2);
            expect(grade.octave).toBe(1);
            expect(grade.duration).toBe('1/4');
        });
    });

    describe('addGrade', () => {
        it('should handle positive grade additions', () => {
            const grade = new OctavedGrade(scale, 0, 0, '1/4');
            grade.addGrade(2);
            expect(grade.grade).toBe(2);
            expect(grade.octave).toBe(0);
        });

        it('should handle negative grade additions', () => {
            const grade = new OctavedGrade(scale, 3, 0, '1/4');
            grade.addGrade(-2);
            expect(grade.grade).toBe(1);
            expect(grade.octave).toBe(0);
        });

        it('should adjust octave when grade exceeds scale length', () => {
            const grade = new OctavedGrade(scale, 0, 0, '1/4');
            grade.addGrade(8);
            expect(grade.grade).toBeLessThan(scale.getNumNotes());
            expect(grade.octave).toBe(1);
        });
    });

    describe('toNote', () => {
        it('should convert to correct MIDI note', () => {
            const grade = new OctavedGrade(scale, 0, 1, '1/4');
            const note = grade.toNote();
            expect(note).toBe(scale.notes[0] + 48);
        });
    });
}); 