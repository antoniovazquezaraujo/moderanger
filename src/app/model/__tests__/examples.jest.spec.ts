import { VariableContext } from '../variable.context';
import { createExampleSong, EXAMPLE_SONGS } from '../examples';

describe('example song library', () => {
    beforeEach(() => {
        VariableContext.context.clear();
    });

    afterEach(() => {
        VariableContext.context.clear();
    });

    it('contiene doce ejemplos con identificadores únicos', () => {
        expect(EXAMPLE_SONGS).toHaveLength(12);
        const ids = EXAMPLE_SONGS.map(example => example.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('todos los ejemplos son .mr válidos', () => {
        for (const example of EXAMPLE_SONGS) {
            expect(() => createExampleSong(example)).not.toThrow();
            expect(createExampleSong(example).name).toBeTruthy();
        }
    });

    it('aplica las variables declaradas por el ejemplo', () => {
        const dodecaedro = EXAMPLE_SONGS.find(example => example.id === 'dodecaedro');
        const glass = EXAMPLE_SONGS.find(example => example.id === 'glass-orbit');
        expect(dodecaedro).toBeDefined();
        expect(glass).toBeDefined();

        createExampleSong(glass!);
        expect(VariableContext.getValue('oct')).toBe(3);
        expect(VariableContext.getValue('mode')).toBe('ASCENDING');
        expect(VariableContext.getValue('scale')).toBe('BLUE');

        createExampleSong(dodecaedro!);
        expect(VariableContext.getValue('oct')).toBeUndefined();
        expect(VariableContext.getValue('mode')).toBeUndefined();
        expect(VariableContext.getValue('scale')).toBeUndefined();
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
