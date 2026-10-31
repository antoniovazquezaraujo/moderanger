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

import * as fs from 'fs';
import * as path from 'path';
import { Song } from 'src/app/model/song';
import { MrLivePanelComponent } from '../mr-live-panel.component';

const template = fs.readFileSync(path.resolve(__dirname, '../mr-live-panel.component.html'), 'utf8');

describe('MrLivePanelComponent', () => {
    it('muestra el texto canónico y se refresca con cada cambio del modelo', () => {
        const component = new MrLivePanelComponent();
        component.song = new Song();
        component.song.name = 'First Light';

        component.ngDoCheck();
        expect(component.text).toContain('song "First Light"');
        expect(component.text).toContain('version 1');

        component.song.name = 'Second Light';
        component.ngDoCheck();

        expect(component.text).toContain('song "Second Light"');
        expect(component.text).not.toContain('song "First Light"');
    });

    it('emite edit y close desde sus acciones', () => {
        const component = new MrLivePanelComponent();
        const edit = jest.spyOn(component.edit, 'emit');
        const close = jest.spyOn(component.close, 'emit');

        component.requestEdit();
        component.requestClose();

        expect(edit).toHaveBeenCalledTimes(1);
        expect(close).toHaveBeenCalledTimes(1);
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
