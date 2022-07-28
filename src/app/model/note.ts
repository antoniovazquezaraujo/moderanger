export class SoundBit {
        duration:string;
        constructor(duration:string){
            this.duration = duration;
        }
}
export class Rest extends SoundBit{
    constructor(duration:string) {
        super(duration);
    }
}
export class Note extends SoundBit{
    note?:number;
    constructor(part:Partial<Note>){
        if(part.duration){
            super(part.duration);
        }else{
            super("1n");
        }
        if(part.note || part.note === 0){  
            this.note = part.note;
        }
    }
}