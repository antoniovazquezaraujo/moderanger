import { ScalePreviewComponent } from './scale-preview.component';

function degrees(scale: string): number[] {
  const component = new ScalePreviewComponent();
  component.scale = scale;
  return component.cells.flat().filter((value): value is number => value !== null);
}

describe('ScalePreviewComponent', () => {
  it('distribuye los grados alrededor de la rejilla de 12 celdas', () => {
    const component = new ScalePreviewComponent();
    component.scale = 'WHITE';

    expect(component.cells).toEqual([
      [4, null, 5],
      [null, null, null],
      [3, null, 6],
      [2, null, 7],
      [null, 1, null]
    ]);
  });

  it('mantiene todos los grados de cada escala', () => {
    expect(degrees('WHITE')).toEqual([4, 5, 3, 6, 2, 7, 1]);
    expect(degrees('BLUE')).toEqual([4, 5, 3, 6, 2, 7, 1]);
    expect(degrees('RED')).toEqual([4, 5, 3, 6, 2, 1, 7]);
    expect(degrees('BLACK')).toEqual([4, 5, 3, 6, 2, 7, 1, 8]);
    expect(degrees('PENTA')).toEqual([3, 4, 2, 5, 1]);
    expect(degrees('TONES')).toEqual([4, 3, 5, 2, 6, 1]);
    expect(degrees('FULL')).toEqual([6, 7, 8, 5, 9, 4, 10, 3, 11, 2, 1, 12]);
  });

  it('expone una etiqueta accesible con la escala y sus grados', () => {
    const component = new ScalePreviewComponent();
    component.scale = 'BLUE';

    expect(component.ariaLabel).toContain('BLUE scale');
    expect(component.ariaLabel).toContain('4, 5, 3, 6, 2, 7, 1');
  });
});
