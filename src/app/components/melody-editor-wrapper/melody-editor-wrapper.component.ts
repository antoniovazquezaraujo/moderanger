import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MelodyEditorService } from '../../services/melody-editor.service';

@Component({
    selector: 'app-melody-editor-wrapper',
    template: `
        <app-melody-editor 
            [notes]="notes" 
            (notesChange)="onNotesChange($event)">
        </app-melody-editor>
    `,
    providers: [MelodyEditorService]
})
export class MelodyEditorWrapperComponent {
    @Input() notes: string = '';
    @Output() notesChange = new EventEmitter<string>();

    constructor() {}

    onNotesChange(notes: string): void {
        this.notesChange.emit(notes);
    }
} 