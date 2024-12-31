import { Player } from "./player";
import { getPlayModeFromString } from "./play.mode";
import { ScaleTypes } from "./scale";

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
 
export class Command {
    public commandType: CommandType = CommandType.PLAYMODE;
    public commandValue: string = "";
    
    constructor(opts?: Partial<Command>) {
        if (opts?.commandType != null) {
            this.commandType = opts.commandType;
        }
        if (opts?.commandValue != null) {
            this.commandValue = opts.commandValue;
        }
    }

    public execute(player: Player): void {
        switch (this.commandType) {
            case CommandType.GAP:
                player.gap = parseInt(this.commandValue, 10);
                break;
            case CommandType.SHIFTSTART:
                player.shiftStart = parseInt(this.commandValue, 10);
                break;
            case CommandType.SHIFTSIZE:
                player.shiftSize = parseInt(this.commandValue, 10);
                break;
            case CommandType.SHIFTVALUE:
                player.shiftValue = parseInt(this.commandValue, 10);
                break;
            case CommandType.PATTERN_GAP:
                player.decorationGap = parseInt(this.commandValue, 10);
                break;
            case CommandType.PATTERN:
                player.decorationPattern = this.commandValue;
                break;
            case CommandType.PLAYMODE:
                player.playMode = getPlayModeFromString(this.commandValue);
                break;
            case CommandType.WIDTH:
                player.density = parseInt(this.commandValue, 10);
                break;
            case CommandType.OCTAVE:
                player.octave = parseInt(this.commandValue, 10);
                break;
            case CommandType.SCALE:
                player.selectScale(this.commandValue as unknown as ScaleTypes);
                break;
            case CommandType.INVERSION:
                player.inversion = parseInt(this.commandValue, 10);
                break;
            case CommandType.KEY:
                player.tonality = parseInt(this.commandValue, 10);
                break;
            default:
                console.log("Error in command type");
        }
    }

    public toString = () : string => {
        return `Command (${this.commandType} ${this.commandValue})`;
    }
}
