import { VariableContext, ScaleType } from './variable.context';
import { getPlayModeFromString, PlayMode } from './play.mode';
import { ScaleTypes } from './scale';

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
        if (opts) {
            this.type = opts.type || CommandType.OCT;
            this.isVariable = opts.isVariable || false;
            if (opts.value !== undefined) {
                if (this.isVariable && typeof opts.value === 'string') {
                    this.setVariable(opts.value);
                } else {
                    this.setValue(opts.value);
                }
            }
        }
    }

    // get value(): string | number {
    //     if (this.isVariable && typeof this._value === 'string') {
    //         return this._value.startsWith('$') ? this._value : '$' + this._value;
    //     }
    //     if (this.type === CommandType.PLAYMODE && typeof this._value === 'number') {
    //         return PlayMode[this._value];
    //     }
    //     return this._value;
    // }

    // set value(val: string | number) {
    //     this.setValue(val);
    // }

    get value(): number | string | ScaleType | PlayMode {
        if (this.isVariable && typeof this._value === 'string') {
            const varName = this._value.startsWith('$') ? this._value.substring(1) : this._value;
            const varValue = VariableContext.getValue(varName);
            console.log(`[Command] Getting variable ${varName}, value from context:`, varValue);
            if (varValue !== undefined) {
                return varValue;
            }
            console.log(`[Command] Variable ${varName} not found, returning default.`);
            return this.type === CommandType.SCALE ? 'WHITE' as ScaleType :
                   this.type === CommandType.PLAYMODE ? PlayMode.CHORD : 0;
        }
        return this._value;
    }

    setVariable(name: string | null): void {
        if (!name) {
            this.setValue(null);
            return;
        }
        this.isVariable = true;
        this._value = name.startsWith('$') ? name : '$' + name;
    }


    setValue(value: string | number | ScaleType | PlayMode | null): void {
        this.value = value;
    }
    
    set value(value: string | number | ScaleType | PlayMode | null) {
        if (value === null || value === undefined) {
            this._value = this.type === CommandType.SCALE ? 'WHITE' as ScaleType :
                         this.type === CommandType.PLAYMODE ? PlayMode.CHORD :
                         this.type === CommandType.PATTERN ? '' : 0;
            this.isVariable = false;
            return;
        }

        if (typeof value === 'string' && (value.startsWith('$') || this.isVariable)) {
            this._value = value.startsWith('$') ? value : '$' + value;
            this.isVariable = true;
        } else {
            if (this.type === CommandType.SCALE && typeof value === 'string') {
                this._value = String(value).toUpperCase() as ScaleType;
            } else if (this.type === CommandType.PLAYMODE) {
                if (typeof value === 'string') {
                    this._value = getPlayModeFromString(value.toUpperCase());
                } else {
                    this._value = value;
                }
            } else if (this.type === CommandType.PATTERN && typeof value === 'string') {
                this._value = String(value);
            } else {
                this._value = typeof value === 'number' ? Number(value) : value;
            }
            this.isVariable = false;
        }
    }

    execute(player: any): void {
        const rawValue = this.value;
        let value: any;

        if (this.type === CommandType.PATTERN) {
            value = String(rawValue);
        } else if (this.type === CommandType.SCALE) {
            const scaleName = String(rawValue).toUpperCase();
            value = ScaleTypes[scaleName as keyof typeof ScaleTypes];
        } else if (this.type === CommandType.PLAYMODE) {
            value = typeof rawValue === 'string' ? getPlayModeFromString(rawValue.toUpperCase()) : rawValue;
        } else {
            value = Number(rawValue) || 0;
        }

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
    
    /**
     * Devuelve el nombre de la variable si este comando utiliza una variable
     * @returns El nombre de la variable sin el prefijo '$', o null si no usa una variable
     */
    getVariableName(): string | null {
        if (this.isVariable && typeof this._value === 'string') {
            return this._value.startsWith('$') ? this._value.substring(1) : this._value;
        }
        return null;
    }
}




