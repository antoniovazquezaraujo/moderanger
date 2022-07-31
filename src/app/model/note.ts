export class SoundBit {
        duration:string;
        note?:number|undefined;
        constructor(duration:string, note?:number){
            this.duration = duration;
            this.note = note;
        }
}
export class Rest extends SoundBit{
    constructor(duration:string) {
        super(duration);
    }
}
export class Note extends SoundBit{
    constructor(duration:string, note:number){
        super(duration, note);
    }
}
export class NoteGroup extends SoundBit{
    notes:number[];
    constructor(duration:string, notes:number[]){
        super(duration);
        this.notes = notes;
    }
}
export class Arpeggio extends NoteGroup{

}
export class Chord extends NoteGroup{

}
