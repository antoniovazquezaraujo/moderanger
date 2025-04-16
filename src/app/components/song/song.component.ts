import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Part } from 'src/app/model/part';
import { Song } from 'src/app/model/song';

@Component({
    selector: 'app-song',
    templateUrl: './song.component.html',
    styleUrls: ['./song.component.css']
})
export class SongComponent implements OnInit {

    @Input() song: Song = new Song();
    @Output() removePartEvent = new EventEmitter<Part>();
    @Output() onDuplicatePartEvent = new EventEmitter<Part>();
    
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
