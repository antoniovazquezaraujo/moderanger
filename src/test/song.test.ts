/**
 * @jest-environment jsdom
 */

jest.mock('tone');
jest.mock('../main/piano');

import {describe, expect, test, beforeEach, afterEach, jest} from '@jest/globals';
import { Song } from '../main/song';
import { Part } from '../main/part';
import { Player } from '../main/player';

describe('Song', () => {
    let song: Song;
    let part: Part;
    let player: Player;

    beforeEach(() => {
        player = new Player(0);
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

    test('should have default instrument', () => {
        expect(Song.instruments.length).toBeGreaterThan(0);
        expect(Song.getDefaultInstrument()).toBeDefined();
    });

    test('should copy properties from another song', () => {
        const anotherSong = new Song();
        anotherSong.addPart(part);
        const copiedSong = new Song(anotherSong);
        expect(copiedSong.parts).toEqual(anotherSong.parts);
    });
});