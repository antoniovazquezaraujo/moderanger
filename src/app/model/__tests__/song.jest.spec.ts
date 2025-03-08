import { describe, expect, it, jest } from '@jest/globals';

// Mock the Piano class
jest.mock('../piano', () => {
    return {
        Piano: class PianoMock {
            name = 'Piano Mock';
            play() {}
            stop() {}
            dispose() {}
        }
    };
});

import { Song } from '../song';
import { Part } from '../part';
import { Block } from '../block';
import { Command } from '../command';
import { BlockContent } from '../block.content';
import { IncrementOperation } from '../operation';

describe('Song', () => {
    it('should create with default values', () => {
        const song = new Song();
        expect(song.parts).toEqual([]);
    });

    it('should create from existing song', () => {
        const originalSong = new Song();
        originalSong.parts = [new Part()];
        
        const newSong = originalSong.clone();
        expect(newSong.parts).toHaveLength(1);
    });

    describe('static properties', () => {
        it('should have Piano as default instrument', () => {
            expect(Song.instruments).toHaveLength(1);
            expect(Song.instruments[0]).toHaveProperty('name', 'Piano Mock');
        });

        it('should return Piano as default instrument', () => {
            const defaultInstrument = Song.getDefultInstrument();
            expect(defaultInstrument).toHaveProperty('name', 'Piano Mock');
            expect(defaultInstrument).toBe(Song.instruments[0]);
        });
    });
    describe('SongExperiment', () => {
        it('should create with default values', () => {

            const song:Song = new Song();
            const part:Part = new Part();
            const block:Block = new Block();
            const block2:Block = block.clone();
            const command = new  Command();
            const blockContent: BlockContent = new BlockContent();           
            const operation: IncrementOperation = new IncrementOperation("variable1", 1);

            song.parts = [part];
            part.blocks = [block, block2];
            block.children = [];
            block.blockContent = blockContent;
            block.commands = [command];          
            blockContent.notes = "1 2 3 4";
            block.operations = [operation];

            const part2 = part.clone();
            console.log(part);
            console.log(part2);



        });
    });
}); 