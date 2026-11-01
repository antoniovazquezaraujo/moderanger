import * as fs from 'fs';
import * as path from 'path';
import {
    BaseErrorListener,
    CharStream,
    CommonTokenStream,
    RecognitionException,
    Recognizer,
    Token
} from 'antlr4ng';
import { MrLexer } from './gen/MrLexer';
import { MrParser } from './gen/MrParser';

class SyntaxErrorCollector extends BaseErrorListener {
    readonly errors: string[] = [];

    override syntaxError<S extends Token, T extends import('antlr4ng').ATNSimulator>(
        _recognizer: Recognizer<T>,
        _offendingSymbol: S | null,
        line: number,
        column: number,
        msg: string,
        _e: RecognitionException | null
    ): void {
        this.errors.push(`${line}:${column}: ${msg}`);
    }
}

const INDENT = '\uE000';
const DEDENT = '\uE001';

function preprocess(source: string, label: string): string {
    const rawLines = source.replace(/\r\n/g, '\n').split('\n');
    const out: string[] = [];
    const stack = [0];

    for (let index = 0; index < rawLines.length; index++) {
        const raw = rawLines[index];
        const trimmed = raw.trim();
        if (trimmed === '' || trimmed.startsWith('#')) {
            // Keep the line in the stream so lexer token positions retain the
            // original line numbers. Blank lines become a comment; the lexer
            // skips both blank-equivalent and comment-only lines.
            out.push(trimmed === '' ? '#\n' : raw + '\n');
            continue;
        }

        const leading = /^[ \t]*/.exec(raw)![0];
        if (leading.includes('\t')) {
            throw new Error(`${label}:${index + 1}: tabs are not allowed for indentation`);
        }
        const indent = leading.length;
        if (indent % 2 !== 0) {
            throw new Error(`${label}:${index + 1}: indentation must be a multiple of 2 spaces`);
        }

        if (indent > stack[stack.length - 1]) {
            if (indent !== stack[stack.length - 1] + 2) {
                throw new Error(`${label}:${index + 1}: indentation jumped more than one level`);
            }
            stack.push(indent);
            out.push(INDENT);
        } else {
            while (indent < stack[stack.length - 1]) {
                stack.pop();
                out.push(DEDENT);
            }
            if (indent !== stack[stack.length - 1]) {
                throw new Error(`${label}:${index + 1}: dedent does not match any open indentation level`);
            }
        }

        out.push(raw.slice(indent) + '\n');
    }

    while (stack.length > 1) {
        stack.pop();
        out.push(DEDENT);
    }

    return out.join('');
}

function parse(label: string, source: string): string[] {
    let transformed: string;
    try {
        transformed = preprocess(source, label);
    } catch (error) {
        return [String(error instanceof Error ? error.message : error)];
    }

    const lexer = new MrLexer(CharStream.fromString(transformed));
    const tokens = new CommonTokenStream(lexer);
    const parser = new MrParser(tokens);
    const errors = new SyntaxErrorCollector();
    parser.removeErrorListeners();
    parser.addErrorListener(errors);
    parser.document();
    return errors.errors;
}

const REPO = path.resolve(__dirname, '../../..');

function runCorpus(): void {
    const corpusDir = path.join(REPO, 'src/app/model/mr/__tests__/corpus');
    const files = fs.readdirSync(corpusDir).filter(file => file.endsWith('.mr')).sort();
    for (const file of files) {
        const source = fs.readFileSync(path.join(corpusDir, file), 'utf8');
        const errors = parse(file, source);
        console.log(`${errors.length === 0 ? 'PASS' : 'FAIL'} corpus/${file}${errors.length > 0 ? `\n  ${errors.slice(0, 5).join('\n  ')}` : ''}`);
    }
}

function runExamples(): void {
    const examplesPath = path.join(REPO, 'src/app/model/examples.ts');
    const source = fs.readFileSync(examplesPath, 'utf8');
    const entries = [...source.matchAll(/mr:\s*`([\s\S]*?)`/g)];
    entries.forEach((match, index) => {
        const errors = parse(`example-${index + 1}`, match[1]);
        console.log(`${errors.length === 0 ? 'PASS' : 'FAIL'} example/${index + 1}${errors.length > 0 ? `\n  ${errors.slice(0, 5).join('\n  ')}` : ''}`);
    });

    const demoSource = fs.readFileSync(path.join(REPO, 'src/app/model/demo-song.ts'), 'utf8');
    const demo = /DEMO_SONG_MR = `([\s\S]*?)`/.exec(demoSource);
    if (!demo) {
        console.log('FAIL example/demo: DEMO_SONG_MR not found');
        return;
    }
    const demoErrors = parse('example/demo', demo[1]);
    console.log(`${demoErrors.length === 0 ? 'PASS' : 'FAIL'} example/demo${demoErrors.length > 0 ? `\n  ${demoErrors.slice(0, 5).join('\n  ')}` : ''}`);
    console.log(`examples found: ${entries.length + 1}`);
}

function runInvalidCases(): void {
    const cases: Array<[string, string]> = [
        ['tab indentation', 'song Test\nversion 1\n\npart\n\tblock\n    notes\n      4n:0\n'],
        ['tab separator', 'song\tTest\nversion 1\n\npart\n  block\n    notes\n      4n:0\n'],
        ['odd indentation', 'song Test\nversion 1\n\npart\n   block\n    notes\n      4n:0\n'],
        ['unclosed group', 'song Test\nversion 1\n\npart\n  block\n    notes\n      4n:( 0 2\n'],
        ['lowercase command', 'song Test\nversion 1\n\npart\n  block\n    commands\n      scale WHITE\n'],
        ['notes variable with children', 'song Test\nversion 1\n\npart\n  block\n    notes $motif\n      4n:0\n'],
        ['notes inside a reference', 'song Test\nversion 1\n\npart\n  use A\n    notes\n      4n:0\n'],
        ['unknown scale', 'song Test\nversion 1\n\npart\n  block\n    commands\n      SCALE PURPLE\n']
    ];

    for (const [name, source] of cases) {
        const errors = parse(name, source);
        console.log(`${errors.length > 0 ? 'REJECT' : 'ACCEPT'} invalid/${name}${errors.length > 0 ? `\n  ${errors[0]}` : ''}`);
    }

    const semanticCases: Array<[string, string]> = [
        ['bpm out of range', 'song Test\nversion 1\nbpm 999\n\npart\n  block\n    notes\n      4n:0\n'],
        ['unsupported version', 'song Test\nversion 2\n\npart\n  block\n    notes\n      4n:0\n'],
        ['negative song repeats', 'song Test\nversion 1\nrepeats -1\n\npart\n  block\n    notes\n      4n:0\n'],
        ['duplicate notes section', 'song Test\nversion 1\n\npart\n  block\n    notes\n      4n:0\n    notes\n      4n:2\n'],
        ['duplicate variable', 'song Test\nversion 1\n\nvars\n  $x = 1\n  $x = 2\n\npart\n  block\n    notes\n      4n:0\n']
    ];

    for (const [name, source] of semanticCases) {
        const errors = parse(name, source);
        console.log(`${errors.length === 0 ? 'SEMANTIC' : 'REJECT'} semantic/${name}${errors.length > 0 ? `\n  ${errors[0]}` : ''}`);
    }
}

function runTiming(): void {
    const corpusDir = path.join(REPO, 'src/app/model/mr/__tests__/corpus');
    const sources = fs.readdirSync(corpusDir)
        .filter(file => file.endsWith('.mr'))
        .map(file => fs.readFileSync(path.join(corpusDir, file), 'utf8'));
    const start = process.hrtime.bigint();
    for (let i = 0; i < 100; i++) {
        for (const source of sources) {
            parse('timing', source);
        }
    }
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    console.log(`timing: ${(elapsedMs / (100 * sources.length)).toFixed(3)} ms/document`);
}

runCorpus();
runExamples();
runInvalidCases();
runTiming();
