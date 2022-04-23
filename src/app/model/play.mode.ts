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
    RANDOM = 13
};
export let isOdd = (t: number) => t % 2 === 1;
export let isEven = (t: number) => t % 2 === 0;

export function arpeggiate(notes: number[], mode: PlayMode): number[] {
    return getArpeggios(notes, mode).reduce((acc, val) => {
        return acc.concat(val);
    }, []);
}
export function getArpeggios(notes: number[], mode: PlayMode): number[][] {
    switch (mode) {
        case PlayMode.CHORD:
            return [];
        case PlayMode.ASCENDING:
            return [notes];
        case PlayMode.DESCENDING:
            return [[...notes].reverse()];
        case PlayMode.ASC_DESC:
            return [[...notes].slice(0, -1), [...notes].reverse()];
        case PlayMode.DESC_ASC:
            let [_, ...notesExceptFirstElement] = notes;
            return [[...notes].reverse(), notesExceptFirstElement];
        case PlayMode.EVEN_ASC_ODD_ASC:
            return [notes.filter((value, index) => isEven(index)), notes.filter((value, index) => isOdd(index))];
        case PlayMode.EVEN_ASC_ODD_DESC:
            return [notes.filter((value, index) => isEven(index)), notes.filter((value, index) => isOdd(index)).reverse()];
        case PlayMode.EVEN_DESC_ODD_DESC:
            return [notes.filter((value, index) => isEven(index)).reverse(), notes.filter((value, index) => isOdd(index)).reverse()];
        case PlayMode.EVEN_DESC_ODD_ASC:
            return [notes.filter((value, index) => isEven(index)).reverse(), notes.filter((value, index) => isOdd(index))];
        case PlayMode.ODD_ASC_EVEN_ASC:
            return [notes.filter((value, index) => isOdd(index)), notes.filter((value, index) => isEven(index))];
        case PlayMode.ODD_ASC_EVEN_DESC:
            return [notes.filter((value, index) => isOdd(index)), notes.filter((value, index) => isEven(index)).reverse()];
        case PlayMode.ODD_DESC_EVEN_DESC:
            return [notes.filter((value, index) => isOdd(index)).reverse(), notes.filter((value, index) => isEven(index)).reverse()];
        case PlayMode.ODD_DESC_EVEN_ASC:
            return [notes.filter((value, index) => isOdd(index)).reverse(), notes.filter((value, index) => isEven(index))];
        case PlayMode.RANDOM:
            return [shuffle(notes)];
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

