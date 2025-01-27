import { NestedTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command } from 'src/app/model/command';
import { Part } from 'src/app/model/part';
import { VariableContext } from 'src/app/model/variable.context';

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

    constructor() {
        this.onDuplicatePart = new EventEmitter<Part>();
        this.onRemovePart = new EventEmitter<Part>();
    }

    hasChildren(index: number, block: Block): boolean {
        return (block.children && block?.children.length > 0) as boolean;
    }

    onDuplicateBlock(block: Block) {
        let copy = new Block(block);
        this.part.block.children.push(copy);
    }

    onRemoveBlock(block: Block) {
        this.part.removeBlock(block);
    }

    onAddNewCommand() {
        this.part.block.commands.push(new Command());
    }

    onAddChild(block: Block) {
        block.children.push(new Block({}));
    }

    onRemoveCommand(block: Block) {
    }

    ngOnInit(): void {
    }

    duplicatePart() {
        this.onDuplicatePart.emit(this.part);
    }

    removePart() {
        this.onRemovePart.emit(this.part);
    }
}
