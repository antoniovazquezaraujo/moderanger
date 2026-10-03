import { VariableContext, ScaleType } from './variable.context';
import { getPlayModeFromString, PlayMode } from './play.mode';
import { ScaleTypes } from './scale';
import { NoteData } from './note';
import { parseBlockNotes } from './ohm.parser';

export enum CommandType {
    OCT = 'OCT',
    SCALE = 'SCALE',
    GAP = 'GAP',
    PLAYMODE = 'PLAYMODE',
    INV = 'INV',
    WIDTH = 'WIDTH',
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

    get value(): number | string | ScaleType | PlayMode {
        if (this.isVariable && typeof this._value === 'string') {
            const varName = this._value.startsWith('$') ? this._value.substring(1) : this._value;
            const varValue = VariableContext.getValue(varName);
            if (varValue !== undefined) {
                if (this.type === CommandType.SCALE && typeof varValue === 'string') return varValue.toUpperCase() as ScaleType;
                if (this.type === CommandType.PLAYMODE) {
                    if (typeof varValue === 'string') return getPlayModeFromString(varValue.toUpperCase());
                    if (typeof varValue === 'number' && PlayMode[varValue]) return varValue;
                }
                if (this.type === CommandType.PATTERN && typeof varValue === 'string') return varValue;
                if (typeof varValue === 'number') return varValue;
                return varValue;
            }
            return this.type === CommandType.SCALE ? 'WHITE' as ScaleType :
                   this.type === CommandType.PLAYMODE ? PlayMode.CHORD :
                   this.type === CommandType.PATTERN ? '' : 0;
        }
        if (this.type === CommandType.PLAYMODE && typeof this._value === 'number' && PlayMode[this._value]) {
            return this._value;
        }
        if (this.type === CommandType.PATTERN && typeof this._value === 'string') {
            return this._value;
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
            this._value = this.type === CommandType.SCALE ? 'WHITE' :
                         this.type === CommandType.PLAYMODE ? PlayMode.CHORD :
                         this.type === CommandType.PATTERN ? '' : 0;
            this.isVariable = false;
            return;
        }

        if (typeof value === 'string' && value.startsWith('$')) {
            this.isVariable = true;
            this._value = value;
        } else {
            this.isVariable = false;
            if (this.type === CommandType.SCALE && typeof value === 'string') {
                this._value = String(value).toUpperCase();
            } else if (this.type === CommandType.PLAYMODE) {
                if (typeof value === 'string') {
                    this._value = getPlayModeFromString(value.toUpperCase());
                } else if (typeof value === 'number' && PlayMode[value]) {
                    this._value = value;
                } else {
                    this._value = PlayMode.CHORD;
                }
            } else if (this.type === CommandType.PATTERN && typeof value === 'string') {
                this._value = value;
            } else if (typeof value === 'number') {
                this._value = Number(value);
            } else {
                console.warn(`[Command] Setting value with unexpected type (${typeof value}) for CommandType ${this.type}. Storing raw value.`);
                this._value = value as string | number;
            }
        }
    }

    execute(player: any): void {
        const rawValue = this.value;
        let value: any = rawValue;

        if (this.type === CommandType.PATTERN) {
            const patternString = String(value);
            try {
                player.currentPattern = parseBlockNotes(patternString);
                console.log(`[Command PATTERN] Parsed and set pattern for player:`, player.currentPattern);
            } catch (e) {
                console.error(`[Command PATTERN] Failed to parse pattern string "${patternString}":`, e);
                player.currentPattern = null;
            }
            return;
        }
        
        if (this.type === CommandType.SCALE) {
             const scaleName = String(value).toUpperCase();
             const scaleEnumVal = ScaleTypes[scaleName as keyof typeof ScaleTypes];
             if (scaleEnumVal === undefined) {
                 console.warn(`[Command] Invalid scale name resolved: ${scaleName}. Using default WHITE.`);
                 value = ScaleTypes.WHITE;
             } else {
                 value = scaleEnumVal;
             }
        } 
        else if (this.type === CommandType.PLAYMODE) {
             if (typeof value !== 'number' || PlayMode[value] === undefined) {
                  console.warn(`[Command] Invalid PlayMode value resolved: ${value}. Using default CHORD.`);
                  value = PlayMode.CHORD;
             }
        } 
        else {
             value = Number(value) || 0;
        }

        switch (this.type) {
            case CommandType.GAP: player.gap = value; break;
            case CommandType.OCT: player.octave = value; break;
            case CommandType.SCALE: player.scale = value; break;
            case CommandType.PLAYMODE: 
                if (typeof value === 'number' && PlayMode[value] !== undefined) {
                    player.playMode = value; 
                    if (value !== PlayMode.PATTERN) {
                         player.currentPattern = null;
                    } else {
                        console.log(`[Command PLAYMODE] Switched to PATTERN. Player pattern is:`, player.currentPattern);
                    }
                } else {
                     console.warn(`[Command PLAYMODE] Invalid final value for PLAYMODE: ${value}. Defaulting player to CHORD.`);
                     player.playMode = PlayMode.CHORD;
                     player.currentPattern = null;
                }
                break; 
            case CommandType.WIDTH: player.density = value; break;
            case CommandType.INV: player.inversion = value; break;
            case CommandType.KEY: player.tonality = value; break;
            case CommandType.SHIFTSTART: player.shiftStart = value; break;
            case CommandType.SHIFTSIZE: player.shiftSize = value; break;
            case CommandType.SHIFTVALUE: player.shiftValue = value; break;
            case CommandType.PATTERN_GAP: player.decorationGap = value; break;
        }
    }
    
    getVariableName(): string | null {
        if (this.isVariable && typeof this._value === 'string') {
            return this._value.startsWith('$') ? this._value.substring(1) : this._value;
        }
        return null;
    }
}




