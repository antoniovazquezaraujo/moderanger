import {describe, expect, test, beforeEach} from '@jest/globals';
import { Song } from './song';
import { Part } from './part';
import { Piano } from './piano';
import { MusicalInstrument } from './instrument';

describe('Song', () => {
    let song: Song;
    let part: Part;

    beforeEach(() => {
        song = new Song();
        part = new Part();
    });

    test('should initialize with empty parts array', () => {
        expect(song.parts).toEqual([]);
    });

    test('should add a part', () => {
        song.addPart(part);
        expect(song.parts).toContain(part);
    });

    test('should remove a part', () => {
        song.addPart(part);
        song.removePart(part);
        expect(song.parts).not.toContain(part);
    });

    test('should initialize with default instrument', () => {
        expect(Song.instruments[0]).toBeInstanceOf(Piano);
    });

    test('should return default instrument', () => {
        const defaultInstrument = Song.getDefaultInstrument();
        expect(defaultInstrument).toBeInstanceOf(Piano);
    });

    test('should copy properties from another song', () => {
        const anotherSong = new Song();
        anotherSong.addPart(part);
        const copiedSong = new Song(anotherSong);
        expect(copiedSong.parts).toEqual(anotherSong.parts);
    });
});