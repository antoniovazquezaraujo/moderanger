import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Part } from 'src/app/model/part';
import { Song } from 'src/app/model/song';

@Component({
    selector: 'app-song',
    templateUrl: './song.component.html',
    styleUrls: ['./song.component.css']
})
export class SongComponent implements OnInit {
    
    @Input() song!:Song;
    @Output() onPlayPart:EventEmitter<Part>;
    
    constructor() {
        this.onPlayPart = new EventEmitter<Part>();
     }

    ngOnInit(): void {
    }
    
    addPart() {
        this.song.addPart();
    }
    addCommand() {
        this.song.addCommand();
    }
    addNotes() {
        this.song.addNotes();
    }
    getParts() {
        return this.song.parts;
    }
    removePart(part:Part){
        this.song.parts = this.song.parts.filter(t => t!=part);
    }
    playPart(part:Part){
        this.onPlayPart.emit(part);
    }
}
