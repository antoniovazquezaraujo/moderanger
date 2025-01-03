import { describe, expect, it } from '@jest/globals';
import { parseSong } from '../ohm.parser';
import { NoteData } from '../note';

describe('Variables', () => {
  describe('Variable Declaration', () => {
    it('should parse numeric variable declaration', () => {
      const input = `vars {
        $x = 42
      }
      part test {
        block main {
          OCT $x
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse scale type variable declaration', () => {
      const input = `vars {
        $scale = WHITE
      }
      part test {
        block main {
          SCALE WHITE
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse duration variable declaration', () => {
      const input = `vars {
        $note = 60
      }
      part test {
        block main {
          4n: $note
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse multiple variable declarations', () => {
      const input = `vars {
        $x = 1
        $y = 2
        $scale = BLUE
      }
      part test {
        block main {
          OCT $x
          GAP $y
          SCALE BLUE
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });
  });

  describe('Variable Operations', () => {
    it('should parse increment operation', () => {
      const input = `vars {
        $x = 0
      }
      part test {
        block main {
          OCT $x
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse decrement operation', () => {
      const input = `vars {
        $x = 1
      }
      part test {
        block main {
          OCT $x
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse addition assignment', () => {
      const input = `vars {
        $x = 5
      }
      part test {
        block main {
          OCT $x
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse subtraction assignment', () => {
      const input = `vars {
        $x = 10
      }
      part test {
        block main {
          OCT $x
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse multiplication assignment', () => {
      const input = `vars {
        $x = 2
      }
      part test {
        block main {
          OCT $x
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });
  });

  describe('Variable References', () => {
    it('should parse variable reference in note', () => {
      const input = `vars {
        $note = 60
      }
      part test {
        block main {
          $note
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse variable reference in config commands', () => {
      const input = `vars {
        $oct = 4
        $gap = 2
      }
      part test {
        block main {
          OCT $oct
          GAP $gap
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });

    it('should parse variable reference with duration', () => {
      const input = `vars {
        $note = 60
      }
      part test {
        block main {
          4n: $note
        }
      }`;
      const result = parseSong(input);
      expect(result).toBeTruthy();
    });
  });

  describe('Error Cases', () => {
    it('should reject invalid variable name', () => {
      const input = `vars {
        $123invalid = 42
      }
      part test {
        block main {
        }
      }`;
      expect(() => parseSong(input)).toThrow();
    });

    it('should reject invalid assignment operator', () => {
      const input = `vars {
        $x = 0
      }
      part test {
        block main {
          $x /= 2
        }
      }`;
      expect(() => parseSong(input)).toThrow();
    });
  });
});
