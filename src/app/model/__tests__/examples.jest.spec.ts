import { createExampleSong, EXAMPLE_SONGS } from '../examples';

describe('example song library', () => {
    it('contiene diez ejemplos con identificadores únicos', () => {
        expect(EXAMPLE_SONGS).toHaveLength(10);
        const ids = EXAMPLE_SONGS.map(example => example.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('todos los ejemplos son .mr válidos', () => {
        for (const example of EXAMPLE_SONGS) {
            expect(() => createExampleSong(example)).not.toThrow();
            expect(createExampleSong(example).name).toBeTruthy();
        }
    });

    it('cada ejemplo tiene título, descripción y etiquetas', () => {
        for (const example of EXAMPLE_SONGS) {
            expect(example.title.trim()).not.toBe('');
            expect(example.description.trim()).not.toBe('');
            expect(example.tags.length).toBeGreaterThan(0);
            expect(example.bpm).toBeGreaterThanOrEqual(30);
            expect(example.bpm).toBeLessThanOrEqual(240);
        }
    });
});
