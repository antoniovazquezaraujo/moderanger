import { Component, Input, OnInit } from '@angular/core';
import { Command } from 'src/app/model/command';

@Component({
  selector: 'app-block-commands',
  templateUrl: './block-commands.component.html',
  styleUrls: ['./block-commands.component.css']
})
export class BlockCommandsComponent implements OnInit {
@Input() commands:Command[] = [];
  constructor() { }

  ngOnInit(): void {
  }

}
