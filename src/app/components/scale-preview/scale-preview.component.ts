import { Component, Input } from '@angular/core';
import { Scale } from 'src/app/model/scale';

/**
 * Semitono -> celda del anillo de 12 posiciones.
 *
 * La rejilla tiene 3 columnas y 5 filas: 12 celdas en el perímetro y las
 * tres celdas interiores de la columna central quedan vacías. El anillo
 * empieza en 1 (abajo, centro) y sube por la izquierda hasta 12 (abajo,
 * derecha).
 */
const SEMITONE_CELLS: ReadonlyArray<readonly [number, number]> = [
    [4, 1], // 0: 1, abajo centro
    [4, 0], // 1
    [3, 0], // 2
    [2, 0], // 3
    [1, 0], // 4
    [0, 0], // 5
    [0, 1], // 6
    [0, 2], // 7
    [1, 2], // 8
    [2, 2], // 9
    [3, 2], // 10
    [4, 2]  // 11
];

/**
 * Miniatura de una escala para el selector del editor de presets.
 *
 * La disposición reproduce el diagrama de referencia: 3 columnas × 5 filas,
 * con las 12 celdas del perímetro ocupadas por los grados y las tres celdas
 * interiores de la columna central vacías.
 */
@Component({
    selector: 'app-scale-preview',
    templateUrl: './scale-preview.component.html',
    styleUrls: ['./scale-preview.component.scss']
})
export class ScalePreviewComponent {
    @Input() scale = 'WHITE';

    get scaleName(): string {
        return this.scale || 'WHITE';
    }

    get cells(): ReadonlyArray<ReadonlyArray<number | null>> {
        const scale = Scale.getScaleByName(this.scaleName);
        const result: Array<Array<number | null>> = Array.from(
            { length: 5 },
            () => [null, null, null] as Array<number | null>
        );
        scale.notes.forEach((semitone, index) => {
            const [row, column] = SEMITONE_CELLS[semitone % SEMITONE_CELLS.length];
            result[row][column] = index + 1;
        });
        return result;
    }

    get ariaLabel(): string {
        const degrees = this.cells
            .flat()
            .filter((value): value is number => value !== null)
            .join(', ');
        return `${this.scaleName} scale: degrees ${degrees}`;
    }
}
