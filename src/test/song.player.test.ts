/**
 * @jest-environment jsdom
 */

import { describe, expect, test, beforeEach, jest } from '@jest/globals';

// Mock modules
const mockTransport = {
    calls: {
        start: 0,
        stop: 0,
        cancel: 0
    },
    start() { this.calls.start++; },
    stop() { this.calls.stop++; },
    cancel() { this.calls.cancel++; },
    bpm: { value: 100 }
};

jest.mock('tone', () => {
    class Loop {
        interval: any;
        iterations: any;
        constructor(callback: Function) {}
        start() {}
    }
    return {
        getTransport: () => mockTransport,
        Sampler: class {},
        Loop
    };
});

jest.mock('../main/piano');

import { SongPlayer } from '../main/song.player';
import { Song } from '../main/song';
import { Part } from '../main/part';
import { Block } from '../main/block';
import { Command, CommandType } from '../main/command';
import { Player } from '../main/player';
import { PlayMode } from '../main/play.mode';

describe('SongPlayer', () => {
    let songPlayer: SongPlayer;
    let song: Song;
    let part: Part;
    let block: Block;
    let player: Player;

    beforeEach(() => {
        // Reset mock state
        mockTransport.calls.start = 0;
        mockTransport.calls.stop = 0;
        mockTransport.calls.cancel = 0;
        mockTransport.bpm.value = 100;

        songPlayer = new SongPlayer();
        song = new Song();
        part = new Part();
        block = new Block();
        player = new Player(0);
        part.block = block;
    });

    test('should initialize with default values', () => {
        expect(songPlayer.currentBlockPulse).toBe(0);
        expect(songPlayer.keyboardManagedPart).toBeUndefined();
    });

    test('should execute command to change player properties', () => {
        const command = new Command({ commandType: CommandType.GAP, commandValue: '2' });
        songPlayer.executeCommand(block, command, player);
        expect(player.gap).toBe(2);
    });

    test('should execute multiple commands', () => {
        block.commands = [
            new Command({ commandType: CommandType.GAP, commandValue: '2' }),
            new Command({ commandType: CommandType.OCTAVE, commandValue: '4' }),
            new Command({ commandType: CommandType.PLAYMODE, commandValue: 'ASCENDING' })
        ];
        
        songPlayer.executeCommands(block, player);
        
        expect(player.gap).toBe(2);
        expect(player.octave).toBe(4);
        expect(player.playMode).toBe(PlayMode.ASCENDING);
    });

    test('should play song with multiple parts', () => {
        const part1 = new Part();
        const part2 = new Part();
        song.addPart(part1);
        song.addPart(part2);

        songPlayer.playSong(song);
        
        expect(mockTransport.calls.start).toBeGreaterThan(0);
    });

    test('should stop playing', () => {
        songPlayer.stop();
        
        expect(mockTransport.calls.stop).toBeGreaterThan(0);
        expect(mockTransport.calls.cancel).toBe(1);
        expect(mockTransport.bpm.value).toBe(100);
    });
}); 