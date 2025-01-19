import { NestedTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command } from 'src/app/model/command';
import { Part } from 'src/app/model/part';
import { VariableContext } from 'src/app/model/variable.context';
import { InstrumentType } from 'src/app/model/instruments';

@Component({
    selector: 'app-part',
    templateUrl: './part.component.html',
    styleUrls: ['./part.component.scss']
})
export class PartComponent implements OnInit {
    treeControl = new NestedTreeControl<Block>(node => node.children);
    instrumentTypes = [
        { label: 'Piano', value: InstrumentType.PIANO },
        { label: 'Bass', value: InstrumentType.BASS },
        { label: 'Strings', value: InstrumentType.STRINGS },
        { label: 'Synth', value: InstrumentType.SYNTH },
        { label: 'Drums', value: InstrumentType.DRUMS }
    ];

    @Input() part!: Part;
    @Input() variableContext?: VariableContext;
    @Output() onDuplicatePart: EventEmitter<any>;
    @Output() onRemovePart: EventEmitter<any>;
    @Output() onPlayPart: EventEmitter<any>;
    @Output() onInstrumentChange: EventEmitter<InstrumentType>;

    constructor() {
        this.onDuplicatePart = new EventEmitter<any>();
        this.onRemovePart = new EventEmitter<any>();
        this.onPlayPart = new EventEmitter<any>();
        this.onInstrumentChange = new EventEmitter<InstrumentType>();
    }

    hasChildren(index: number, block: Block): boolean {
        return (block.children && block?.children.length > 0) as boolean;
    }
    onDuplicateBlock(block: Block) {
        let copy = new Block(block) ;
        this.part.block.children.push(copy);
    }
    onRemoveBlock(block: Block) {
        this.part.removeBlock(block);
    }
    onAddNewCommand(){
        this.part.block.commands.push(new Command());
    }
    onAddChild(block:Block){
        block.children.push(new Block({}));
    }
    onRemoveCommand(block: Block){
     
    }
    ngOnInit(): void {

    }

    duplicatePart() {
        this.onDuplicatePart.emit(this.part);
    }
    removePart() {
        this.onRemovePart.emit(this.part);
    }
    playPart() {
        this.onPlayPart.emit(this.part);
    }

    onInstrumentSelected(instrumentType: InstrumentType) {
        this.part.instrumentType = instrumentType;
        this.onInstrumentChange.emit(instrumentType);
    }

}
