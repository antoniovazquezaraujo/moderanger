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

describe('Song', () => {
    it('should create with default values', () => {
        const song = new Song();
        expect(song.parts).toEqual([]);
    });

    it('should create from existing song', () => {
        const originalSong = new Song();
        originalSong.parts = [new Part()];
        
        const newSong = new Song(originalSong);
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
}); 