import { describe, expect, it, beforeEach } from '@jest/globals';
import { Part } from '../part';
import { Block } from '../block';

describe('Part', () => {
    beforeEach(() => {
        // Reset the static id counter before each test
        Part._id = 0;
    });

    it('should create with default values and increment id', () => {
        const part1 = new Part();
        const part2 = new Part();
        
        expect(part1.id).toBe(0);
        expect(part2.id).toBe(1);
        expect(part1.blocks).toBeDefined();
    });

    // it('should create with provided block', () => {
    //     const block = new Block({ id: 5 });
    //     const part = new Part({ block });
        
    //     expect(part.block.id).toBe(5);
    // });

    // it('should remove block from children', () => {
    //     const parentBlock = new Block({});
    //     const childBlock = new Block({});
    //     parentBlock.children = [childBlock];
        
    //     const part = new Part({ block: parentBlock });
    //     part.removeBlock(childBlock);
        
    //     expect(part.block.children).toHaveLength(0);
    // });

    it('should handle removing non-existent block', () => {
        const part = new Part();
        const blockToRemove = new Block();
        
        // Should not throw error
        part.removeBlock(blockToRemove);
        expect(part.blocks).toHaveLength(1);
    });
}); 