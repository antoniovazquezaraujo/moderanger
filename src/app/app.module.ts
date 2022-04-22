import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TreeModule } from 'primeng/tree';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { BlockComponent } from './components/block/block.component';
import { BlockNotesComponent } from './components/block-notes/block-notes.component';
import { BlockCommandsComponent } from './components/block-commands/block-commands.component';
import { SongEditorComponent } from './components/song-editor/song-editor.component';
import { PartsComponent } from './components/parts/parts.component';
import { PartComponent } from './components/part/part.component';
import { SongComponent } from './components/song/song.component';
import {ButtonModule} from 'primeng/button';
import {TreeDragDropService} from 'primeng/api';
import {InputTextModule} from 'primeng/inputtext';
import {KnobModule} from 'primeng/knob';
import {DropdownModule} from 'primeng/dropdown';
import {InputNumberModule} from 'primeng/inputnumber';
import {AccordionModule} from 'primeng/accordion';
import {InputTextareaModule} from 'primeng/inputtextarea';
@NgModule({
  declarations: [
    AppComponent,
    BlockComponent,
    BlockNotesComponent,
    BlockCommandsComponent,
    SongEditorComponent,
    PartsComponent,
    PartComponent,
    SongComponent
  ],
  imports: [
    FormsModule,
    BrowserModule,
    BrowserAnimationsModule,
    TreeModule,
    ButtonModule,
    InputTextModule,
    KnobModule,
    DropdownModule,
    InputNumberModule,
    AccordionModule ,
    InputTextareaModule
  ],
  providers: [TreeDragDropService],
  bootstrap: [AppComponent]
})
export class AppModule { }
