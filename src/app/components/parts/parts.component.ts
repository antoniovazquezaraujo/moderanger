import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Part } from 'src/app/model/part';
import { VariableContext } from 'src/app/model/variable.context';

@Component({
    selector: 'app-parts',
    templateUrl: './parts.component.html',
    styleUrls: ['./parts.component.css']
})
export class PartsComponent implements OnInit {
    @Input() parts: Part[] = [];
    @Output() onRemovePart: EventEmitter<Part>;

    constructor() {
        this.onRemovePart = new EventEmitter<Part>();
    }

    ngOnInit(): void {
    }

    onDuplicatePart(part: Part) {
        this.parts.push(part.clone());
    }

    removePart(part: Part) {
        this.onRemovePart.emit(part);
    }
}
