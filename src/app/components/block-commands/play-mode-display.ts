export interface PlayModeDisplay {
    symbol: string;
    description: string;
}

export interface PlayModeOption extends PlayModeDisplay {
    value: string;
}

/**
 * Compact GUI representation of the canonical PLAYMODE names.
 *
 * `○` is the even-position group (indices 0, 2, 4…) and `●` the odd-position
 * group (1, 3, 5…). Arrows describe the direction of each group; groups are
 * read and played from left to right.
 */
const DISPLAY: Readonly<Record<string, PlayModeDisplay>> = {
    CHORD: { symbol: '≋', description: 'Chord: all notes together' },
    ASCENDING: { symbol: '↑', description: 'Ascending: low to high' },
    DESCENDING: { symbol: '↓', description: 'Descending: high to low' },
    ASC_DESC: { symbol: '↑↓', description: 'Ascending, then descending' },
    DESC_ASC: { symbol: '↓↑', description: 'Descending, then ascending' },
    EVEN_ASC_ODD_ASC: { symbol: '○↑ ●↑', description: 'Even group ascending, odd group ascending' },
    EVEN_ASC_ODD_DESC: { symbol: '○↑ ●↓', description: 'Even group ascending, odd group descending' },
    EVEN_DESC_ODD_DESC: { symbol: '○↓ ●↓', description: 'Even group descending, odd group descending' },
    EVEN_DESC_ODD_ASC: { symbol: '○↓ ●↑', description: 'Even group descending, odd group ascending' },
    ODD_ASC_EVEN_ASC: { symbol: '●↑ ○↑', description: 'Odd group ascending, even group ascending' },
    ODD_ASC_EVEN_DESC: { symbol: '●↑ ○↓', description: 'Odd group ascending, even group descending' },
    ODD_DESC_EVEN_DESC: { symbol: '●↓ ○↓', description: 'Odd group descending, even group descending' },
    ODD_DESC_EVEN_ASC: { symbol: '●↓ ○↑', description: 'Odd group descending, even group ascending' },
    RANDOM: { symbol: '↯', description: 'Random order' },
    SINGLE: { symbol: '•', description: 'Single note: no chord or arpeggio' }
};

export function playModeDisplay(name: string): PlayModeDisplay {
    return DISPLAY[name] ?? { symbol: name, description: name };
}

export function playModeSymbol(name: string): string {
    return playModeDisplay(name).symbol;
}

export function playModeDescription(name: string): string {
    return playModeDisplay(name).description;
}

export function playModeOptions(names: readonly string[]): PlayModeOption[] {
    return names.map(value => ({ value, ...playModeDisplay(value) }));
}
