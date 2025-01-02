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
        const value = context ? this.getValue(context) : this.value;
        switch (this.type) {
            case CommandType.GAP: player.gap = Number(value); break;
            case CommandType.OCT: player.octave = Number(value); break;
            case CommandType.SCALE: player.selectScale(value); break;
            case CommandType.PLAYMODE: player.playMode = value; break;
            case CommandType.WIDTH: player.density = Number(value); break;
            case CommandType.INVERSION: player.inversion = Number(value); break;
            case CommandType.KEY: player.tonality = Number(value); break;
            case CommandType.SHIFTSTART: player.shiftStart = Number(value); break;
            case CommandType.SHIFTSIZE: player.shiftSize = Number(value); break;
            case CommandType.SHIFTVALUE: player.shiftValue = Number(value); break;
            case CommandType.PATTERN_GAP: player.decorationGap = Number(value); break;
            case CommandType.PATTERN: player.decorationPattern = String(value); break;
        }
    }
}
