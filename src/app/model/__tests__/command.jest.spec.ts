import { describe, expect, it } from '@jest/globals';
import { Command, CommandType } from '../command';

describe('Command', () => {
    it('should create with default values', () => {
        const command = new Command();
        expect(command.commandType).toBe(CommandType.PLAYMODE);
        expect(command.commandValue).toBe("");
    });

    it('should create with partial data', () => {
        const command = new Command({
            commandType: CommandType.OCTAVE,
            commandValue: "5"
        });
        
        expect(command.commandType).toBe(CommandType.OCTAVE);
        expect(command.commandValue).toBe("5");
    });

    it('should convert to string correctly', () => {
        const command = new Command({
            commandType: CommandType.SCALE,
            commandValue: "MAJOR"
        });
        
        expect(command.toString()).toBe("Command (SCALE MAJOR)");
    });

    it('should handle undefined values in constructor', () => {
        const command = new Command({});
        expect(command.commandType).toBe(CommandType.PLAYMODE);
        expect(command.commandValue).toBe("");
    });
}); 