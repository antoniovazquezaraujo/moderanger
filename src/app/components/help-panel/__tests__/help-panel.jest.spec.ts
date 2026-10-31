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
import { HelpPanelComponent } from '../help-panel.component';

const template = fs.readFileSync(path.resolve(__dirname, '../help-panel.component.html'), 'utf8');

describe('HelpPanelComponent', () => {
    it('explica los pasos básicos y ofrece cargar el ejemplo', () => {
        expect(template).toContain('Make your first song');
        expect(template).toContain('Create a part');
        expect(template).toContain('Add a block');
        expect(template).toContain('Write notes');
        expect(template).toContain('Load example');
        expect(template).toContain('Read the full manual');
    });

    it('cierra el panel emitiendo visibleChange=false', () => {
        const component = new HelpPanelComponent();
        const emit = jest.spyOn(component.visibleChange, 'emit');

        component.close();

        expect(emit).toHaveBeenCalledWith(false);
    });

    it('al cargar el ejemplo emite loadDemo y cierra la guía', () => {
        const component = new HelpPanelComponent();
        const loadDemo = jest.spyOn(component.loadDemo, 'emit');
        const visibleChange = jest.spyOn(component.visibleChange, 'emit');

        component.requestDemo();

        expect(loadDemo).toHaveBeenCalledTimes(1);
        expect(visibleChange).toHaveBeenCalledWith(false);
    });

    it('el botón de cerrar tiene etiqueta accesible', () => {
        expect(template).toContain('aria-label="Close help"');
        expect(template).toContain('aria-labelledby="help-demo-title"');
    });
});
