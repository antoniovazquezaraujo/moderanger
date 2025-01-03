import { VariableContext } from './variable.context';
import { getPlayModeFromString } from './play.mode';

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
    private _value: string | number = 0;
    isVariable: boolean = false;

    constructor(opts?: Partial<Command>) {
        if (opts?.type) this.type = opts.type;
        if (opts?.value !== undefined) this.setValue(opts.value);
    }

    get value(): string | number {
        if (this.isVariable && typeof this._value === 'string') {
            return this._value.startsWith('$') ? this._value.substring(1) : this._value;
        }
        return this._value;
    }

    set value(val: string | number) {
        this.setValue(val);
    }

    getValue(context: VariableContext): number | string {
        if (this.isVariable && typeof this._value === 'string') {
            const varName = this._value.startsWith('$') ? this._value.substring(1) : this._value;
            const varValue = context.getValue(varName);
            return varValue !== undefined ? varValue : 0;
        }
        return this._value;
    }

    setVariable(name: string | null): void {
        if (name === null || name === undefined || name === '') {
            this.isVariable = false;
            this._value = 0;
            return;
        }

        this._value = name.startsWith('$') ? name : '$' + name;
        this.isVariable = true;
    }

    setValue(value: number | string | null): void {
        if (value === null || value === undefined) {
            this._value = 0;
            this.isVariable = false;
            return;
        }

        if (typeof value === 'string' && value.startsWith('$')) {
            this._value = value;
            this.isVariable = true;
        } else {
            this._value = value;
            this.isVariable = false;
        }
    }

    execute(player: any, context?: VariableContext): void {
        const rawValue = context ? this.getValue(context) : this._value;
        const value = this.type === CommandType.PATTERN ? String(rawValue) :
                     this.type === CommandType.SCALE ? rawValue :
                     Number(rawValue) || 0;

        switch (this.type) {
            case CommandType.GAP: player.gap = value; break;
            case CommandType.OCT: player.octave = value; break;
            case CommandType.SCALE: player.selectScale(value); break;
            case CommandType.PLAYMODE: player.playMode = getPlayModeFromString(String(rawValue)); break;
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
