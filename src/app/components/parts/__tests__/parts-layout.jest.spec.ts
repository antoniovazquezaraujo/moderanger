/**
 * Lógica pura del splitter de parts: reparto y clamps.
 */
import { clampBoundary, KEYBOARD_RESIZE_STEP, MIN_PART_WIDTH } from '../parts-layout';

describe('parts-layout · reparto de anchos', () => {
    it('mueve el borde la distancia pedida manteniendo la suma', () => {
        expect(clampBoundary(700, 700, 100)).toEqual({ left: 800, right: 600 });
        expect(clampBoundary(700, 700, -100)).toEqual({ left: 600, right: 800 });
        expect(clampBoundary(345, 345, 25)).toEqual({ left: 370, right: 320 });
    });

    it('respeta el mínimo por part en ambos extremos', () => {
        expect(clampBoundary(700, 700, 10000)).toEqual({ left: 1400 - MIN_PART_WIDTH, right: MIN_PART_WIDTH });
        expect(clampBoundary(700, 700, -10000)).toEqual({ left: MIN_PART_WIDTH, right: 1400 - MIN_PART_WIDTH });
        expect(clampBoundary(300, 900, -10000)).toEqual({ left: MIN_PART_WIDTH, right: 1200 - MIN_PART_WIDTH });
    });

    it('no da saltos: cada paso mueve el borde exactamente el delta hasta el clamp', () => {
        let state = { left: 500, right: 500 };
        for (let i = 0; i < 10; i += 1) {
            state = clampBoundary(state.left, state.right, 20);
            expect(state.left).toBe(520 + i * 20);
            expect(state.left + state.right).toBe(1000);
        }
    });

    it('con un contenedor más estrecho que 2×min reparte a la mitad sin bloquear', () => {
        const result = clampBoundary(200, 200, 50, MIN_PART_WIDTH);
        expect(result.left + result.right).toBe(400);
        expect(result.left).toBe(200);
        expect(result.right).toBe(200);
    });

    it('expone constantes coherentes con el contrato de UI', () => {
        expect(MIN_PART_WIDTH).toBe(260);
        expect(KEYBOARD_RESIZE_STEP).toBe(20);
    });
});
