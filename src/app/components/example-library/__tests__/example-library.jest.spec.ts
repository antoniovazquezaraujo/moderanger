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
    it('es un panel simple con los doce títulos clicables', () => {
        const component = new ExampleLibraryComponent();

        expect(component.examples).toHaveLength(12);
        expect(template).toContain('@for (example of examples; track trackByExample($index, example))');
        expect(template).toContain('(click)="select(example)"');
        expect(template).toContain('{{ example.title }}');
        expect(template).not.toContain('example.tags');
        expect(template).not.toContain('example-bpm');
        expect(template).not.toContain('Load &amp; play');
    });

    it('emite el tema seleccionado para cargarlo y reproducirlo', () => {
        const component = new ExampleLibraryComponent();
        const emit = jest.spyOn(component.loadExample, 'emit');
        const example = component.examples[0];

        component.select(example);

        expect(emit).toHaveBeenCalledWith(example);
    });

    it('emite el cierre del panel', () => {
        const component = new ExampleLibraryComponent();
        const emit = jest.spyOn(component.close, 'emit');

        component.close.emit();

        expect(emit).toHaveBeenCalledTimes(1);
    });
});
