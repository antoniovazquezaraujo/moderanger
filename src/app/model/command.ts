
export enum CommandType{
    PLAYMODE    = 0,
    WIDTH       = 1,
    OCTAVE      = 2,
    SCALE       = 3,
    INVERSION   = 4,
    KEY         = 5,
    GAP         = 6,
    SHIFTSTART  = 7,
    SHIFTSIZE   = 8,
    SHIFTVALUE  = 9,
    PATTERN_GAP = 10,
    PATTERN = 11
}
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
