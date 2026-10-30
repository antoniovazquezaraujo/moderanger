#!/usr/bin/env node
/**
 * CLI de Mode Ranger.
 *
 * Comandos:
 *   moderanger compile <song.mr>   .mr → .mid (o JSON)
 *   moderanger check <song.mr>     validación del documento
 *   moderanger version
 *
 * `moderanger-mid <song.mr>` se mantiene como alias del antiguo binario y
 * equivale a `moderanger compile <song.mr>`.
 */
import * as fs from 'fs';
import * as path from 'path';
import { prepareSongText } from '@moderanger/core';
import { compileSongText } from '../compile-midi';
import { buildMidi } from '../midi-writer';

interface CompileOptions {
    input: string | null;
    output: string | null;
    ppq: number;
    json: boolean;
    quiet: boolean;
    help: boolean;
}

interface CheckOptions {
    input: string | null;
    quiet: boolean;
    help: boolean;
}

interface FormattableError {
    format(fileName?: string): string;
}

const stdout = (text: string): void => {
    process.stdout.write(String(text) + '\n');
};

// Los logs internos del motor no forman parte de la salida del CLI.
console.log = () => undefined;

function readVersion(): string {
    try {
        const packagePath = path.resolve(__dirname, '..', '..', 'package.json');
        return JSON.parse(fs.readFileSync(packagePath, 'utf8')).version || '0.0.0';
    } catch {
        return '0.0.0';
    }
}

const VERSION = readVersion();

function globalUsage(): string {
    return [
        'Usage: moderanger <command> [options]',
        '',
        'Commands:',
        '  compile <song.mr>   Compile a .mr song to MIDI (or JSON)',
        '  check <song.mr>     Validate a .mr song',
        '  version             Show the version',
        '  help                Show this help',
        '',
        'Legacy: moderanger-mid <song.mr> is equivalent to compile.',
        'Use "-" as the input to read .mr from stdin.'
    ].join('\n');
}

function compileUsage(): string {
    return [
        'Usage: moderanger compile <song.mr> [options]',
        '',
        'Compile a Mode Ranger .mr file to a Standard MIDI File (type 1).',
        '',
        'Options:',
        '  -o, --output <file>   Output file (default: input with .mid extension)',
        '  --ppq <n>             Ticks per quarter note (default: 960)',
        '  --json                Write the compiled event model as JSON instead of MIDI',
        '  --quiet               Do not print the success summary',
        '  -h, --help            Show this help',
        '',
        'Use "-" as the input to read .mr from stdin (requires -o).'
    ].join('\n');
}

function checkUsage(): string {
    return [
        'Usage: moderanger check <song.mr> [options]',
        '',
        'Validate a Mode Ranger .mr file without generating output.',
        '',
        'Options:',
        '  --quiet               Do not print the success message',
        '  -h, --help            Show this help',
        '',
        'Use "-" as the input to read .mr from stdin.'
    ].join('\n');
}

function requiredValue(argv: string[], index: number, option: string): string {
    const value = argv[index];
    if (value === undefined) {
        throw new Error(`Missing value for ${option}`);
    }
    return value;
}

function parseCompileArgs(argv: string[]): CompileOptions {
    const options: CompileOptions = {
        input: null,
        output: null,
        ppq: 960,
        json: false,
        quiet: false,
        help: false
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '-h' || arg === '--help') {
            options.help = true;
        } else if (arg === '-o' || arg === '--output') {
            options.output = requiredValue(argv, ++i, arg);
        } else if (arg === '--ppq') {
            options.ppq = Number.parseInt(requiredValue(argv, ++i, arg), 10);
        } else if (arg === '--json') {
            options.json = true;
        } else if (arg === '--quiet') {
            options.quiet = true;
        } else if (arg.startsWith('-') && arg !== '-') {
            throw new Error(`Unknown option: ${arg}`);
        } else if (options.input === null) {
            options.input = arg;
        } else {
            throw new Error(`Unexpected argument: ${arg}`);
        }
    }

    return options;
}

function parseCheckArgs(argv: string[]): CheckOptions {
    const options: CheckOptions = { input: null, quiet: false, help: false };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '-h' || arg === '--help') {
            options.help = true;
        } else if (arg === '--quiet') {
            options.quiet = true;
        } else if (arg.startsWith('-') && arg !== '-') {
            throw new Error(`Unknown option: ${arg}`);
        } else if (options.input === null) {
            options.input = arg;
        } else {
            throw new Error(`Unexpected argument: ${arg}`);
        }
    }

    return options;
}

function readInput(input: string): string {
    if (input === '-') {
        return fs.readFileSync(0, { encoding: 'utf8' });
    }
    return fs.readFileSync(input, 'utf8');
}

function inputLabel(input: string): string {
    return input === '-' ? '<stdin>' : input;
}

function defaultOutput(input: string | null, json: boolean): string | null {
    if (!input || input === '-') {
        return null;
    }
    const extension = json ? '.json' : '.mid';
    return input.replace(/\.mr$/i, '') + extension;
}

function isFormattableError(error: unknown): error is FormattableError {
    return typeof error === 'object'
        && error !== null
        && typeof (error as { format?: unknown }).format === 'function';
}

function printError(error: unknown, input: string): void {
    if (process.env['MODERANGER_DEBUG'] && error instanceof Error && error.stack) {
        console.error(error.stack);
    }
    if (isFormattableError(error)) {
        console.error(error.format(inputLabel(input)));
    } else {
        console.error(`${inputLabel(input)}: error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function runCompile(argv: string[]): Promise<void> {
    let options: CompileOptions;
    try {
        options = parseCompileArgs(argv);
    } catch (error) {
        console.error(`moderanger: ${error instanceof Error ? error.message : String(error)}`);
        console.error(compileUsage());
        process.exitCode = 2;
        return;
    }

    if (options.help) {
        stdout(compileUsage());
        return;
    }
    if (!options.input) {
        console.error('moderanger: missing input .mr file');
        console.error(compileUsage());
        process.exitCode = 2;
        return;
    }
    if (!Number.isInteger(options.ppq) || options.ppq < 24) {
        console.error('moderanger: --ppq must be an integer >= 24');
        process.exitCode = 2;
        return;
    }

    const output = options.output || defaultOutput(options.input, options.json);
    if (!output) {
        console.error('moderanger: stdin input requires -o/--output');
        process.exitCode = 2;
        return;
    }

    if (options.quiet) {
        console.warn = () => undefined;
    }

    try {
        const text = readInput(options.input);
        const compiled = await compileSongText(text, { ppq: options.ppq });
        const data = options.json
            ? Buffer.from(JSON.stringify(compiled, null, 2) + '\n', 'utf8')
            : buildMidi(compiled);
        fs.writeFileSync(output, data);
        if (!options.quiet) {
            const notes = compiled.parts.reduce((total, part) => total + part.notes.length, 0);
            stdout(`Compiled ${notes} note${notes === 1 ? '' : 's'} → ${output}`);
            compiled.warnings.forEach(warning => console.warn(`warning: ${warning}`));
        }
    } catch (error) {
        printError(error, options.input);
        process.exitCode = 1;
    }
}

function runCheck(argv: string[]): void {
    let options: CheckOptions;
    try {
        options = parseCheckArgs(argv);
    } catch (error) {
        console.error(`moderanger: ${error instanceof Error ? error.message : String(error)}`);
        console.error(checkUsage());
        process.exitCode = 2;
        return;
    }

    if (options.help) {
        stdout(checkUsage());
        return;
    }
    const input = options.input;
    if (!input) {
        console.error('moderanger: missing input .mr file');
        console.error(checkUsage());
        process.exitCode = 2;
        return;
    }

    try {
        const result = prepareSongText(readInput(input));
        if (result.document === undefined) {
            result.errors.forEach(error => console.error(error.format(inputLabel(input))));
            if (result.serializeError !== undefined) {
                console.error(`${inputLabel(input)}: error: ${result.serializeError}`);
            }
            process.exitCode = 1;
            return;
        }
        if (!options.quiet) {
            stdout(`OK ${inputLabel(input)}`);
        }
    } catch (error) {
        printError(error, input);
        process.exitCode = 1;
    }
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    const invokedAs = path.basename(process.argv[1] ?? '');
    const command = argv[0];

    // Alias del binario antiguo: `moderanger-mid cancion.mr`.
    if (invokedAs === 'moderanger-mid') {
        if (argv[0] === 'version' || argv[0] === '-v' || argv[0] === '--version') {
            stdout(`moderanger ${VERSION}`);
            return;
        }
        await runCompile(argv);
        return;
    }

    if (!command || command === 'help' || command === '-h' || command === '--help') {
        stdout(globalUsage());
        return;
    }
    if (command === 'version' || command === '-v' || command === '--version') {
        stdout(`moderanger ${VERSION}`);
        return;
    }
    if (command === 'compile') {
        await runCompile(argv.slice(1));
        return;
    }
    if (command === 'check') {
        runCheck(argv.slice(1));
        return;
    }

    // Compatibilidad: `moderanger cancion.mr` equivale a compile.
    if (command === '-' || command.endsWith('.mr') || command.startsWith('-')) {
        await runCompile(argv);
        return;
    }

    console.error(`moderanger: unknown command '${command}'`);
    console.error(globalUsage());
    process.exitCode = 2;
}

main().catch(error => {
    console.error(`moderanger: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
});
