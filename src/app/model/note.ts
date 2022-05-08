export class SoundBit {
        duration:number;
        constructor(duration:number){
            this.duration = duration;
        }
}
export class Rest extends SoundBit{
    constructor(duration:number) {
        super(duration);
    }
}
export class Note extends SoundBit{
    note?:number;
    constructor(part:Partial<Note>){
        if(part.duration){
            super(part.duration);
        }
        else{
            super(0);
        }
        if(part.note)  {
            this.note = part.note;
        }
    }
}