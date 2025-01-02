import { describe, expect, it } from '@jest/globals';
import { parse } from '../ohm.parser';

describe('Configuration Commands', () => {
  describe('ScaleCmd', () => {
    const scaleTypes = ['WHITE', 'BLUE', 'RED', 'BLACK', 'PENTA', 'TONES', 'FULL'];
    
    scaleTypes.forEach(scaleType => {
      it(`should parse SCALE ${scaleType} command`, () => {
        const input = `SCALE ${scaleType}`;
        const result = parse(input);
        expect(result).toBeTruthy();
      });
    });

    it('should reject invalid scale type', () => {
      const input = 'SCALE INVALID';
      expect(() => parse(input)).toThrow();
    });
  });

  describe('OctaveCmd', () => {
    it('should parse positive octave', () => {
      const input = 'OCT 4';
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse negative octave', () => {
      const input = 'OCT -1';
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse zero octave', () => {
      const input = 'OCT 0';
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should reject non-numeric octave', () => {
      const input = 'OCT abc';
      expect(() => parse(input)).toThrow();
    });
  });

  describe('GapCmd', () => {
    it('should parse positive gap', () => {
      const input = 'GAP 2';
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse zero gap', () => {
      const input = 'GAP 0';
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse negative gap', () => {
      const input = 'GAP -1';
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should reject non-numeric gap', () => {
      const input = 'GAP abc';
      expect(() => parse(input)).toThrow();
    });
  });

  describe('Combined ConfigCmds', () => {
    it('should parse multiple config commands in sequence', () => {
      const input = 'SCALE WHITE OCT 4 GAP 2';
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse config commands in a block', () => {
      const input = `part test {
        block main {
          SCALE BLUE
          OCT 3
          GAP 1
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });
  });
}); 