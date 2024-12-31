import { Component, Input, OnInit } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command, CommandType } from 'src/app/model/command';
import { getPlayModeNames } from 'src/app/model/play.mode';
import { Scale } from 'src/app/model/scale';

 
@Component({
    selector: 'app-block-commands',
    templateUrl: './block-commands.component.html',
    styleUrls: ['./block-commands.component.css']
})
export class BlockCommandsComponent implements OnInit {
    @Input() block: Block = new Block();

    commandTypeNames: string[] = [];
    commandTypes = CommandType; // Asegúrate de que esto esté correcto
     playModeValues:number[]=[];
    scaleValues:number[]=[];
    playModeNames: any[] ;
    scaleNames: any[]; 
  
    constructor() {         
        this.playModeNames = getPlayModeNames();
        this.scaleNames = Scale.getScaleNames();
    }

    ngOnInit(): void {
        this.commandTypeNames = Object.values(CommandType).filter(value => String(value) !== '');
    }

    removeCommand(command: Command):void {
        this.block.commands = this.block.commands?.filter(t => t !== command);

    }
    addCommand(){
        this.block.commands?.push(new Command());
    }     

}
