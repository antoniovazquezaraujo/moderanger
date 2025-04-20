import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Componentes relacionados con la edición
import { BlockComponent } from '../block/block.component';
import { BlockCommandsComponent } from '../block-commands/block-commands.component';
import { SongEditorComponent } from '../song-editor/song-editor.component';
import { PartsComponent } from '../parts/parts.component';
import { PartComponent } from '../part/part.component';
import { SongComponent } from '../song/song.component';
import { VariableDeclarationComponent } from '../variable-declaration/variable-declaration.component';
import { MetronomeComponent } from '../metronome/metronome.component';
import { MelodyEditorWrapperComponent } from '../melody-editor-wrapper/melody-editor-wrapper.component';
import { MelodyOptionComponent } from '../melody-option/melody-option.component';
import { MelodyEditorComponent } from '../melody-editor/melody-editor.component';
import { MelodyNoteComponent } from '../melody-note/melody-note.component';
import { MelodyGroupComponent } from '../melody-group/melody-group.component';

// Módulos de PrimeNG (y otros) necesarios para estos componentes
import { TreeModule } from 'primeng/tree';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { KnobModule } from 'primeng/knob';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { AccordionModule } from 'primeng/accordion';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { SplitterModule } from 'primeng/splitter';
import { SidebarModule } from 'primeng/sidebar';
import { SharedModule } from 'primeng/api';

@NgModule({
  declarations: [
    BlockComponent,
    BlockCommandsComponent,
    SongEditorComponent,
    PartsComponent,
    PartComponent,
    SongComponent,
    VariableDeclarationComponent,
    MetronomeComponent,
    MelodyEditorWrapperComponent,
    MelodyOptionComponent,
    MelodyEditorComponent,
    MelodyNoteComponent,
    MelodyGroupComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    // Módulos PrimeNG
    TreeModule,
    SharedModule,
    ButtonModule,
    InputTextModule,
    KnobModule,
    DropdownModule,
    InputNumberModule,
    AccordionModule,
    InputTextareaModule,
    TooltipModule,
    SplitterModule,
    SidebarModule,
  ],
  exports: [
    // Exportar el componente principal que se usa fuera (en AppComponent)
    SongEditorComponent,
    MelodyEditorComponent
  ]
})
export class EditorModule { } 