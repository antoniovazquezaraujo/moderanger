import { describe, expect, it } from '@jest/globals';
import { Command, CommandType } from '../command';

describe('Command', () => {
    it('should create with default values', () => {
        const command = new Command();
        expect(command.type).toBe(CommandType.OCT);
        expect(command.value).toBe(0);
    });

    it('should create with partial data', () => {
        const command = new Command({
            type: CommandType.OCT,
            value: 5
        });
        
        expect(command.type).toBe(CommandType.OCT);
        expect(command.value).toBe(5);
    });

    it('should handle variable values', () => {
        const command = new Command();
        command.setVariable('x');
        expect(command.isVariable).toBe(true);
        expect(command.value).toBe('$x');
    });

    it('should handle undefined values in constructor', () => {
        const command = new Command({});
        expect(command.type).toBe(CommandType.OCT);
        expect(command.value).toBe(0);
    });
}); 