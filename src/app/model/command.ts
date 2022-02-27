
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
    REPEAT      = 14
}
export class Command {

    public commandType:CommandType;
    public commandValue:string;
    constructor(
         commandType:CommandType,
         commandValue:string
    ){
        this.commandType=commandType;
        this.commandValue=commandValue;
    }
    public toString = () : string => {
        return `Command (${this.commandType} ${this.commandValue})`;
    }
}
