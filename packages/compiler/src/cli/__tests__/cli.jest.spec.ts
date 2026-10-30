import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';

const root = path.resolve(__dirname, '../../../../..');
const cli = path.resolve(__dirname, '../../../dist/cli/main.js');

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

const writeSong = (file: string): void => {
    fs.writeFileSync(file, [
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
};

describe('CLI moderanger', () => {
    let dir: string;

    beforeAll(() => {
        execFileSync('npm', ['run', 'build:cli', '--silent'], {
            cwd: root,
            stdio: 'ignore',
            timeout: 120000
        });
    });

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moderanger-cli-'));
    });

    afterEach(() => {
        removeDirectory(dir);
    });

    it('compila un .mr a un .mid válido con el subcomando compile', () => {
        const input = path.join(dir, 'cancion.mr');
        const output = path.join(dir, 'cancion.mid');
        writeSong(input);

        const result = runCli(['compile', input, '-o', output, '--quiet']);

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

        const result = runCli(['compile', input, '-o', path.join(dir, 'roto.mid')]);

        expect(result.status).toBe(1);
        expect(result.stderr).toContain(`${input}:7:`);
        expect(result.stderr).toContain('error:');
    });

    it('rechaza un DECORATION con variable string inválida (-0)', () => {
        const input = path.join(dir, 'decoracion.mr');
        fs.writeFileSync(input, [
            'song Decoracion',
            'version 1',
            '',
            'vars',
            '  $x = "-0 1"',
            '',
            'part Piano',
            '  block Tema',
            '    notes',
            '      4n:0',
            '    commands',
            '      DECORATION $x',
            ''
        ].join('\n'));

        const result = runCli(['compile', input, '-o', path.join(dir, 'decoracion.mid')]);

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('DECORATION $x no es válido');
        expect(result.stderr).toContain("item de DECORATION inválido '-0'");
    });

    it('valida un .mr correcto con el subcomando check', () => {
        const input = path.join(dir, 'cancion.mr');
        writeSong(input);

        const result = runCli(['check', input]);

        expect(result.status).toBe(0);
        expect(result.stdout.trim()).toBe(`OK ${input}`);
        expect(result.stderr).toBe('');
    });

    it('check devuelve código 1 con un .mr inválido', () => {
        const input = path.join(dir, 'roto.mr');
        fs.writeFileSync(input, 'song Roto\nversion 1\n\npart Piano\n  block Tema\n    notes\n      4n:( 0 2\n');

        const result = runCli(['check', input]);

        expect(result.status).toBe(1);
        expect(result.stderr).toContain(`${input}:7:`);
    });

    it('muestra la versión', () => {
        const result = runCli(['version']);

        expect(result.status).toBe(0);
        expect(result.stdout.trim()).toMatch(/^moderanger \d+\.\d+\.\d+/);
    });

    it('muestra la ayuda global', () => {
        const result = runCli(['help']);

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('compile <song.mr>');
        expect(result.stdout).toContain('check <song.mr>');
        expect(result.stdout).toContain('version');
    });

    it('mantiene moderanger-mid como alias de compile', () => {
        const input = path.join(dir, 'cancion.mr');
        const output = path.join(dir, 'legacy.mid');
        const alias = path.resolve(__dirname, '../../../dist/cli/legacy.js');
        writeSong(input);

        const result = spawnSync(process.execPath, [alias, input, '-o', output, '--quiet'], {
            cwd: root,
            encoding: 'utf8',
            timeout: 120000
        });

        expect(result.status).toBe(0);
        const midi = fs.readFileSync(output);
        expect(midi.subarray(0, 4).toString('ascii')).toBe('MThd');
    });

    it('mantiene --version en el alias moderanger-mid', () => {
        const alias = path.resolve(__dirname, '../../../dist/cli/legacy.js');

        const result = spawnSync(process.execPath, [alias, '--version'], {
            cwd: root,
            encoding: 'utf8',
            timeout: 120000
        });

        expect(result.status).toBe(0);
        expect(result.stdout.trim()).toMatch(/^moderanger \d+\.\d+\.\d+/);
    });

    it('rechaza un comando desconocido', () => {
        const result = runCli(['frobnicate']);

        expect(result.status).toBe(2);
        expect(result.stderr).toContain("unknown command 'frobnicate'");
    });
});
