export enum CommandType {
    PLAYMODE = "PLAYMODE",
    WIDTH = "WIDTH",
    OCTAVE = "OCTAVE",
    SCALE = "SCALE",
    INVERSION = "INVERSION",
    KEY = "KEY",
    GAP = "GAP",
    SHIFTSTART = "SHIFTSTART",
    SHIFTSIZE = "SHIFTSIZE",
    SHIFTVALUE = "SHIFTVALUE",
    PATTERN_GAP = "PATTERN_GAP",
    PATTERN = "PATTERN"
}

// ... existing code ...
export class Command {

    public commandType:CommandType =CommandType.PLAYMODE;
    public commandValue:string="";
    
    constructor(opts?: Partial<Command>) {
        if (opts?.commandType != null) {
            this.commandType = opts.commandType;
        }
        if (opts?.commandValue != null) {
            this.commandValue = opts.commandValue;
        }
    }
 
    public toString = () : string => {
        return `Command (${this.commandType} ${this.commandValue})`;
    }
 
}
