import { describe, expect, it } from '@jest/globals';
import { parseBlockNotes } from '../ohm.parser';

describe('Block Notes Parser', () => {
  describe('Individual Notes', () => {
    it('should parse single note without duration', () => {
      const result = parseBlockNotes('5');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('note');
      expect(result[0].note).toBe(5);
      expect(result[0].duration).toBe('4t');  // default duration
    });

    it('should parse single note with duration', () => {
      const result = parseBlockNotes('4n: 5');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('note');
      expect(result[0].note).toBe(5);
      expect(result[0].duration).toBe('4n');
    });

    it('should parse multiple notes', () => {
      const result = parseBlockNotes('1 4n:2 8n:3');
      expect(result).toHaveLength(3);
      expect(result[0].duration).toBe('4t');
      expect(result[1].duration).toBe('4n');
      expect(result[2].duration).toBe('8n');
    });
  });

  describe('Note Groups', () => {
    it('should parse simple group with duration', () => {
      const result = parseBlockNotes('4n:(1 2 3)');
      expect(result).toHaveLength(3);
      expect(result.every(note => note.duration === '4n')).toBe(true);
      expect(result.map(note => note.note)).toEqual([1, 2, 3]);
    });

    it('should parse group with mixed durations', () => {
      const result = parseBlockNotes('4n:(1 8n:2 3)');
      expect(result).toHaveLength(3);
      expect(result[0].duration).toBe('4n');
      expect(result[1].duration).toBe('8n');
      expect(result[2].duration).toBe('4n');
    });

    it('should parse nested groups', () => {
      const result = parseBlockNotes('4n:(1 8n:(2 3) 4)');
      expect(result).toHaveLength(4);
      expect(result[0].duration).toBe('4n');
      expect(result[1].duration).toBe('8n');
      expect(result[2].duration).toBe('8n');
      expect(result[3].duration).toBe('4n');
    });
  });

  describe('Error Cases', () => {
    it('should reject group without duration', () => {
      expect(() => parseBlockNotes('(1 2 3)')).toThrow();
    });

    it('should reject nested group without duration', () => {
      expect(() => parseBlockNotes('4n:(1 (2 3) 4)')).toThrow();
    });

    it('should reject invalid duration format', () => {
      expect(() => parseBlockNotes('4x: 1')).toThrow();
    });
  });
}); 