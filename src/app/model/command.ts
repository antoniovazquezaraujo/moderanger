import { VariableContext } from './variable.context';

export enum CommandType {
    SCALE = 'SCALE',
    OCT = 'OCT',
    GAP = 'GAP',
    PLAYMODE = 'PLAYMODE',
    WIDTH = 'WIDTH',
    INVERSION = 'INVERSION',
    KEY = 'KEY',
    SHIFTSTART = 'SHIFTSTART',
    SHIFTSIZE = 'SHIFTSIZE',
    SHIFTVALUE = 'SHIFTVALUE',
    PATTERN_GAP = 'PATTERN_GAP',
    PATTERN = 'PATTERN'
}

export class Command {
    type: CommandType = CommandType.OCT;
    value: string | number = 0;
    isVariable: boolean = false;

    constructor(opts?: Partial<Command>) {
        if (opts?.type) this.type = opts.type;
        if (opts?.value !== undefined) this.setValue(opts.value);
    }

    getValue(context: VariableContext): number | string {
        if (this.isVariable && typeof this.value === 'string') {
            const varValue = context.getValue(this.value.substring(1)); // Remove $ prefix
            return varValue !== undefined ? varValue : 0;
        }
        return this.value;
    }

    setVariable(name: string) {
        this.value = '$' + name;
        this.isVariable = true;
    }

    setValue(value: number | string) {
        this.value = value;
        this.isVariable = typeof value === 'string' && value.startsWith('$');
    }

    execute(player: any, context?: VariableContext): void {
        const rawValue = context ? this.getValue(context) : this.value;
        const value = this.type === CommandType.PATTERN ? String(rawValue) :
                     this.type === CommandType.SCALE || this.type === CommandType.PLAYMODE ? rawValue :
                     Number(rawValue) || 0;  // Convert to number or default to 0 if NaN

        switch (this.type) {
            case CommandType.GAP: player.gap = value; break;
            case CommandType.OCT: player.octave = value; break;
            case CommandType.SCALE: player.selectScale(value); break;
            case CommandType.PLAYMODE: player.playMode = value; break;
            case CommandType.WIDTH: player.density = value; break;
            case CommandType.INVERSION: player.inversion = value; break;
            case CommandType.KEY: player.tonality = value; break;
            case CommandType.SHIFTSTART: player.shiftStart = value; break;
            case CommandType.SHIFTSIZE: player.shiftSize = value; break;
            case CommandType.SHIFTVALUE: player.shiftValue = value; break;
            case CommandType.PATTERN_GAP: player.decorationGap = value; break;
            case CommandType.PATTERN: player.decorationPattern = value; break;
        }
    }
}
