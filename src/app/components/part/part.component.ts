import { NestedTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command } from 'src/app/model/command';
import { Part } from 'src/app/model/part';
import { VariableContext } from 'src/app/model/variable.context';
import { SongPlayer } from 'src/app/model/song.player';
import { InstrumentType } from 'src/app/model/instruments';
import { Song } from 'src/app/model/song';
import { Player } from 'src/app/model/player';

@Component({
    selector: 'app-part',
    templateUrl: './part.component.html',
    styleUrls: ['./part.component.scss']
})
export class PartComponent implements OnInit {
    treeControl = new NestedTreeControl<Block>(node => node.children);

    @Input() part!: Part;
    @Input() variableContext?: VariableContext;
    @Output() onDuplicatePart: EventEmitter<Part>;
    @Output() onRemovePart: EventEmitter<Part>;

    currentBlock: Block = new Block();

    constructor(private songPlayer: SongPlayer) {
        this.onDuplicatePart = new EventEmitter<Part>();
        this.onRemovePart = new EventEmitter<Part>();
    }

    hasChildren(index: number, block: Block): boolean {
        return (block.children && block?.children.length > 0) as boolean;
    }

    ensureUniqueBlocks() {
        const uniqueBlocks = Array.from(new Set(this.part.blocks.map(block => block.id)))
            .map(id => this.part.blocks.find(block => block.id === id));
        this.part.blocks = uniqueBlocks.filter(block => block !== undefined) as Block[];
        console.log('Ensured unique blocks:', this.part.blocks);
    }

    onDuplicateBlock(block: Block) {
        let copy = new Block(block);
        const index = this.part.blocks.indexOf(block);
        if (index !== -1) {
            this.part.blocks[index].children.push(copy);
            this.ensureUniqueBlocks();
            console.log('Block duplicated:', copy);
            console.log('Current blocks:', this.part.blocks);
        }
    }

    onRemoveBlock(block: Block) {
        this.part.removeBlock(block);
    }

    onAddNewCommand(block: Block) {
        const index = this.part.blocks.indexOf(block);
        if (index !== -1) {
            this.part.blocks[index].commands.push(new Command());
        }
    }

    onAddChild(block: Block) {
        const newBlock = new Block({});
        block.children.push(newBlock);
        this.ensureUniqueBlocks();
        console.log('Child block added:', newBlock);
        console.log('Current blocks:', this.part.blocks);
    }

    onRemoveCommand(block: Block) {
    }

    ngOnInit(): void {
        if (this.part.blocks.length > 0) {
            this.currentBlock = this.part.blocks[0];
        }
        this.ensureUniqueBlocks();
        console.log('Initial blocks:', this.part.blocks);
    }

    duplicatePart() {
        this.onDuplicatePart.emit(this.part);
    }

    removePart() {
        this.onRemovePart.emit(this.part);
    }

    playPart() {
        const player = new Player(0, this.part.instrumentType || InstrumentType.PIANO);
        const dummySong = new Song();
        if (this.variableContext) {
            dummySong.variableContext = this.variableContext;
        }
        this.songPlayer.playPart(this.part, player, dummySong);
    }

    stopPart() {
        this.songPlayer.stop();
    }

    setCurrentBlock(block: Block) {
        this.currentBlock = block;
    }
}
