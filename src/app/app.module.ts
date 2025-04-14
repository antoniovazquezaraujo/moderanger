import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { EditorModule } from './components/editor/editor.module';
import { TreeDragDropService } from 'primeng/api';
import { SongPlayer } from './model/song.player';

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        EditorModule
    ],
    providers: [
        TreeDragDropService,
        SongPlayer
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
