import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Part } from 'src/app/model/part';
import { Song } from 'src/app/model/song';
import { PartsComponent } from '../parts/parts.component';
import type { ContentEditRequest } from '../block-content-links/block-content-links.component';

@Component({
    selector: 'app-song',
    templateUrl: './song.component.html',
    styleUrls: ['./song.component.css'],
    imports: [PartsComponent]
})
export class SongComponent implements OnInit {

    @Input() song: Song = new Song();
    @Output() removePartEvent = new EventEmitter<Part>();
    @Output() onDuplicatePartEvent = new EventEmitter<Part>();
    /** Navegación a una definición de contenido (burbujea desde las parts). */
    @Output() contentEditEvent = new EventEmitter<ContentEditRequest>();
    
    constructor() {
    }

    ngOnInit(): void {
    }

    emitRemovePart(part: Part): void {
        this.removePartEvent.emit(part);
    }

    handleDuplicatePart(part: Part): void {
        this.onDuplicatePartEvent.emit(part);
    }

    getParts() {
        return this.song.parts;
    }
}
