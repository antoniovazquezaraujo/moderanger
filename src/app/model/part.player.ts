import { Block } from "./block";
import { Instrument } from "./instrument";
import { Part } from "./part";
import { Stack } from "./stack";
import { SongPlayer } from "./song.player";

export class PartPlayer {
    songPlayer!:SongPlayer;
    blockIndex: number = 0;
    blockStack: Stack = new Stack();
    instrument!: Instrument;

    //blocks:Block[] = [];
    async playPart(songPlayer:SongPlayer, part: Part, instrument: Instrument) {
        this.songPlayer = songPlayer;
        this.instrument = instrument;
        this.parseRepetitions(part.blocks, instrument)
        await this.playBlocks(part.blocks, instrument);
    }
    parseRepetitions(blocks:Block[], instrument:Instrument){
        let id:number = 0;
      //  this.blocks = [];
        for(let block of blocks){
            this.songPlayer.parseRepetitions(block);
            block.id = id++;
            //this.blocks.push(block);
        }
    }
    async playBlockNotes(block: Block) {
        await this.songPlayer.playBlockNotes(block, this.instrument);
    }

    async playBlocks(blocks: Block[], instrument: Instrument) {
        this.blockIndex = 0;
        let block: Block;
        this.blockStack.reset();
        block = blocks[this.blockIndex];

        while (this.blockIndex < blocks.length) {
            this.songPlayer.parseBlock(block, instrument);
            if (this.isRepeating(block)) {
                if (this.isInTheStack(block)) {
                    this.decStackedTimes();
                    // if (this.stackedTimesIsEmpty()) {
                    //     this.pop();
                    //     this.goToNextBlock();
                    // } else {
                        this.resetStackedSize(block);
                        this.decStackedSize();
                        await this.playBlockNotes(block)
                        if (this.stackedSizeIsEmpty()) {
                            this.goToStackedBlock();
                        } else {
                            this.goToNextBlock(); 
                        }
                    // }
                } else {
                    this.push(block);
                }
            } else {
                await this.playBlockNotes(block);
                if (this.stackIsEmpty()) {
                    this.goToNextBlock();
                } else {
                    this.decStackedSize();
                    if (this.stackedSizeIsEmpty()) {
                        if (this.stackedTimesIsEmpty()) {
                            this.pop();
                            this.goToNextBlock();
                        }else{
                            this.goToStackedBlock();
                        }
                    } else {
                        this.goToNextBlock();
                    }
                }
            }
            if (this.blockIndex < blocks.length) {
                block = blocks[this.blockIndex];
            }
        }
    }

    isRepeating(block: Block): boolean {
        return block.repeatingTimes != 0;
    }
    stackIsEmpty(): boolean {
        return this.blockStack.empty();
    }
    isInTheStack(block: Block): boolean {
        if (this.stackIsEmpty()) {
            return false;
        }
        return this.blockStack.get().id === block.id;
    }
    isInTheRepeatingGroup(block: Block): boolean {
        if (this.stackIsEmpty()) {
            return false;
        }
        let top: Block = this.blockStack.get();
        let endOfGroup = top.id + top.repeatingSize;
        return block.id <= endOfGroup;
    }
    stackedSizeIsEmpty(): boolean {
        return this.blockStack.get().remainingRepeatingSize === 0;
    }
    stackedTimesIsEmpty(): boolean {
        if (this.stackIsEmpty()) {
            return false;
        }
        return this.blockStack.get().remainingRepeatingTimes < 0;
    }
    goToNextBlock() {
        this.blockIndex++;
    }
    goToStackedBlock() {
        this.blockIndex = this.blockStack.get().id;
    }
    push(block: Block) {
        this.blockStack.push(block);
    }
    pop(): Block {
        return this.blockStack.pop();
    }
    decStackedSize() {
        this.blockStack.get().remainingRepeatingSize--;
    }
    decStackedTimes() {
        this.blockStack.get().remainingRepeatingTimes--;
    }
    resetStackedTimes(block: Block) {
        this.blockStack.get().remainingRepeatingTimes = block.repeatingTimes;
    }
    resetStackedSize(block: Block) {
        this.blockStack.get().remainingRepeatingSize = this.blockStack.get().repeatingSize;
    }

}


