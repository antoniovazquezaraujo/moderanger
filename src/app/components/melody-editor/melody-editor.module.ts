import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MelodyEditorComponent } from './melody-editor.component';
import { MelodyNoteComponent } from '../melody-note/melody-note.component';
import { MelodyGroupComponent } from '../melody-group/melody-group.component';

@NgModule({
    declarations: [
        MelodyEditorComponent,
        MelodyNoteComponent,
        MelodyGroupComponent
    ],
    imports: [
        CommonModule
    ],
    exports: [
        MelodyEditorComponent
    ],
    providers: []
})
export class MelodyEditorModule { } 