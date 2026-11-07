/**
 * Utilidades de las bibliotecas de contenido para la GUI.
 *
 * La referencia de un bloque a una melodía/preset/procedimiento es una
 * referencia de objeto (ADR-004): renombrar la definición no necesita cascada.
 * Estas funciones resuelven las operaciones que sí requieren recorrer el árbol:
 * crear con nombre libre, contar usos y borrar limpiando referencias.
 */
import { Block } from 'src/app/model/block';
import { Command, CommandType } from 'src/app/model/command';
import { ContentKind, Melody, Preset, Procedure } from 'src/app/model/content';
import { Song } from 'src/app/model/song';

export type ContentEntry = Melody | Preset | Procedure;

export interface ContentUsage {
    partName: string;
    partIndex: number;
    blockLabel: string;
    path: string;
}

const KIND_NAMES: Record<ContentKind, string> = {
    melody: 'Melody',
    preset: 'Preset',
    procedure: 'Procedure'
};

const LIBRARY_NAMES: Record<ContentKind, string> = {
    melody: 'melodies',
    preset: 'presets',
    procedure: 'procedures'
};

export function contentList(song: Song, kind: ContentKind): ContentEntry[] {
    switch (kind) {
        case 'melody':
            return song.melodies;
        case 'preset':
            return song.presets;
        case 'procedure':
            return song.procedures;
    }
}

export function contentLabel(entry: ContentEntry): string {
    return entry.label;
}

export function kindDisplayName(kind: ContentKind): string {
    return KIND_NAMES[kind];
}

export function libraryDisplayName(kind: ContentKind): string {
    return LIBRARY_NAMES[kind];
}

export function findContent(song: Song, kind: ContentKind, label: string): ContentEntry | undefined {
    return contentList(song, kind).find(entry => entry.label === label);
}

export function isContentLabelAvailable(
    song: Song,
    kind: ContentKind,
    label: string,
    except?: ContentEntry
): boolean {
    const trimmed = label.trim();
    if (trimmed === '') {
        return false;
    }
    return !contentList(song, kind).some(entry => entry !== except && entry.label === trimmed);
}

export function nextContentLabel(song: Song, kind: ContentKind): string {
    const base = KIND_NAMES[kind];
    let index = 1;
    while (!isContentLabelAvailable(song, kind, `${base} ${index}`)) {
        index++;
    }
    return `${base} ${index}`;
}

export function copyContentLabel(song: Song, kind: ContentKind, base: string): string {
    const stem = base.trim() === '' ? KIND_NAMES[kind] : base;
    let candidate = `${stem} copy`;
    let index = 2;
    while (!isContentLabelAvailable(song, kind, candidate)) {
        candidate = `${stem} copy ${index}`;
        index++;
    }
    return candidate;
}

/** Nueva entrada con un nombre libre y contenido mínimo útil para editarla. */
export function createContent(song: Song, kind: ContentKind): ContentEntry {
    const label = nextContentLabel(song, kind);
    switch (kind) {
        case 'melody': {
            const melody = new Melody();
            melody.label = label;
            return melody;
        }
        case 'preset': {
            const preset = new Preset();
            preset.label = label;
            preset.settings = [new Command({ type: CommandType.OCT, value: 0 })];
            return preset;
        }
        case 'procedure': {
            const procedure = new Procedure();
            procedure.label = label;
            return procedure;
        }
    }
}

export function contentUsages(song: Song, kind: ContentKind, entry: ContentEntry): ContentUsage[] {
    const usages: ContentUsage[] = [];
    song.parts.forEach((part, partIndex) => {
        part.items.forEach((block, blockIndex) => {
            collectUsages(block, kind, entry, part.name || `Part ${partIndex + 1}`, partIndex, `${blockIndex}`, usages);
        });
    });
    return usages;
}

/** Borra la entrada y limpia todas las referencias a ella. */
export function removeContent(song: Song, kind: ContentKind, entry: ContentEntry): void {
    forEachBlock(song, block => {
        if (kind === 'melody' && block.melody === entry) {
            block.melody = undefined;
        } else if (kind === 'preset' && block.preset === entry) {
            block.preset = undefined;
        } else if (kind === 'procedure' && block.procedure === entry) {
            block.procedure = undefined;
        }
    });

    const list = contentList(song, kind);
    const index = list.indexOf(entry);
    if (index !== -1) {
        list.splice(index, 1);
    }
}

export function forEachBlock(song: Song, visit: (block: Block) => void): void {
    const walk = (blocks: readonly Block[]): void => {
        blocks.forEach(block => {
            visit(block);
            walk(block.children);
        });
    };
    song.parts.forEach(part => walk(part.items));
}

function collectUsages(
    block: Block,
    kind: ContentKind,
    entry: ContentEntry,
    partName: string,
    partIndex: number,
    path: string,
    usages: ContentUsage[]
): void {
    const matches =
        (kind === 'melody' && block.melody === entry) ||
        (kind === 'preset' && block.preset === entry) ||
        (kind === 'procedure' && block.procedure === entry);
    if (matches) {
        usages.push({
            partName,
            partIndex,
            blockLabel: block.label,
            path
        });
    }
    block.children.forEach((child, index) => {
        collectUsages(child, kind, entry, partName, partIndex, `${path}.${index}`, usages);
    });
}
