/**
 * Metrónomo del toolbar (`style/trim-gui-widths`): la auditoría GUI recortó el
 * indicador de 32 a 16 puntos (328px → 168px). El beat activo sigue mapeando
 * con módulo sobre el número de puntos, así que el ciclo visual se mantiene
 * (los downbeats cada 8 pasos se conservan).
 */
jest.mock('@angular/core', () => {
  const sharedMock = jest.requireActual<Record<string, unknown>>('src/__mocks__/angular-core');

  return {
    ...sharedMock,
    Component: () => (target: unknown) => target
  };
});

import type { ChangeDetectorRef } from '@angular/core';
import type { SongPlayer } from 'src/app/model/song.player';
import { MetronomeComponent } from '../metronome.component';

interface Harness {
  component: MetronomeComponent;
  cdr: { detectChanges: jest.Mock };
  emit: (beat: number) => void;
}

function createComponent(): Harness {
  let listener: (beat: number) => void = () => undefined;
  const player = {
    metronome$: {
      subscribe: (fn: (beat: number) => void) => {
        listener = fn;
        return { unsubscribe: jest.fn() };
      }
    }
  } as unknown as SongPlayer;
  const cdr = { detectChanges: jest.fn() };

  return {
    component: new MetronomeComponent(player, cdr as unknown as ChangeDetectorRef),
    cdr,
    emit: beat => listener(beat)
  };
}

describe('MetronomeComponent · recorte de ancho', () => {
  it('renderiza 16 puntos (2 compases de 8)', () => {
    const { component } = createComponent();

    expect(component.beats.length).toBe(16);
    expect(component.beats[0]).toBe(0);
    expect(component.beats[15]).toBe(15);
  });

  it('mantiene el beat activo con módulo de 16 y refresca la vista', () => {
    const { component, cdr, emit } = createComponent();
    component.ngOnInit();

    expect(component.currentBeat).toBe(-1);

    emit(17);
    expect(component.currentBeat).toBe(1);

    emit(16);
    expect(component.currentBeat).toBe(0);

    expect(cdr.detectChanges).toHaveBeenCalledTimes(2);

    component.ngOnDestroy();
  });
});
