import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Part } from 'src/app/model/part';

@Component({
    selector: 'app-parts',
    templateUrl: './parts.component.html',
    styleUrls: ['./parts.component.css']
})
export class PartsComponent  {

    @Input() parts!: Part[];
    @Output() onRemovePart:EventEmitter<Part>;
    @Output() onPlayPart:EventEmitter<Part>;
    constructor() { 
        this.onRemovePart = new EventEmitter<Part>();
        this.onPlayPart = new EventEmitter<Part>();
    }
 
    duplicatePart(part:any){
        var copy = new Part(part);
        this.parts.push(copy);
    }
    removePart(part:any){
        this.onRemovePart.emit(part);
    }
    playPart(part:any){
        this.onPlayPart.emit(part);
    }

}
