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
import { ExampleLibraryComponent } from '../example-library.component';

const template = fs.readFileSync(path.resolve(__dirname, '../example-library.component.html'), 'utf8');

describe('ExampleLibraryComponent', () => {
    it('lista los diez ejemplos con carga y carga + reproducción', () => {
        const component = new ExampleLibraryComponent();

        expect(component.examples).toHaveLength(10);
        expect(template).toContain('*ngFor="let example of examples');
        expect(template).toContain('requestLoad(example, false)');
        expect(template).toContain('requestLoad(example, true)');
        expect(template).toContain('Load &amp; play');
    });

    it('emite la petición con el tema y si debe reproducirse', () => {
        const component = new ExampleLibraryComponent();
        const emit = jest.spyOn(component.loadExample, 'emit');
        const example = component.examples[0];

        component.requestLoad(example, true);

        expect(emit).toHaveBeenCalledWith({ example, play: true });
    });

    it('emite el cierre desde el diálogo', () => {
        const component = new ExampleLibraryComponent();
        const emit = jest.spyOn(component.visibleChange, 'emit');

        component.onVisibleChange(false);

        expect(emit).toHaveBeenCalledWith(false);
    });
});
