import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Tooltip } from 'primeng/tooltip';
import { Block } from 'src/app/model/block';
import { ContentKind, Melody, Preset, Procedure } from 'src/app/model/content';
import { Song } from 'src/app/model/song';
import { createContent, findContent } from '../content-library/content-usage';

/** Navegación desde un bloque a la definición de contenido. */
export interface ContentEditRequest {
    kind: ContentKind;
    label: string;
}

/**
 * Referencias de contenido de un bloque estructural (ADR-004).
 *
 * Un bloque puede apuntar como máximo a una melodía, un preset y un
 * procedimiento. Los selectores permiten asignar o quitar (`No …`), crear una
 * entrada nueva en la biblioteca y navegar a la definición existente.
 */
@Component({
    selector: 'app-block-content-links',
    templateUrl: './block-content-links.component.html',
    styleUrls: ['./block-content-links.component.scss'],
    imports: [FormsModule, Button, Tooltip]
})
export class BlockContentLinksComponent {
    @Input() block!: Block;
    @Input() song!: Song;

    @Output() contentEdit = new EventEmitter<ContentEditRequest>();

    get melodies(): Melody[] {
        return this.song?.melodies ?? [];
    }

    get presets(): Preset[] {
        return this.song?.presets ?? [];
    }

    get procedures(): Procedure[] {
        return this.song?.procedures ?? [];
    }

    trackByContent(_index: number, entry: Melody | Preset | Procedure): number {
        return entry.id;
    }

    onMelodySelected(label: string): void {
        this.block.melody = label === '' ? undefined : (findContent(this.song, 'melody', label) as Melody | undefined);
    }

    onPresetSelected(label: string): void {
        this.block.preset = label === '' ? undefined : (findContent(this.song, 'preset', label) as Preset | undefined);
    }

    onProcedureSelected(label: string): void {
        this.block.procedure =
            label === '' ? undefined : (findContent(this.song, 'procedure', label) as Procedure | undefined);
    }

    createMelody(): void {
        const melody = createContent(this.song, 'melody') as Melody;
        this.song.melodies.push(melody);
        this.block.melody = melody;
        this.notify('melody', melody.label);
    }

    createPreset(): void {
        const preset = createContent(this.song, 'preset') as Preset;
        this.song.presets.push(preset);
        this.block.preset = preset;
        this.notify('preset', preset.label);
    }

    createProcedure(): void {
        const procedure = createContent(this.song, 'procedure') as Procedure;
        this.song.procedures.push(procedure);
        this.block.procedure = procedure;
        this.notify('procedure', procedure.label);
    }

    editMelody(): void {
        if (this.block.melody) {
            this.notify('melody', this.block.melody.label);
        }
    }

    editPreset(): void {
        if (this.block.preset) {
            this.notify('preset', this.block.preset.label);
        }
    }

    editProcedure(): void {
        if (this.block.procedure) {
            this.notify('procedure', this.block.procedure.label);
        }
    }

    private notify(kind: ContentKind, label: string): void {
        this.contentEdit.emit({ kind, label });
    }
}
