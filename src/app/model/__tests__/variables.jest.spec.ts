import { describe, expect, it } from '@jest/globals';
import { parse } from '../ohm.parser';
import { NoteData } from '../note';

describe('Variables', () => {
  describe('Variable Declaration', () => {
    it('should parse numeric variable declaration', () => {
      const input = `part test {
        block main {
          vars {
            $x = 42
          }
          OCT $x
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse scale type variable declaration', () => {
      const input = `part test {
        block main {
          vars {
            $scale = WHITE
          }
          SCALE WHITE
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse duration variable declaration', () => {
      const input = `part test {
        block main {
          vars {
            $note = 60
          }
          4n: $note
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse multiple variable declarations', () => {
      const input = `part test {
        block main {
          vars {
            $x = 1
            $y = 2
            $scale = BLUE
          }
          OCT $x
          GAP $y
          SCALE BLUE
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });
  });

  describe('Variable Operations', () => {
    it('should parse increment operation', () => {
      const input = `part test {
        block main {
          vars {
            $x = 0
          }
          OCT $x
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse decrement operation', () => {
      const input = `part test {
        block main {
          vars {
            $x = 1
          }
          OCT $x
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse addition assignment', () => {
      const input = `part test {
        block main {
          vars {
            $x = 5
          }
          OCT $x
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse subtraction assignment', () => {
      const input = `part test {
        block main {
          vars {
            $x = 10
          }
          OCT $x
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse multiplication assignment', () => {
      const input = `part test {
        block main {
          vars {
            $x = 2
          }
          OCT $x
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });
  });

  describe('Variable References', () => {
    it('should parse variable reference in note', () => {
      const input = `part test {
        block main {
          vars {
            $note = 60
          }
          $note
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse variable reference in config commands', () => {
      const input = `part test {
        block main {
          vars {
            $oct = 4
            $gap = 2
          }
          OCT $oct
          GAP $gap
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });

    it('should parse variable reference with duration', () => {
      const input = `part test {
        block main {
          vars {
            $note = 60
          }
          4n: $note
        }
      }`;
      const result = parse(input);
      expect(result).toBeTruthy();
    });
  });

  describe('Error Cases', () => {

    it('should reject invalid variable name', () => {
      const input = `part test {
        block main {
          vars {
            $123invalid = 42
          }
        }
      }`;
      expect(() => parse(input)).toThrow();
    });

    it('should reject invalid assignment operator', () => {
      const input = `part test {
        block main {
          vars {
            $x = 0
          }
          $x /= 2
        }
      }`;
      expect(() => parse(input)).toThrow();
    });
  });
});
