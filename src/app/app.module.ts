import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TreeModule } from 'primeng/tree';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './material/material.module';
import { MatIconModule } from '@angular/material/icon'
import { BlockComponent } from './components/block/block.component';
import { BlockNotesComponent } from './components/block-notes/block-notes.component';
import { BlockCommandsComponent } from './components/block-commands/block-commands.component';
import { SongEditorComponent } from './components/song-editor/song-editor.component';
import { PartsComponent } from './components/parts/parts.component';
import { PartComponent } from './components/part/part.component';
import { ChipsComponent } from './components/chips/chips.component';
import { SongComponent } from './components/song/song.component';
import {ButtonModule} from 'primeng/button';
import {TreeDragDropService} from 'primeng/api';
import {InputTextModule} from 'primeng/inputtext';
import { ChipModule } from 'primeng/chip';
import {ChipsModule} from 'primeng/chips';
import {KnobModule} from 'primeng/knob';
import {DropdownModule} from 'primeng/dropdown';
import {InputNumberModule} from 'primeng/inputnumber';
@NgModule({
  declarations: [
    AppComponent,
    BlockComponent,
    BlockNotesComponent,
    BlockCommandsComponent,
    SongEditorComponent,
    PartsComponent,
    PartComponent,
    ChipsComponent,
    SongComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MaterialModule,
    MatIconModule,
    TreeModule,
    ButtonModule,
    InputTextModule,
    ChipModule,
    ChipsModule,
    KnobModule,
    DropdownModule,
    InputNumberModule
  ],
  providers: [TreeDragDropService],
  bootstrap: [AppComponent]
})
export class AppModule { }
