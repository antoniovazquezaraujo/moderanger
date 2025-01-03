import { describe, expect, it } from '@jest/globals';
import { parseSong } from '../ohm.parser';

describe('Configuration Commands', () => {
  describe('ScaleOperation', () => {
    const scaleTypes = ['WHITE', 'BLUE', 'RED', 'BLACK', 'PENTA', 'TONES', 'FULL'];
    
    scaleTypes.forEach(scaleType => {
      it(`should parse SCALE ${scaleType} command`, () => {
        const input = `part test {
          block main {
            SCALE ${scaleType}
          }
        }`;
        const result = parseSong(input);
        expect(result).toBeTruthy();
      });
    });

    it('should reject invalid scale type', () => {
      const input = `part test {
        block main {
          SCALE INVALID
        }
      }`;
      expect(() => parseSong(input)).toThrow();
    });
  });

  describe('OctaveOperation', () => {
    it('should parse positive octave', () => {
      const input = `part test {
        block main {
          OCT 4
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse negative octave', () => {
      const input = `part test {
        block main {
          OCT -1
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse zero octave', () => {
      const input = `part test {
        block main {
          OCT 0
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should reject non-numeric octave', () => {
      const input = `part test {
        block main {
          OCT abc
        }
      }`;
      expect(() => parseSong(input)).toThrow();
    });
  });

  describe('GapOperation', () => {
    it('should parse positive gap', () => {
      const input = `part test {
        block main {
          GAP 2
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse zero gap', () => {
      const input = `part test {
        block main {
          GAP 0
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse negative gap', () => {
      const input = `part test {
        block main {
          GAP -1
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should reject non-numeric gap', () => {
      const input = `part test {
        block main {
          GAP abc
        }
      }`;
      expect(() => parseSong(input)).toThrow();
    });
  });

  describe('Combined Operations', () => {
    it('should parse multiple config operations in sequence', () => {
      const input = `part test {
        block main {
          SCALE WHITE
          OCT 4
          GAP 2
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse operations in multiple blocks', () => {
      const input = `part test {
        block first {
          SCALE BLUE
          OCT 3
        }
        block second {
          GAP 1
          OCT 4
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });
  });
}); 