export enum PlayMode {
    CHORD = 0,
    ASCENDING = 1,
    DESCENDING = 2,
    ASC_DESC = 3,
    DESC_ASC = 4,
    EVEN_ASC_ODD_ASC = 5,
    EVEN_ASC_ODD_DESC = 6,
    EVEN_DESC_ODD_DESC = 7,
    EVEN_DESC_ODD_ASC = 8,
    ODD_ASC_EVEN_ASC = 9,
    ODD_ASC_EVEN_DESC = 10,
    ODD_DESC_EVEN_DESC = 11,
    ODD_DESC_EVEN_ASC = 12,
    RANDOM = 13,
    PATTERN = 14
};
export function getPlayModeFromString(mode:string): PlayMode{
    switch(mode){
        case 'CHORD': return PlayMode.CHORD;
        case 'ASCENDING': return PlayMode.ASCENDING;
        case 'DESCENDING': return PlayMode.DESCENDING;
        case 'ASC_DESC': return PlayMode.ASC_DESC;
        case 'DESC_ASC': return PlayMode.DESC_ASC;
        case 'EVEN_ASC_ODD_ASC': return PlayMode.EVEN_ASC_ODD_ASC;
        case 'EVEN_ASC_ODD_DESC': return PlayMode.EVEN_ASC_ODD_DESC;
        case 'EVEN_DESC_ODD_DESC': return PlayMode.EVEN_DESC_ODD_DESC;
        case 'EVEN_DESC_ODD_ASC': return PlayMode.EVEN_DESC_ODD_ASC;
        case 'ODD_ASC_EVEN_ASC': return PlayMode.ODD_ASC_EVEN_ASC;
        case 'ODD_ASC_EVEN_DESC': return PlayMode.ODD_ASC_EVEN_DESC;
        case 'ODD_DESC_EVEN_DESC': return PlayMode.ODD_DESC_EVEN_DESC;
        case 'ODD_DESC_EVEN_ASC': return PlayMode.ODD_DESC_EVEN_ASC;
        case 'RANDOM': return PlayMode.RANDOM;
        case 'PATTERN': return PlayMode.PATTERN;
    }
    return PlayMode.CHORD;
}
export function getPlayModeNames():string[]{
    return Object.keys(PlayMode).filter(key => isNaN(Number(key)));
}    

export let isOdd = (t: number) => t % 2 === 1;
export let isEven = (t: number) => t % 2 === 0;

export function arpeggiate(notes: number[], mode: PlayMode): number[] {
    if (!notes || notes.length === 0) {
        return [];
    }
    if (mode === PlayMode.CHORD) {
        return notes;
    }
    const arpeggios = getArpeggios(notes, mode);
    if (!arpeggios || arpeggios.length === 0) {
        return notes;
    }
    return arpeggios.flat();
}
export function getArpeggios(notes: number[], mode: PlayMode): number[][] {
    if (!notes || notes.length === 0) {
        return [[]];
    }
    switch (mode) {
        case PlayMode.CHORD:
            return [notes];
        case PlayMode.ASCENDING: 
            return [notes];
        case PlayMode.DESCENDING:
            return [notes.slice().reverse()];
        case PlayMode.ASC_DESC:
            const ascending = notes.slice();
            const descending = notes.slice().reverse();
            return [ascending, descending];
        case PlayMode.DESC_ASC:
            const desc = notes.slice().reverse();
            const asc = notes.slice();
            return [desc, asc];
        case PlayMode.EVEN_ASC_ODD_ASC:
            return [
                notes.filter((_, index) => isEven(index)),
                notes.filter((_, index) => isOdd(index))
            ];
        case PlayMode.EVEN_ASC_ODD_DESC:
            return [
                notes.filter((_, index) => isEven(index)),
                notes.filter((_, index) => isOdd(index)).reverse()
            ];
        case PlayMode.EVEN_DESC_ODD_DESC:
            return [
                notes.filter((_, index) => isEven(index)).reverse(),
                notes.filter((_, index) => isOdd(index)).reverse()
            ];
        case PlayMode.EVEN_DESC_ODD_ASC:
            return [
                notes.filter((_, index) => isEven(index)).reverse(),
                notes.filter((_, index) => isOdd(index))
            ];
        case PlayMode.ODD_ASC_EVEN_ASC:
            return [
                notes.filter((_, index) => isOdd(index)),
                notes.filter((_, index) => isEven(index))
            ];
        case PlayMode.ODD_ASC_EVEN_DESC:
            return [
                notes.filter((_, index) => isOdd(index)),
                notes.filter((_, index) => isEven(index)).reverse()
            ];
        case PlayMode.ODD_DESC_EVEN_DESC:
            return [
                notes.filter((_, index) => isOdd(index)).reverse(),
                notes.filter((_, index) => isEven(index)).reverse()
            ];
        case PlayMode.ODD_DESC_EVEN_ASC:
            return [
                notes.filter((_, index) => isOdd(index)).reverse(),
                notes.filter((_, index) => isEven(index))
            ];
        case PlayMode.RANDOM:
            return [shuffle(notes.slice())];
        case PlayMode.PATTERN:
            return [notes];
        default:
            return [notes];
    }
}
export function shuffle(array: number[]): number[] {
    var m = array.length, t, i;

    // While there remain elements to shuffle…
    while (m) {

        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }

    return array;
}

