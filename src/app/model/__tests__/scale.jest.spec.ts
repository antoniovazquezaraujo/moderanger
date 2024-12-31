import { describe, expect, it, beforeEach } from '@jest/globals';
import { Scale } from '../scale';
import { OctavedGrade } from '../octaved-grade';

describe('Scale', () => {
  let scale: Scale;

  beforeEach(() => {
    scale = new Scale([0, 2, 3, 5, 7, 9, 10]);
  });

  it('should create an instance', () => {
    expect(scale).toBeTruthy();
  });

  it('should handle octaved grades correctly', () => {
    const grade = new OctavedGrade(scale, -10, -10,'');
    const results = [];
    
    for (let i = 0; i < 10; i++) {
      grade.addGrade(-1);
      results.push({
        grade: grade.grade,
        octave: grade.octave,
        note: grade.toNote()
      });
    }
    
    expect(results.length).toBe(10);
    expect(results.every(r => r.grade >= 0 && r.grade < scale.getNumNotes())).toBe(true);
  });

  it('should handle decorated grades', () => {
    const arpegioGrades = [
      new OctavedGrade(scale, 0, 0, ''),
      new OctavedGrade(scale, 3, 0, '')
    ];
    
    const decoratedGrades = scale.getDecoratedGrades(
      arpegioGrades, 
      1, // baseGap
      "1 -1 0 3", // decorationPattern
      1 // decorationGap
    );
    
    expect(decoratedGrades).toBeTruthy();
    expect(decoratedGrades.length).toBeGreaterThan(0);
  });

  describe('getSelectedGrades', () => {
    it('should return correct grades for given parameters', () => {
      const grades = scale.getSelectedGrades(0, 3, 2);
      expect(grades).toHaveLength(4); // root note + 3 additional notes
      expect(grades[0].grade).toBe(0);
    });
  });
}); 