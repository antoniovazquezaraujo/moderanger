/**
 * Rueda de duración en `MelodyEditorComponent`: anillo único de 8 estados
 * (7 duraciones + blanco). Los dos sentidos recorren los mismos valores, el
 * estado blanco (heredado) sigue siendo alcanzable y siempre se sale de él, y
 * el índice no reengancha por la duración del grupo ni por `defaultDuration`.
 *
 * Se instancia el componente directamente con un `MelodyEditorService` real
 * (mock local de `@angular/core`, sin TestBed), igual que `melody-editor-vars`.
 */
import type { ChangeDetectorRef, ElementRef } from '@angular/core';
import type { SongPlayer } from 'src/app/model/song.player';
import { NoteData } from 'src/app/model/note';
import { GenericGroup, MusicElement, SingleNote } from 'src/app/model/melody';
import { MelodyEditorService } from 'src/app/services/melody-editor.service';
import { MelodyEditorComponent } from '../melody-editor.component';

jest.mock('@angular/core', () => {
    const sharedMock = jest.requireActual<Record<string, unknown>>('src/__mocks__/angular-core');

    class EventEmitter<T> {
        private readonly listeners: Array<(value: T) => void> = [];

        subscribe(listener: (value: T) => void): { unsubscribe: () => void } {
            this.listeners.push(listener);
            return {
                unsubscribe: () => {
                    const index = this.listeners.indexOf(listener);
                    if (index >= 0) {
                        this.listeners.splice(index, 1);
                    }
                }
            };
        }

        emit(value: T): void {
            for (const listener of [...this.listeners]) {
                listener(value);
            }
        }
    }

    const propertyDecorator = (): PropertyDecorator => () => undefined;

    return {
        ...sharedMock,
        ChangeDetectionStrategy: { OnPush: 0 },
        EventEmitter,
        Component: () => (target: unknown) => target,
        Input: propertyDecorator,
        Output: propertyDecorator,
        ViewChild: propertyDecorator,
        ViewChildren: propertyDecorator,
        HostListener: () => () => undefined
    };
});

const findNote = (elements: MusicElement[], id: string): SingleNote | null => {
    for (const element of elements) {
        if (element.id === id) {
            return element as SingleNote;
        }
        if (element.type === 'group') {
            const found = findNote((element as GenericGroup).children, id);
            if (found) {
                return found;
            }
        } else if (element.type === 'arpeggio' || element.type === 'chord') {
            const found = findNote((element as { notes: MusicElement[] }).notes, id);
            if (found) {
                return found;
            }
        }
    }
    return null;
};

describe('MelodyEditorComponent · anillo de duración con la rueda', () => {
    let component: MelodyEditorComponent;
    let service: MelodyEditorService;
    let emitted: string[];

    beforeEach(() => {
        service = new MelodyEditorService();
        const cdr = { markForCheck: jest.fn(), detectChanges: jest.fn() } as unknown as ChangeDetectorRef;
        component = new MelodyEditorComponent(service, cdr, {} as ElementRef, {} as SongPlayer);
        // El componente sincroniza `elements` en ngAfterViewInit; aquí
        // replicamos esa suscripción para probar el ciclo completo.
        service.elements$.subscribe(elements => {
            component.elements = elements;
        });
        emitted = [];
        component.notesChange.subscribe((value: string) => emitted.push(value));
    });

    const lastEmitted = (): string => emitted[emitted.length - 1];

    const collect = (id: string, delta: number, steps: number): string[] => {
        const out: string[] = [];
        for (let i = 0; i < steps; i += 1) {
            component.changeDuration(id, delta);
            out.push(lastEmitted());
        }
        return out;
    };

    it('los dos sentidos recorren los mismos 8 estados (blanco → extremos)', () => {
        service.loadFromNoteData([new NoteData({ type: 'note', note: 1 })]);
        const id = service.getElements()[0].id;

        const longer = collect(id, 1, 8); // hacia largo desde blanco: entra por 8t
        expect(longer).toEqual(['8t:1', '4t:1', '16n:1', '8n:1', '4n:1', '2n:1', '1n:1', '1']);

        const shorter = collect(id, -1, 8); // hacia corto desde blanco: entra por 1n
        expect(shorter).toEqual(['1n:1', '2n:1', '4n:1', '8n:1', '16n:1', '4t:1', '8t:1', '1']);

        // Mismos 8 estados en ambos sentidos (7 duraciones + blanco).
        expect(new Set([...longer, ...shorter]).size).toBe(8);
    });

    it('desde una duración explícita el anillo es idéntico y pasa por blanco', () => {
        service.loadFromNoteData([new NoteData({ type: 'note', note: 1, duration: '1n' })]);
        const id = service.getElements()[0].id;

        component.changeDuration(id, 1); // 1n → blanco (fin del anillo)
        expect(lastEmitted()).toBe('1');

        component.changeDuration(id, 1); // blanco → 8t
        expect(lastEmitted()).toBe('8t:1');

        component.changeDuration(id, -1); // 8t → blanco
        expect(lastEmitted()).toBe('1');

        component.changeDuration(id, -1); // blanco → 1n
        expect(lastEmitted()).toBe('1n:1');

        component.changeDuration(id, -1); // 1n → 2n
        expect(lastEmitted()).toBe('2n:1');
    });

    it('dentro de un grupo el anillo es el mismo: el grupo ya no decide el índice', () => {
        service.loadFromNoteData([
            new NoteData({ type: 'group', duration: '4n', children: [new NoteData({ type: 'note', note: 0 })] })
        ]);
        const childId = (service.getElements()[0] as GenericGroup).children[0].id;

        component.changeDuration(childId, 1); // blanco + largo → 8t (antes, con fallback 4n, daba 2n)
        expect(lastEmitted()).toBe('4n:( 8t:0 )');

        component.changeDuration(childId, -1); // 8t → blanco
        expect(lastEmitted()).toBe('4n:( 0 )');

        component.changeDuration(childId, -1); // blanco + corto → 1n
        expect(lastEmitted()).toBe('4n:( 1n:0 )');
    });

    it("normaliza una duración desconocida (`''`) como estado en blanco", () => {
        service.loadFromNoteData([new NoteData({ type: 'note', note: 7, duration: '' })]);
        const id = service.getElements()[0].id;

        component.changeDuration(id, 1); // '' = blanco → 8t
        expect(lastEmitted()).toBe('8t:7');

        component.changeDuration(id, -1); // 8t → blanco
        expect(lastEmitted()).toBe('7');

        component.changeDuration(id, -1); // blanco → 1n
        expect(lastEmitted()).toBe('1n:7');
    });

    it('30 giros seguidos: cada paso cambia el modelo y el id sigue resolviéndose', () => {
        service.loadFromNoteData([new NoteData({ type: 'note', note: 1 })]);
        const id = service.getElements()[0].id;

        let previousBlank = true; // arranca en blanco (sin duración explícita)
        for (let i = 0; i < 30; i += 1) {
            const before = lastEmitted();
            component.changeDuration(id, i < 15 ? 1 : -1);

            const after = lastEmitted();
            const note = findNote(component.elements, id);

            expect(after).not.toBe(before); // la rueda nunca queda muerta
            expect(note).not.toBeNull(); // el target se sigue resolviendo por id
            if (previousBlank) {
                expect(note?.duration).toBeDefined(); // desde blanco siempre sale
            }
            previousBlank = note?.duration === undefined;
        }
    });
});
