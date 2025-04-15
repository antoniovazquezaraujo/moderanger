import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Part } from 'src/app/model/part';
import { VariableContext } from 'src/app/model/variable.context';
import { Song } from 'src/app/model/song';

@Component({
    selector: 'app-parts',
    templateUrl: './parts.component.html',
    styleUrls: ['./parts.component.css']
})
export class PartsComponent implements OnInit {
    @Input() parts: Part[] = [];
    @Input() song!: Song;
    @Output() onRemovePart: EventEmitter<Part>;
    @Output() onDuplicatePart: EventEmitter<Part>;

    constructor() {
        this.onRemovePart = new EventEmitter<Part>();
        this.onDuplicatePart = new EventEmitter<Part>();
    }

    ngOnInit(): void {
    }

    removePart(part: Part) {
        this.onRemovePart.emit(part);
    }

    handleDuplicatePart(part: Part) {
        this.onDuplicatePart.emit(part);
    }
}
