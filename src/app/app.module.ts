import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { EditorModule } from './components/editor/editor.module';
import { TreeDragDropService } from 'primeng/api';
import { SongPlayer } from './model/song.player';
import { NoteGenerationService } from './services/note-generation.service';
import { NoteGenerationUnifiedService } from './shared/services/note-generation-unified.service';

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
        SongPlayer,
        // Servicios puros (sin @Injectable) instanciados por factory.
        { provide: NoteGenerationUnifiedService, useFactory: () => new NoteGenerationUnifiedService() },
        {
            provide: NoteGenerationService,
            useFactory: (unified: NoteGenerationUnifiedService) => new NoteGenerationService(unified),
            deps: [NoteGenerationUnifiedService]
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
