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

@Component({
    selector: 'app-song-editor',
    templateUrl: './song-editor.component.html',
    styleUrls: ['./song-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongEditorComponent implements OnInit, OnDestroy {
    @Input() song!: Song;
    /** Nueva canción cuando se aplica la vista de texto `.mr`. */
    @Output() songChange = new EventEmitter<Song>();
    
    public metronome$: Observable<number>;
    variablesSidebarVisible: boolean = false;
    mrTextVisible: boolean = false;
    isPlaying: boolean = false;

    /** Diálogo de errores de guardar/cargar `.mr`. */
    mrErrorVisible = false;
    mrErrorTitle = '';
    mrErrorLines: string[] = [];

    @ViewChild('mrFileInput') mrFileInputRef?: ElementRef<HTMLInputElement>;

    selectedDefaultDuration: NoteDuration = '4n';
    readonly availableDurations: NoteDuration[] = ['1n', '2n', '4n', '8n', '16n', '4t', '8t'];

    private destroy$ = new Subject<void>();

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

    toggleVariablesSidebar(): void {
        this.variablesSidebarVisible = !this.variablesSidebarVisible;
    }

    toggleMrTextEditor(): void {
        this.mrTextVisible = !this.mrTextVisible;
    }

    /**
     * La vista de texto `.mr` ha reemplazado el modelo (sus variables ya están
     * aplicadas): se detiene la reproducción y se reemite la nueva canción
     * hacia arriba (AppComponent es el dueño). La canción ya trae `repeats` y
     * `bpm` (los copia `parseSong`), así que aquí no hay meta de sesión.
     */
    onMrTextApplied(event: MrTextAppliedEvent): void {
        this.stopIfPlaying();
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
     * variables (`stop()` reinicia `VariableContext`), las sincroniza y emite
     * la canción por el mismo camino que la vista de texto. La canción ya trae
     * `repeats`/`bpm` de la cabecera (los copia `parseSong`).
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
     * Recorta y aplica el BPM del input de cabecera al modelo. El rango es el
     * del formato `.mr` (30-240) para que el modelo siempre sea serializable;
     * un valor vacío o no numérico vuelve al valor por defecto.
     */
    onBpmChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const parsed = Number.parseInt(input.value, 10);
        this.song.bpm = Number.isFinite(parsed)
            ? Math.min(MAX_BPM, Math.max(MIN_BPM, parsed))
            : DEFAULT_BPM;
        // Refleja el valor recortado aunque coincida con el anterior (p. ej.
        // "999" -> 240): `[ngModel]` no reescribe el DOM si no cambia el modelo.
        input.value = String(this.song.bpm);
        this.cdr.markForCheck();
    }

    /**
     * Recorta y aplica el Repeat del input de cabecera al modelo. Rango de la
     * UI (1-99) para que `Song.repeats` siempre sea serializable; un valor
     * vacío o no numérico vuelve a 1. Con reproducción en curso el valor se
     * aplica al siguiente Play (la secuencia ya está programada).
     */
    onRepeatsChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const parsed = Number.parseInt(input.value, 10);
        this.song.repeats = Number.isFinite(parsed)
            ? Math.min(MAX_REPEATS, Math.max(MIN_REPEATS, parsed))
            : DEFAULT_REPEATS;
        // Refleja el valor recortado aunque coincida con el anterior (p. ej.
        // "999" -> 99): `[ngModel]` no reescribe el DOM si no cambia el modelo.
        input.value = String(this.song.repeats);
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
        this.cdr.detectChanges();
    }

    playSong() {
        // `SongPlayer` aplica `Song.repeats` y `Song.bpm` al iniciar (no hay
        // copia de sesión que asignar aquí).
        this.songPlayer.playSong(this.song);
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