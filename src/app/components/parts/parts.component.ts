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
    @Input() variableContext?: VariableContext;
    @Output() onRemovePart: EventEmitter<any>;
    @Output() onPlayPart: EventEmitter<any>;

    constructor() {
        this.onRemovePart = new EventEmitter<any>();
        this.onPlayPart = new EventEmitter<any>();
    }

    ngOnInit(): void {
    }

    onDuplicatePart(part: Part) {
        this.parts.push(new Part(part));
    }

    removePart(part: Part) {
        this.onRemovePart.emit(part);
    }

    playPart(part: Part) {
        this.onPlayPart.emit(part);
    }
}
