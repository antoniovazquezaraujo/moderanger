export class CommandNotes {
    public notes:string='';
 
    constructor(data: Pick<CommandNotes, "notes" >) {
        this.notes = data.notes;
    }
}