export class CommandNotes {
    notes: string = '';
    isVariable: boolean = false;
    variableName: string = '';

    constructor(opts?: Partial<CommandNotes>) {
        if (opts?.notes) this.notes = opts.notes;
        if (opts?.isVariable) this.isVariable = opts.isVariable;
        if (opts?.variableName) this.variableName = opts.variableName;
    }
}