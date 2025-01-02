import { Component, Input, OnInit } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command, CommandType } from 'src/app/model/command';
import { getPlayModeNames } from 'src/app/model/play.mode';
import { Scale } from 'src/app/model/scale';
import { VariableContext } from 'src/app/model/variable.context';

@Component({
    selector: 'app-block-commands',
    templateUrl: './block-commands.component.html',
    styleUrls: ['./block-commands.component.css']
})
export class BlockCommandsComponent implements OnInit {
    @Input() block: Block = new Block();
    @Input() variableContext?: VariableContext;

    commandTypeNames: string[] = [];
    commandTypes = CommandType;
    playModeNames: string[];
    scaleNames: string[];
  
    constructor() {         
        this.playModeNames = getPlayModeNames();
        this.scaleNames = Scale.getScaleNames();
    }

    ngOnInit(): void {
        this.commandTypeNames = Object.values(CommandType);
    }

    removeCommand(command: Command): void {
        if (this.block.commands) {
            this.block.commands = this.block.commands.filter(t => t !== command);
        }
    }

    addCommand(): void {
        if (!this.block.commands) {
            this.block.commands = [];
        }
        this.block.commands.push(new Command());
    }

    handleValueInput(event: Event, command: Command): void {
        const input = event.target as HTMLInputElement;
        command.setValue(input.value);
    }
}
