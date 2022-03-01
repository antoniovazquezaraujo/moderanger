import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './material/material.module';
import { BlockComponent } from './components/block/block.component';
import { BlockNotesComponent } from './components/block-notes/block-notes.component';
import { BlockCommandsComponent } from './components/block-commands/block-commands.component';
import { SongEditorComponent } from './components/song-editor/song-editor.component';
import { PartsComponent } from './components/parts/parts.component';
import { PartComponent } from './components/part/part.component';
import { ChipsComponent } from './components/chips/chips.component';
import { SongComponent } from './components/song/song.component';
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
    //   NgModule,
    BrowserModule,
    BrowserAnimationsModule,
    MaterialModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
