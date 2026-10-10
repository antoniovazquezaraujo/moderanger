/**
 * Rueda de duración en `MelodyEditorComponent`: el estado "en blanco"
 * (heredado) siempre se puede abandonar, el fallback del grupo se respeta y la
 * nota sigue resolviéndose por su id en pasos sucesivos (sin quedarse muerta).
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

describe('MelodyEditorComponent · rueda de duración (salir del blanco)', () => {
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

    it('desde blanco la rueda siempre vuelve a una duración explícita (top-level)', () => {
        service.loadFromNoteData([new NoteData({ type: 'note', note: 1, duration: '1n' })]);
        const id = service.getElements()[0].id;

        component.changeDuration(id, 1); // 1n → blanco (fin de ciclo, por diseño)
        expect(lastEmitted()).toBe('1');

        component.changeDuration(id, 1); // blanco → 2n (nunca se queda bloqueado)
        expect(lastEmitted()).toBe('2n:1');

        component.changeDuration(id, -1); // 2n → 4n
        expect(lastEmitted()).toBe('4n:1');

        component.changeDuration(id, -1); // 4n → 8n
        expect(lastEmitted()).toBe('8n:1');
    });

    it('fallback de grupo `1n`: blanco → 8t → blanco → 2n', () => {
        service.loadFromNoteData([
            new NoteData({ type: 'group', duration: '1n', children: [new NoteData({ type: 'note', note: 0 })] })
        ]);
        const childId = (service.getElements()[0] as GenericGroup).children[0].id;

        component.changeDuration(childId, 1); // blanco + largo, fallback 1n → 8t
        expect(lastEmitted()).toBe('1n:( 8t:0 )');

        component.changeDuration(childId, -1); // 8t + corto → blanco
        expect(lastEmitted()).toBe('1n:( 0 )');

        component.changeDuration(childId, -1); // blanco + corto, fallback 1n → 2n
        expect(lastEmitted()).toBe('1n:( 2n:0 )');
    });

    it('fallback de grupo `8t`: blanco → 1n → blanco → 4t', () => {
        service.loadFromNoteData([
            new NoteData({ type: 'group', duration: '8t', children: [new NoteData({ type: 'note', note: 3 })] })
        ]);
        const childId = (service.getElements()[0] as GenericGroup).children[0].id;

        component.changeDuration(childId, -1); // blanco + corto, fallback 8t → 1n
        expect(lastEmitted()).toBe('8t:( 1n:3 )');

        component.changeDuration(childId, 1); // 1n + largo → blanco
        expect(lastEmitted()).toBe('8t:( 3 )');

        component.changeDuration(childId, 1); // blanco + largo, fallback 8t → 4t
        expect(lastEmitted()).toBe('8t:( 4t:3 )');
    });

    it("normaliza una duración desconocida (`''`) como estado en blanco", () => {
        service.loadFromNoteData([new NoteData({ type: 'note', note: 7, duration: '' })]);
        const id = service.getElements()[0].id;

        component.changeDuration(id, 1); // '' → blanco → 2n (fallback 4n del editor)
        expect(lastEmitted()).toBe('2n:7');

        component.changeDuration(id, -1); // 2n → 4n
        expect(lastEmitted()).toBe('4n:7');
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
