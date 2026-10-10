/**
 * Splitter de parts: el primer arrastre congela los anchos, mueve solo las dos
 * parts vecinas, aplica clamps, el doble clic resetea y las flechas mueven el
 * borde un paso fijo.
 */
import type { Part } from 'src/app/model/part';
import { PartsComponent } from '../parts.component';
import { MIN_PART_WIDTH } from '../parts-layout';

jest.mock('@angular/core', () => {
    const sharedMock = jest.requireActual<Record<string, unknown>>('src/__mocks__/angular-core');

    class EventEmitter<T> {
        emit(_value: T): void { /* noop en tests */ }
        subscribe(): { unsubscribe: () => void } {
            return { unsubscribe: () => undefined };
        }
    }

    const propertyDecorator = (): PropertyDecorator => () => undefined;

    return {
        ...sharedMock,
        EventEmitter,
        Component: () => (target: unknown) => target,
        Input: propertyDecorator,
        Output: propertyDecorator
    };
});

interface FakeElement {
    getBoundingClientRect(): { width: number };
}

const fakeHost = (widths: number[]) => {
    const parts: FakeElement[] = widths.map(width => ({
        getBoundingClientRect: () => ({ width })
    }));
    const host = {
        querySelectorAll: (_selector: string): FakeElement[] => parts
    };
    return { host, parts };
};

const splitterFor = (host: unknown) => ({
    parentElement: host,
    setPointerCapture: jest.fn(),
    hasPointerCapture: jest.fn(() => true),
    releasePointerCapture: jest.fn()
});

const pointerEvent = (currentTarget: unknown, clientX: number): PointerEvent =>
    ({ currentTarget, clientX, pointerId: 1, preventDefault: jest.fn() } as unknown as PointerEvent);

const keyEvent = (currentTarget: unknown, key: string): KeyboardEvent =>
    ({ currentTarget, key, preventDefault: jest.fn() } as unknown as KeyboardEvent);

describe('PartsComponent · splitter redimensionable', () => {
    let component: PartsComponent;

    beforeEach(() => {
        component = new PartsComponent();
        component.parts = [{}, {}, {}] as Part[];
    });

    it('el primer arrastre parte del reparto actual y mueve solo los dos vecinos', () => {
        const { host } = fakeHost([400, 500, 600]);
        const splitter = splitterFor(host);

        component.onSplitterPointerDown(pointerEvent(splitter, 100), 1);
        expect(component.widths).toEqual([400, 500, 600]);
        expect(component.draggingIndex).toBe(1);
        expect(component.isDragging(1)).toBe(true);
        expect(component.isDragging(0)).toBe(false);

        component.onSplitterPointerMove(pointerEvent(splitter, 150));
        expect(component.widths).toEqual([400, 550, 550]); // solo cambian los vecinos

        component.onSplitterPointerUp(pointerEvent(splitter, 150));
        expect(component.draggingIndex).toBeNull();
        expect(splitter.releasePointerCapture).toHaveBeenCalledWith(1);

        component.onSplitterPointerMove(pointerEvent(splitter, 900));
        expect(component.widths).toEqual([400, 550, 550]); // sin arrastre, no hace nada
    });

    it('aplica el mínimo por part en ambos sentidos', () => {
        const { host } = fakeHost([400, 500, 600]);
        const splitter = splitterFor(host);

        component.onSplitterPointerDown(pointerEvent(splitter, 100), 1);
        component.onSplitterPointerMove(pointerEvent(splitter, 3000));
        expect(component.widths).toEqual([400, 840, 260]);

        component.onSplitterPointerMove(pointerEvent(splitter, -3000));
        expect(component.widths).toEqual([400, 260, 840]);
        expect(component.widths?.[1]).toBeGreaterThanOrEqual(MIN_PART_WIDTH);
        expect(component.widths?.[2]).toBeGreaterThanOrEqual(MIN_PART_WIDTH);
    });

    it('las flechas ←/→ mueven el borde un paso fijo y parten del reparto actual', () => {
        const { host } = fakeHost([500, 500, 500]);
        const splitter = splitterFor(host);
        const right = keyEvent(splitter, 'ArrowRight');
        const left = keyEvent(splitter, 'ArrowLeft');

        component.onSplitterKeydown(right, 0);
        expect(right.preventDefault).toHaveBeenCalled();
        expect(component.widths).toEqual([520, 480, 500]);

        component.onSplitterKeydown(left, 0);
        expect(component.widths).toEqual([500, 500, 500]);

        component.onSplitterKeydown(left, 0);
        expect(component.widths).toEqual([480, 520, 500]);
    });

    it('ignora otras teclas y los clamps de teclado no bloquean el borde', () => {
        const { host } = fakeHost([260, 500, 500]);
        const splitter = splitterFor(host);
        const other = keyEvent(splitter, 'Enter');
        component.onSplitterKeydown(other, 0);
        expect(other.preventDefault).not.toHaveBeenCalled();
        expect(component.widths).toBeNull();

        for (let i = 0; i < 20; i += 1) {
            component.onSplitterKeydown(keyEvent(splitter, 'ArrowLeft'), 0);
        }
        expect(component.widths?.[0]).toBe(MIN_PART_WIDTH); // topa en el mínimo, no se bloquea
        component.onSplitterKeydown(keyEvent(splitter, 'ArrowRight'), 0);
        expect(component.widths?.[0]).toBe(MIN_PART_WIDTH + 20);
    });

    it('el doble clic (reset) vuelve al reparto igual', () => {
        const { host } = fakeHost([400, 500, 600]);
        const splitter = splitterFor(host);
        component.onSplitterPointerDown(pointerEvent(splitter, 100), 1);
        component.onSplitterPointerMove(pointerEvent(splitter, 200));
        expect(component.widths).not.toBeNull();
        expect(component.flexFor(1)).toBe(`0 0 ${component.widths?.[1]}px`);

        component.resetWidths();
        expect(component.widths).toBeNull();
        expect(component.widthFor(1)).toBeNull();
        expect(component.flexFor(1)).toBeNull();
    });

    it('si cambia la lista de parts, los anchos explícitos se descartan', () => {
        const { host } = fakeHost([400, 500, 600]);
        component.onSplitterPointerDown(pointerEvent(splitterFor(host), 100), 1);
        expect(component.widths).not.toBeNull();

        component.ngOnChanges({
            parts: { currentValue: [], previousValue: [], firstChange: false, isFirstChange: () => false }
        });
        expect(component.widths).toBeNull();
    });

    it('un número de anchos que no cuadra con las parts se ignora', () => {
        component.widths = [300, 300];
        component.parts = [{}] as Part[];
        expect(component.widthFor(0)).toBeNull();
        expect(component.flexFor(0)).toBeNull();
    });
});
