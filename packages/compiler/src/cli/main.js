#!/usr/bin/env node
'use strict';

/**
 * CLI del compilador `.mr` → MIDI.
 *
 * Este entrypoint es JavaScript puro para poder instalar el cargador de
 * TypeScript ANTES de importar el núcleo. El compilador no usa Angular, Tone
 * ni navegador; solo el modelo y la generación de notas.
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');

const root = path.resolve(__dirname, '..', '..', '..', '..');

// Resolver los imports absolutos `src/...` del proyecto.
process.env.NODE_PATH = [root, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();

// Resolver `@moderanger/core` en las fuentes del workspace, sin build ni
// instalación de paquetes.
const coreSrc = path.join(root, 'packages', 'core', 'src');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, parent, isMain, options) {
  if (request === '@moderanger/core') {
    return path.join(coreSrc, 'index.ts');
  }
  if (request.startsWith('@moderanger/core/')) {
    const relative = request.slice('@moderanger/core/'.length);
    const direct = path.join(coreSrc, `${relative}.ts`);
    if (fs.existsSync(direct)) {
      return direct;
    }
    const index = path.join(coreSrc, relative, 'index.ts');
    if (fs.existsSync(index)) {
      return index;
    }
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

// Cargador TS en memoria: el CLI funciona sobre las fuentes, sin paso de build.
const ts = require(path.join(root, 'node_modules', 'typescript'));
require.extensions['.ts'] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2017,
      experimentalDecorators: true,
      esModuleInterop: true,
      downlevelIteration: true,
      resolveJsonModule: true
    }
  }).outputText;
  module._compile(output, filename);
};

const { compileSongText } = require('../compile-midi');
const { buildMidi } = require('../midi-writer');

const VERSION = readVersion();

/** Salida del CLI; los logs internos del motor se silencian. */
const stdout = text => process.stdout.write(String(text) + '\n');
console.log = () => undefined;

function readVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function usage() {
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

function parseArgs(argv) {
  const options = { input: null, output: null, ppq: 960, json: false, quiet: false, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-v' || arg === '--version') {
      options.version = true;
    } else if (arg === '-o' || arg === '--output') {
      options.output = argv[++i];
    } else if (arg === '--ppq') {
      options.ppq = Number.parseInt(argv[++i], 10);
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

function readInput(input) {
  if (input === '-') {
    return fs.readFileSync(0, 'utf8');
  }
  return fs.readFileSync(input, 'utf8');
}

function defaultOutput(input, json) {
  if (!input || input === '-') {
    return null;
  }
  const extension = json ? '.json' : '.mid';
  return input.replace(/\.mr$/i, '') + extension;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`moderanger-mid: ${error.message}`);
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
    if (process.env.MODERANGER_DEBUG && error && error.stack) {
      console.error(error.stack);
    }
    if (error && typeof error.format === 'function') {
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
