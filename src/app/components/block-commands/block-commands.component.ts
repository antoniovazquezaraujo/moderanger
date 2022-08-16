import { Component, Input, OnInit } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command, CommandType } from 'src/app/model/command';
import { getPlayModeNames } from 'src/app/model/play.mode';
import { getScaleNames } from 'src/app/model/scale';

 
@Component({
    selector: 'app-block-commands',
    templateUrl: './block-commands.component.html',
    styleUrls: ['./block-commands.component.css']
})
export class BlockCommandsComponent implements OnInit {
    @Input() block: Block = new Block();

    commandTypes  = CommandType;
    commandTypeNames:any[] = [];
 
    playModeValues:number[]=[];
    scaleValues:number[]=[];
    playModeNames: any[] ;
    scaleNames: any[]; 
  
    constructor() {         
        this.playModeNames = getPlayModeNames();
        this.scaleNames = getScaleNames();
    }

    ngOnInit(): void {
        this.commandTypeNames = Object.keys(CommandType).filter(f => !isNaN(Number(f)));
    }

    removeCommand(command: Command):void {
        this.block.commands = this.block.commands?.filter(t => t !== command);

    }
    addCommand(){
        this.block.commands?.push(new Command());
    }     

}
