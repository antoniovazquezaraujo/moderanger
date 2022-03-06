
export enum CommandType{
    VELOCITY    = 20,
    PULSE       = 1,
    PLAYMODE    = 2,
    WIDTH       = 3,
    OCTAVE      = 4,
    SCALE       = 5,
    INVERSION   = 6,
    KEY         = 7,
    GEAR        = 8,
    CHANNEL     = 9,
    GAP         = 10,
    SHIFTSTART  = 11,
    SHIFTSIZE   = 12,
    SHIFTVALUE  = 13,
    REPEAT_TIMES= 14,
    REPEAT_SIZE = 15
}
export class Command {

    public commandType!:CommandType;
    public commandValue!:string;
    
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
