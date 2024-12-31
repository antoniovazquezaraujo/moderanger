// El mock debe ir antes de cualquier import
jest.mock('tone', () => ({
    start: jest.fn(),
    Transport: {
        start: jest.fn(),
        stop: jest.fn(),
        position: 0,
        bpm: { value: 120 },
        schedule: jest.fn(),
        scheduleRepeat: jest.fn(),
        cancel: jest.fn()
    },
    Synth: jest.fn(() => ({
        toDestination: () => ({ triggerAttackRelease: jest.fn() })
    })),
    PolySynth: jest.fn(() => ({
        toDestination: () => ({ triggerAttackRelease: jest.fn() })
    })),
    Sampler: jest.fn().mockImplementation(() => ({
        toDestination: () => ({ triggerAttackRelease: jest.fn() }),
        triggerAttack: jest.fn(),
        triggerRelease: jest.fn()
    })),
    now: jest.fn(() => 0)
}));

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Song } from '../song';
import { Part } from '../part';
import { Block } from '../block';
import { Command, CommandType } from '../command';
import { SongSerializer } from '../song.serializer';

describe('SongSerializer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should serialize and deserialize a song correctly', () => {
        // Crear una canción de prueba
        const song = new Song();
        
        // Primer Part
        const part1 = new Part();
        const block1 = new Block();
        block1.repeatingTimes = 2;
        block1.blockContent = { notes: 'C D E' };
        block1.commands = [
            new Command({ commandType: CommandType.PLAYMODE, commandValue: 'CHORD' }),
            new Command({ commandType: CommandType.WIDTH, commandValue: '3' })
        ];

        // Bloque hijo del primer part
        const childBlock = new Block();
        childBlock.repeatingTimes = 1;
        childBlock.blockContent = { notes: 'F G A' };
        block1.children.push(childBlock);
        
        part1.block = block1;
        song.parts.push(part1);

        // Segundo Part
        const part2 = new Part();
        const block2 = new Block();
        block2.repeatingTimes = 3;
        block2.blockContent = { notes: 'B C D 4m:(2 s 4)' };
        part2.block = block2;
        song.parts.push(part2);

        // Convertir a texto
        const text = SongSerializer.toString(song);

        // Verificar el formato del texto
        const expectedText = 
`PART
  BLOCK repeats=2
    notes: C D E
    commands:
      PLAYMODE CHORD
      WIDTH 3
    BLOCK repeats=1
      notes: F G A
PART
  BLOCK repeats=3
    notes: B C D 4m:(2 s 4)
`;
        expect(text).toBe(expectedText);

        // Convertir de vuelta a Song
        const deserializedSong = SongSerializer.fromString(text);

        // Verificar la estructura
        expect(deserializedSong.parts.length).toBe(2);
        
        // Verificar primer part
        const deserializedPart1 = deserializedSong.parts[0];
        expect(deserializedPart1.block.repeatingTimes).toBe(2);
        expect(deserializedPart1.block.blockContent?.notes).toBe('C D E');
        expect(deserializedPart1.block.commands?.length).toBe(2);
        expect(deserializedPart1.block.commands?.[0].commandType).toBe(CommandType.PLAYMODE);
        expect(deserializedPart1.block.commands?.[0].commandValue).toBe('CHORD');
        expect(deserializedPart1.block.children.length).toBe(1);
        expect(deserializedPart1.block.children[0].blockContent?.notes).toBe('F G A');

        // Verificar segundo part
        const deserializedPart2 = deserializedSong.parts[1];
        expect(deserializedPart2.block.repeatingTimes).toBe(3);
        expect(deserializedPart2.block.blockContent?.notes).toBe('B C D 4m:(2 s 4)');
    });
}); 