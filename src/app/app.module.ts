import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './material/material.module';
import { SongComponent } from './components/song/song.component';
import { BlockComponent } from './components/block/block.component';
import { BlockNotesComponent } from './components/block-notes/block-notes.component';
import { BlockCommandsComponent } from './components/block-commands/block-commands.component';
import { BlockCommandComponent } from './components/block-command/block-command.component';
import { SongEditorComponent } from './components/song-old-editor/song-old-editor.component';
import { NewEditorComponent } from './components/new-editor/new-editor.component';
import { PartsComponent } from './components/parts/parts.component';
import { PartComponent } from './components/part/part.component';
@NgModule({
  declarations: [
    AppComponent,
    SongComponent,
    BlockComponent,
    BlockNotesComponent,
    BlockCommandsComponent,
    BlockCommandComponent,
    SongEditorComponent,
    NewEditorComponent,
    PartsComponent,
    PartComponent
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
