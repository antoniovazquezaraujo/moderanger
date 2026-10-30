#!/usr/bin/env node
/**
 * CLI del compilador `.mr` → MIDI.
 *
 * Se compila a `dist/cli/main.js`; no hay cargador de TypeScript en runtime.
 */
import * as fs from 'fs';
import * as path from 'path';
import { compileSongText } from '../compile-midi';
import { buildMidi } from '../midi-writer';

interface CliOptions {
    input: string | null;
    output: string | null;
    ppq: number;
    json: boolean;
    quiet: boolean;
    help: boolean;
    version: boolean;
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

function usage(): string {
    return [
        'Usage: moderanger-mid <song.mr> [options]',
        '',
        'Compile a Mode Ranger .mr file to a Standard MIDI File (type 1).',
        '',
        'Options:',
        '  -o, --output <file>   Output file (default: input with .mid extension)',
        '  --ppq <n>             Ticks per quarter note (default: 960)',
        '  --json                Write the compiled event model as JSON instead of MIDI',
        '  --quiet               Do not print the success summary',
        '  -h, --help            Show this help',
        '  -v, --version         Show the version',
        '',
        'Use "-" as the input to read .mr from stdin (requires -o).'
    ].join('\n');
}

function requiredValue(argv: string[], index: number, option: string): string {
    const value = argv[index];
    if (value === undefined) {
        throw new Error(`Missing value for ${option}`);
    }
    return value;
}

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        input: null,
        output: null,
        ppq: 960,
        json: false,
        quiet: false,
        help: false,
        version: false
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '-h' || arg === '--help') {
            options.help = true;
        } else if (arg === '-v' || arg === '--version') {
            options.version = true;
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

function readInput(input: string): string {
    if (input === '-') {
        return fs.readFileSync(0, { encoding: 'utf8' });
    }
    return fs.readFileSync(input, 'utf8');
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

async function main(): Promise<void> {
    let options: CliOptions;
    try {
        options = parseArgs(process.argv.slice(2));
    } catch (error) {
        console.error(`moderanger-mid: ${error instanceof Error ? error.message : String(error)}`);
        console.error(usage());
        process.exitCode = 2;
        return;
    }

    if (options.help) {
        stdout(usage());
        return;
    }
    if (options.version) {
        stdout(`moderanger-mid ${VERSION}`);
        return;
    }
    if (!options.input) {
        console.error('moderanger-mid: missing input .mr file');
        console.error(usage());
        process.exitCode = 2;
        return;
    }
    if (!Number.isInteger(options.ppq) || options.ppq < 24) {
        console.error('moderanger-mid: --ppq must be an integer >= 24');
        process.exitCode = 2;
        return;
    }

    const output = options.output || defaultOutput(options.input, options.json);
    if (!output) {
        console.error('moderanger-mid: stdin input requires -o/--output');
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
        if (process.env['MODERANGER_DEBUG'] && error instanceof Error && error.stack) {
            console.error(error.stack);
        }
        if (isFormattableError(error)) {
            console.error(error.format(options.input === '-' ? '<stdin>' : options.input));
        } else {
            const name = options.input === '-' ? '<stdin>' : options.input;
            console.error(`${name}: error: ${error instanceof Error ? error.message : String(error)}`);
        }
        process.exitCode = 1;
    }
}

main().catch(error => {
    console.error(`moderanger-mid: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
});
