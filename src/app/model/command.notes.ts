export class CommandNotes {
    public notes!:string;
 
    constructor(data: Pick<CommandNotes, "notes" >) {
        Object.assign(this, data);
    }
    public process = () : void => {

    }
}