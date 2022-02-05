import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-block-notes',
  templateUrl: './block-notes.component.html',
  styleUrls: ['./block-notes.component.css']
})
export class BlockNotesComponent implements OnInit {
    @Input() notes:string = '';
    
  constructor() { }

  ngOnInit(): void {
  }

}
