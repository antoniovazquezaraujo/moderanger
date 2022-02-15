import { Input, Component, OnInit } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command } from 'src/app/model/command';
import { CommandNotes } from 'src/app/model/command.notes';
import { Part } from 'src/app/model/part';

@Component({
    selector: 'app-part',
    templateUrl: './part.component.html',
    styleUrls: ['./part.component.css']
})
export class PartComponent implements OnInit {

    @Input() part!:Part;
    constructor() {

    }

    ngOnInit(): void {
    }
    onAddNotes(){
        this.part.blocks.push(new Block([], new CommandNotes('')));
    }

}
