import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  Input,
  OnDestroy,
  Output,
  EventEmitter,
  ViewChild
} from '@angular/core';
import { Song, DEFAULT_BPM, DEFAULT_REPEATS, MAX_BPM, MAX_REPEATS, MIN_BPM, MIN_REPEATS } from 'src/app/model/song';
import { Part } from 'src/app/model/part';
import { SongPlayer } from 'src/app/model/song.player';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NoteDuration } from 'src/app/model/melody';
import { MrTextAppliedEvent } from '../mr-text-editor/mr-text-editor.component';
import {
  applyDocumentVariables,
  buildMrFileName,
  createDocumentFromContext,
  MrMeta,
  MrSerializeError,
  prepareSongText,
  serializeSong,
  songToMrMeta,
  SongDocument
} from 'src/app/model/mr';
import { downloadTextFile, readFileAsText } from 'src/app/model/mr/mr.file.browser';
import { ContentLibraryComponent } from '../content-library/content-library.component';
import type { ContentEditRequest } from '../block-content-links/block-content-links.component';
import { ExampleLibraryComponent } from '../example-library/example-library.component';
import { HelpPanelComponent } from '../help-panel/help-panel.component';
import { MetronomeComponent } from '../metronome/metronome.component';
import { MrLivePanelComponent } from '../mr-live-panel/mr-live-panel.component';
import { MrTextEditorComponent } from '../mr-text-editor/mr-text-editor.component';
import { SongComponent } from '../song/song.component';
import { VariableDeclarationComponent } from '../variable-declaration/variable-declaration.component';
import { Bind } from 'primeng/bind';
import { Button, ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Tooltip } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { createDemoSong } from 'src/app/model/demo-song';
import { createExampleSong, ExampleSong } from 'src/app/model/examples';

@Component({
    selector: 'app-song-editor',
    templateUrl: './song-editor.component.html',
    styleUrls: ['./song-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        FormsModule,
        Bind,
        Button,
        ButtonDirective,
        Dialog,
        Tooltip,
        ContentLibraryComponent,
        ExampleLibraryComponent,
        HelpPanelComponent,
        MetronomeComponent,
        MrLivePanelComponent,
        MrTextEditorComponent,
        SongComponent,
        VariableDeclarationComponent
    ]
})
export class SongEditorComponent implements OnInit, OnDestroy {
    @Input() song!: Song;
    /** Nueva canción cuando se aplica la vista de texto `.mr`. */
    @Output() songChange = new EventEmitter<Song>();
    
    public metronome$: Observable<number>;
    /** Panel de Variables plegable (encima de las parts); plegado al inicio. */
    variablesExpanded: boolean = false;
    /** Formulario de nueva variable; solo se muestra al pulsar +. */
    variableFormVisible = false;
    /** Panel de Parts plegable (debajo de Variables y Blocks); plegado al inicio. */
    partsExpanded: boolean = false;
    /** Panel lateral de solo lectura con el texto canónico en vivo. */
    mrTextPanelVisible: boolean = false;
    /** Panel lateral de ejemplos, junto al de texto. */
    examplesVisible = false;
    /** Ancho del panel de texto; se ajusta con el splitter. */
    mrTextPanelWidth = 400;
    /** Ancho del panel de ejemplos; se ajusta con el splitter. */
    examplesPanelWidth = 260;
    /** Diálogo avanzado de edición del `.mr`. */
    mrEditorVisible: boolean = false;
    helpVisible: boolean = false;
    isPlaying: boolean = false;

    /** Diálogo de errores de guardar/cargar `.mr`. */
    mrErrorVisible = false;
    mrErrorTitle = '';
    mrErrorLines: string[] = [];

    @ViewChild('mrFileInput') mrFileInputRef?: ElementRef<HTMLInputElement>;
    @ViewChild('contentLibrary') contentLibraryRef?: ContentLibraryComponent;

    selectedDefaultDuration: NoteDuration = '4n';
    readonly availableDurations: NoteDuration[] = ['1n', '2n', '4n', '8n', '16n', '4t', '8t'];

    private destroy$ = new Subject<void>();
    private panelResize: { target: 'text' | 'examples'; startX: number; startWidth: number } | null = null;

    constructor(
        public songPlayer: SongPlayer,
        private cdr: ChangeDetectorRef
    ) {
        this.metronome$ = this.songPlayer.metronome$;
        this.metronome$
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                const playing = this.songPlayer.isPlaying;
                if (this.isPlaying !== playing) {
                    this.isPlaying = playing;
                    this.cdr.detectChanges();
                }
            });
    }

    ngOnInit(): void {
        this.cdr.detectChanges();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    toggleVariablesPanel(): void {
        this.variablesExpanded = !this.variablesExpanded;
        if (!this.variablesExpanded) {
            this.variableFormVisible = false;
        }
    }

    toggleVariableForm(): void {
        this.variableFormVisible = !this.variableFormVisible;
    }

    closeVariableForm(): void {
        this.variableFormVisible = false;
    }

    togglePartsPanel(): void {
        this.partsExpanded = !this.partsExpanded;
    }

    /** Navegación desde un bloque: expande y resalta la definición de contenido. */
    focusContent(request: ContentEditRequest): void {
        this.contentLibraryRef?.focusContent(request.kind, request.label);
    }

    toggleMrTextPanel(): void {
        this.mrTextPanelVisible = !this.mrTextPanelVisible;
    }

    toggleExamplesPanel(): void {
        this.examplesVisible = !this.examplesVisible;
    }

    openMrTextEditor(): void {
        this.mrEditorVisible = true;
    }

    toggleHelp(): void {
        this.helpVisible = !this.helpVisible;
    }

    /** Carga una pieza corta válida para que el editor no arranque vacío. */
    loadDemoSong(): void {
        this.stopIfPlaying();
        this.helpVisible = false;
        this.partsExpanded = true;
        this.songChange.emit(createDemoSong());
        this.cdr.markForCheck();
    }

    /** Carga un tema de la galería y lo reproduce inmediatamente. */
    loadExample(example: ExampleSong): void {
        const song = createExampleSong(example);
        this.stopIfPlaying();
        this.partsExpanded = true;
        this.songChange.emit(song);
        this.cdr.markForCheck();
        void this.songPlayer.playSongFromStart(song).catch(error =>
            console.error('[Examples] Could not start playback:', error)
        );
    }

    startPanelResize(target: 'text' | 'examples', event: PointerEvent): void {
        event.preventDefault();
        const width = target === 'text' ? this.mrTextPanelWidth : this.examplesPanelWidth;
        this.panelResize = { target, startX: event.clientX, startWidth: width };
        const splitter = event.currentTarget as HTMLElement | null;
        splitter?.setPointerCapture?.(event.pointerId);
    }

    onPanelResize(event: PointerEvent): void {
        if (!this.panelResize) {
            return;
        }
        const delta = event.clientX - this.panelResize.startX;
        this.setPanelWidth(this.panelResize.target, this.panelResize.startWidth - delta);
    }

    endPanelResize(event: PointerEvent): void {
        if (!this.panelResize) {
            return;
        }
        const splitter = event.currentTarget as HTMLElement | null;
        if (splitter?.hasPointerCapture?.(event.pointerId)) {
            splitter.releasePointerCapture(event.pointerId);
        }
        this.panelResize = null;
    }

    onPanelResizeKeydown(target: 'text' | 'examples', event: KeyboardEvent): void {
        const direction = event.key === 'ArrowLeft' ? 20 : event.key === 'ArrowRight' ? -20 : 0;
        if (direction === 0) {
            return;
        }
        event.preventDefault();
        const width = target === 'text' ? this.mrTextPanelWidth : this.examplesPanelWidth;
        this.setPanelWidth(target, width + direction);
    }

    resetPanelWidths(): void {
        this.mrTextPanelWidth = 400;
        this.examplesPanelWidth = 260;
        this.cdr.markForCheck();
    }

    private setPanelWidth(target: 'text' | 'examples', width: number): void {
        const viewport = typeof window === 'undefined' ? 1440 : window.innerWidth;
        const other = target === 'text'
            ? (this.examplesVisible ? this.examplesPanelWidth : 0)
            : (this.mrTextPanelVisible ? this.mrTextPanelWidth : 0);
        const max = Math.max(240, viewport - 360 - other - 32);
        const next = Math.max(200, Math.min(max, width));
        if (target === 'text') {
            this.mrTextPanelWidth = next;
        } else {
            this.examplesPanelWidth = next;
        }
        this.cdr.markForCheck();
    }

    /**
     * La vista de texto `.mr` ha reemplazado el modelo (sus variables ya están
     * aplicadas): se detiene la reproducción y se reemite la nueva canción
     * hacia arriba (AppComponent es el dueño). La canción ya trae `repeats` y
     * `bpm` (los copia `parseSong`), así que aquí no hay meta de sesión.
     */
    onMrTextApplied(event: MrTextAppliedEvent): void {
        this.stopIfPlaying();
        this.mrEditorVisible = false;
        this.songChange.emit(event.song);
    }

    /** Serializa el modelo actual y descarga `<nombre-saneado>.mr`. */
    saveMrFile(): void {
        try {
            const document = createDocumentFromContext(this.song, this.currentMeta());
            downloadTextFile(buildMrFileName(this.song.name), serializeSong(document));
        } catch (error) {
            const detail = error instanceof MrSerializeError ? error.message : String(error);
            this.showMrErrors('No se pudo guardar el fichero .mr', [detail]);
        }
    }

    /** Abre el selector de fichero `.mr` (input oculto de la plantilla). */
    openMrFilePicker(): void {
        this.mrFileInputRef?.nativeElement.click();
    }

    /**
     * Lee el `.mr` elegido (UTF-8), lo valida y, solo si es válido, reemplaza
     * la canción; si hay errores los muestra con `fichero:línea:columna` y no
     * toca el modelo actual.
     */
    async onMrFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files && input.files.length > 0 ? input.files[0] : undefined;
        // Permite volver a elegir el mismo fichero (un input con el mismo value
        // no dispara `change`).
        input.value = '';
        if (file === undefined) {
            return;
        }
        try {
            const result = prepareSongText(await readFileAsText(file));
            if (result.document === undefined) {
                const lines = result.errors.map(error => error.format(file.name));
                if (result.serializeError !== undefined) {
                    lines.push(`${file.name}  error: ${result.serializeError}`);
                }
                this.showMrErrors(`No se pudo cargar '${file.name}'`, lines);
                return;
            }
            this.applyLoadedDocument(result.document);
        } catch (error) {
            this.showMrErrors(`No se pudo leer '${file.name}'`, [String(error)]);
        }
    }

    /**
     * Adopta un documento `.mr` ya validado: para el player ANTES de aplicar
     * variables (`stop()` restaura el snapshot previo al Play), las sincroniza
     * y emite la canción por el mismo camino que la vista de texto. La canción
     * ya trae `repeats`/`bpm` de la cabecera (los copia `parseSong`).
     */
    applyLoadedDocument(document: SongDocument): void {
        this.stopIfPlaying();
        applyDocumentVariables(document);
        this.songChange.emit(document.song);
    }

    private currentMeta(): MrMeta {
        // `Song.repeats` y `Song.bpm` son la fuente de verdad; la meta solo los
        // refleja al guardar.
        return songToMrMeta(this.song);
    }

    /**
     * Recorta y aplica el BPM del input de cabecera al modelo. Se invoca en
     * `ngModelChange`, es decir, **mientras se escribe** (no al salir del
     * campo): así guardar o aplicar nunca serializan un valor viejo. El rango
     * es el del formato `.mr` (30-240) para que el modelo siempre sea
     * serializable; un valor vacío o no numérico vuelve al valor por defecto.
     * Live-tempo (#18): si la canción está sonando, el Transport se reajusta ya.
     */
    onBpmChange(value: unknown): void {
        const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
        this.song.bpm = Number.isFinite(parsed)
            ? Math.min(MAX_BPM, Math.max(MIN_BPM, parsed))
            : DEFAULT_BPM;
        if (this.songPlayer.isPlaying) {
            this.songPlayer.setTransportBpm(this.song.bpm);
        }
        this.cdr.markForCheck();
    }

    /**
     * Recorta y aplica el Repeat del input de cabecera al modelo. Se invoca en
     * `ngModelChange` (**mientras se escribe**), por el mismo motivo que el
     * BPM. Rango de la UI (1-99) para que `Song.repeats` siempre sea
     * serializable; un valor vacío o no numérico vuelve a 1. Con reproducción
     * en curso el valor se aplica al siguiente Play (la secuencia ya está
     * programada).
     */
    onRepeatsChange(value: unknown): void {
        const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
        this.song.repeats = Number.isFinite(parsed)
            ? Math.min(MAX_REPEATS, Math.max(MIN_REPEATS, parsed))
            : DEFAULT_REPEATS;
        this.cdr.markForCheck();
    }

    private stopIfPlaying(): void {
        if (this.songPlayer.isPlaying) {
            this.songPlayer.stop();
        }
    }

    private showMrErrors(title: string, lines: string[]): void {
        this.mrErrorTitle = title;
        this.mrErrorLines = lines;
        this.mrErrorVisible = true;
        this.cdr.markForCheck();
    }

    addPart() {
        if (!this.song.parts) {
            this.song.parts = [];
        }
        this.song.parts.push(new Part());
        // La parts se crean desde la cabecera del panel: si estuviera plegado,
        // se abre para que la nueva part quede visible.
        this.partsExpanded = true;
        this.cdr.detectChanges();
    }

    /**
     * Play siempre empieza desde el principio: `SongPlayer.playSongFromStart`
     * para la reproducción actual (si la hay) y espera al stop del Transport
     * antes de lanzar la nueva, todo en un solo clic. `SongPlayer` aplica
     * `Song.repeats` y `Song.bpm` al iniciar (no hay copia de sesión que
     * asignar aquí).
     */
    async playSong(): Promise<void> {
        await this.songPlayer.playSongFromStart(this.song);
        // Refleja el nuevo estado ya (sin esperar al siguiente tick del metrónomo).
        this.isPlaying = this.songPlayer.isPlaying;
        this.cdr.markForCheck();
    }

    stopSong() {
        this.songPlayer.stop();
    }

    removePartFromSong(part: Part) {
        if (this.song.parts && this.song.parts.length > 0) {
            this.song.parts = this.song.parts.filter(p => p !== part);
            this.cdr.detectChanges();
        }
    }

    duplicatePart(partToDuplicate: Part) {
        console.log("Duplicating part in SongEditorComponent:", partToDuplicate);
        const index = this.song.parts.findIndex(p => p === partToDuplicate);
        if (index !== -1) {
            const clonedPart = partToDuplicate.clone();
            // Assign a new unique ID if Part uses static IDs
            // clonedPart.id = Part._id++; // Or however new IDs are handled
            this.song.parts.splice(index + 1, 0, clonedPart);
            this.cdr.detectChanges();
            console.log("Part duplicated. New parts array:", this.song.parts);
        } else {
            console.error("Part to duplicate not found in song.");
        }
    }
}