import * as fs from 'fs';
import * as path from 'path';
import { getPlayModeNames } from 'src/app/model/play.mode';
import {
    playModeDescription,
    playModeOptions,
    playModeSymbol
} from '../play-mode-display';

const template = fs.readFileSync(path.resolve(__dirname, '../block-commands.component.html'), 'utf8');

describe('play mode display', () => {
    it('usa símbolos y descripciones para todos los modos', () => {
        const options = playModeOptions(getPlayModeNames());

        expect(options).toHaveLength(15);
        for (const option of options) {
            expect(option.symbol.length).toBeGreaterThan(0);
            expect(option.description.length).toBeGreaterThan(0);
            expect(option.value).toBeTruthy();
        }
    });

    it('expresa EVEN/ODD con grupos y flechas', () => {
        expect(playModeSymbol('EVEN_ASC_ODD_ASC')).toBe('○↑ ●↑');
        expect(playModeSymbol('EVEN_ASC_ODD_DESC')).toBe('○↑ ●↓');
        expect(playModeSymbol('ODD_DESC_EVEN_ASC')).toBe('●↓ ○↑');
        expect(playModeDescription('EVEN_ASC_ODD_DESC'))
            .toBe('Even group ascending, odd group descending');
    });

    it('el selector pinta símbolos y deja el nombre en title/tooltip', () => {
        expect(template).toContain('*ngFor="let mode of playModeOptions"');
        expect(template).toContain('[title]="mode.description"');
        expect(template).toContain('playModeDescription(getPlayModeString(command))');
        expect(template).toContain('operationPlayModeDescription(operation.value)');
    });

    it('mantiene un fallback legible para nombres desconocidos', () => {
        expect(playModeSymbol('UNKNOWN')).toBe('UNKNOWN');
        expect(playModeDescription('UNKNOWN')).toBe('UNKNOWN');
    });
});
