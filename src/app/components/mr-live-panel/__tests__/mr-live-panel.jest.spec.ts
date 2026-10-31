jest.mock('@angular/core', () => {
    class EventEmitter<T> {
        emit(value: T): void {
            void value;
        }
    }

    const propertyDecorator = (): PropertyDecorator => () => undefined;

    return {
        ChangeDetectionStrategy: { OnPush: 0 },
        Component: () => (target: unknown) => target,
        EventEmitter,
        Input: propertyDecorator,
        Output: propertyDecorator
    };
});

import type { ChangeDetectorRef, NgZone } from '@angular/core';
import * as fs from 'fs';
import * as path from 'path';
import { Song } from 'src/app/model/song';
import { MrLivePanelComponent } from '../mr-live-panel.component';

const template = fs.readFileSync(path.resolve(__dirname, '../mr-live-panel.component.html'), 'utf8');

const fakeZone = (): NgZone => ({ runOutsideAngular: (fn: () => void) => fn() } as unknown as NgZone);
const fakeCdr = (): { detectChanges: jest.Mock } => ({ detectChanges: jest.fn() });

const createPanel = (): MrLivePanelComponent =>
    new MrLivePanelComponent(fakeZone(), fakeCdr() as unknown as ChangeDetectorRef);

describe('MrLivePanelComponent', () => {
    it('muestra el texto canónico y se refresca con cada cambio del modelo', () => {
        const component = createPanel();
        component.song = new Song();
        component.song.name = 'First Light';

        component.refresh();
        expect(component.text).toContain('song "First Light"');
        expect(component.text).toContain('version 1');

        component.song.name = 'Second Light';
        component.refresh();

        expect(component.text).toContain('song "Second Light"');
        expect(component.text).not.toContain('song "First Light"');
    });

    it('emite edit y close desde sus acciones', () => {
        const component = createPanel();
        const edit = jest.spyOn(component.edit, 'emit');
        const close = jest.spyOn(component.close, 'emit');

        component.requestEdit();
        component.requestClose();

        expect(edit).toHaveBeenCalledTimes(1);
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('se refresca con el polling aunque no llegue un ciclo de CD', () => {
        jest.useFakeTimers();
        const component = createPanel();
        component.song = new Song();
        component.song.name = 'First Light';
        component.ngOnInit();

        component.song.name = 'Second Light';
        jest.advanceTimersByTime(250);

        expect(component.text).toContain('song "Second Light"');
        component.ngOnDestroy();
        jest.useRealTimers();
    });

    it('el panel es una vista fija de solo lectura con acción de edición', () => {
        expect(template).toContain('id="mr-live-panel"');
        expect(template).toContain('Live view');
        expect(template).toContain('Song text');
        expect(template).toContain('(click)="requestEdit()"');
        expect(template).toContain('aria-label="Hide song text"');
        expect(template).toContain('<pre class="mr-live-text"');
    });
});
