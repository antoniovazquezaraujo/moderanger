import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './material/material.module';
import { BlockComponent } from './components/block/block.component';
import { BlockNotesComponent } from './components/block-notes/block-notes.component';
import { BlockCommandsComponent } from './components/block-commands/block-commands.component';
import { BlockCommandComponent } from './components/block-command/block-command.component';
import { NewEditorComponent } from './components/new-editor/new-editor.component';
import { PartsComponent } from './components/parts/parts.component';
import { PartComponent } from './components/part/part.component';
import { ChipsComponent } from './components/chips/chips.component';
@NgModule({
  declarations: [
    AppComponent,
    BlockComponent,
    BlockNotesComponent,
    BlockCommandsComponent,
    BlockCommandComponent,
    NewEditorComponent,
    PartsComponent,
    PartComponent,
    ChipsComponent
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
