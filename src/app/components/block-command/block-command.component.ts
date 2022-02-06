import { Component, Input, OnInit } from '@angular/core';
import { Command } from 'src/app/model/command';

@Component({
    selector: 'app-block-command',
    templateUrl: './block-command.component.html',
    styleUrls: ['./block-command.component.css']
})
export class BlockCommandComponent implements OnInit {
    @Input() command!: Command;
    constructor() {
        // this.command = new Command("", "");
    }

    ngOnInit(): void {
    }

}
