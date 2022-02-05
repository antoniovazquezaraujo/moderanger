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
    ODD_DESC_EVEN_ASC = 12
};
export let isOdd = (t: number) => t % 2 === 1;
export let isEven = (t: number) => t % 2 === 0;

export function arpeggiate(notes:number[], mode:PlayMode):number[]{
    return getArpeggios(notes, mode).reduce((acc, val) => {
        return acc.concat(val);
    }, []);
}
export function getArpeggios(notes:number[], mode: PlayMode ):number[][] {
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
            let [_, ...notesExceptFirstElement]  = notes;
            return [[...notes].reverse(), notesExceptFirstElement];
        case PlayMode.EVEN_ASC_ODD_ASC:
            return [notes.filter((t) => isEven(t)), notes.filter((t) => isOdd(t))];
        case PlayMode.EVEN_ASC_ODD_DESC:
            return [notes.filter((t) => isEven(t)), notes.filter((t) => isOdd(t)).reverse()];
        case PlayMode.EVEN_DESC_ODD_DESC:
            return [notes.filter((t) => isEven(t)).reverse(), notes.filter((t) => isOdd(t)).reverse()];
        case PlayMode.EVEN_DESC_ODD_ASC:
            return [notes.filter((t) => isEven(t)).reverse(), notes.filter((t) => isOdd(t))];
        case PlayMode.ODD_ASC_EVEN_ASC:
            return [notes.filter((t) => isOdd(t)), notes.filter((t) => isEven(t))];
        case PlayMode.ODD_ASC_EVEN_DESC:
            return [notes.filter((t) => isOdd(t)), notes.filter((t) => isEven(t)).reverse()];
        case PlayMode.ODD_DESC_EVEN_DESC:
            return [notes.filter((t) => isOdd(t)).reverse(), notes.filter((t) => isEven(t)).reverse()];
        case PlayMode.ODD_DESC_EVEN_ASC:
            return [notes.filter((t) => isOdd(t)).reverse(), notes.filter((t) => isEven(t))];
    }
}
