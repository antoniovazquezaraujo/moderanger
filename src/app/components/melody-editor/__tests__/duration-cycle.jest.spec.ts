/**
 * Ciclo de duración de la rueda (`duration-cycle.ts`).
 *
 * Incluye el estado "en blanco" (heredado del grupo) y garantiza que desde él
 * siempre se pueda volver a una duración explícita, aunque el fallback del
 * grupo/editor sea `1n` u `8t` (extremos del ciclo).
 */
import { NoteDuration } from 'src/app/model/melody';
import { normalizeDuration, nextDuration } from '../duration-cycle';

describe('duration-cycle · rueda de duración', () => {
    it('normaliza duraciones: solo acepta las del ciclo', () => {
        expect(normalizeDuration('4n')).toBe('4n');
        expect(normalizeDuration('')).toBeUndefined();
        expect(normalizeDuration(undefined)).toBeUndefined();
        expect(normalizeDuration(null)).toBeUndefined();
        expect(normalizeDuration('4x')).toBeUndefined();
    });

    it('con duración explícita recorre el ciclo y cae en blanco en los extremos', () => {
        expect(nextDuration('4n', false, 'longer')).toBe('2n');
        expect(nextDuration('2n', false, 'longer')).toBe('1n');
        expect(nextDuration('1n', false, 'longer')).toBeUndefined();
        expect(nextDuration('4n', false, 'shorter')).toBe('8n');
        expect(nextDuration('8t', false, 'shorter')).toBeUndefined();
    });

    it('en blanco parte del fallback (grupo/editor) sin quedarse bloqueado', () => {
        expect(nextDuration('4n', true, 'longer')).toBe('2n');
        expect(nextDuration('4n', true, 'shorter')).toBe('8n');
        expect(nextDuration('2n', true, 'longer')).toBe('1n');
        expect(nextDuration('2n', true, 'shorter')).toBe('4n');
    });

    it('en blanco sale del estado aunque el fallback sea un extremo', () => {
        expect(nextDuration('1n', true, 'longer')).toBe('8t');
        expect(nextDuration('1n', true, 'shorter')).toBe('2n');
        expect(nextDuration('8t', true, 'shorter')).toBe('1n');
        expect(nextDuration('8t', true, 'longer')).toBe('4t');
    });

    it('ida y vuelta por el blanco: blanco → explícita → blanco → explícita', () => {
        const first = nextDuration('1n', true, 'longer');
        expect(first).toBe('8t');
        expect(nextDuration(first, false, 'shorter')).toBeUndefined();

        const second = nextDuration('8t', true, 'shorter');
        expect(second).toBe('1n');
        expect(nextDuration(second, false, 'longer')).toBeUndefined();

        expect(nextDuration('1n', true, 'longer')).toBe('8t');
    });

    it('un fallback desconocido se trata como blanco', () => {
        expect(nextDuration(undefined, true, 'longer')).toBe('8t');
        expect(nextDuration(undefined, true, 'shorter')).toBe('1n');
    });

    it('desde blanco nunca devuelve blanco en 30 pasos seguidos', () => {
        let current: NoteDuration | undefined;
        let blank = true;
        for (let i = 0; i < 30; i++) {
            current = nextDuration(current, blank, 'longer');
            if (blank) {
                expect(current).toBeDefined();
            }
            blank = current === undefined;
        }
    });
});
