import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

const root = path.resolve(__dirname, '../../..');
const cli = path.resolve(__dirname, '../main.js');

/** `fs.rmSync` existe en Node 16, pero @types/node 12 aún no lo declara. */
const removeDirectory = (directory: string): void => {
    const fsWithRm = fs as unknown as {
        rmSync(target: string, options: { recursive: boolean; force: boolean }): void;
    };
    fsWithRm.rmSync(directory, { recursive: true, force: true });
};

const runCli = (args: string[], input?: string) =>
    spawnSync(process.execPath, [cli, ...args], {
        cwd: root,
        encoding: 'utf8',
        input,
        timeout: 120000
    });

describe('CLI moderanger-mid', () => {
    let dir: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moderanger-mid-'));
    });

    afterEach(() => {
        removeDirectory(dir);
    });

    it('compila un .mr a un .mid válido', () => {
        const input = path.join(dir, 'cancion.mr');
        const output = path.join(dir, 'cancion.mid');
        fs.writeFileSync(input, [
            'song CLI',
            'version 1',
            '',
            'part Piano',
            '  block Tema',
            '    notes',
            '      4n:0',
            '      4n:2',
            ''
        ].join('\n'));

        const result = runCli([input, '-o', output, '--quiet']);

        expect(result.status).toBe(0);
        const midi = fs.readFileSync(output);
        expect(midi.subarray(0, 4).toString('ascii')).toBe('MThd');
        expect(midi.readUInt16BE(12)).toBe(960);
    });

    it('devuelve código 1 y la posición del error con un .mr inválido', () => {
        const input = path.join(dir, 'roto.mr');
        fs.writeFileSync(input, [
            'song Roto',
            'version 1',
            '',
            'part Piano',
            '  block Tema',
            '    notes',
            '      4n:( 0 2',
            ''
        ].join('\n'));

        const result = runCli([input, '-o', path.join(dir, 'roto.mid')]);

        expect(result.status).toBe(1);
        expect(result.stderr).toContain(`${input}:7:`);
        expect(result.stderr).toContain('error:');
    });
});
