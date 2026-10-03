import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Input, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Song } from 'src/app/model/song';
import { Part } from 'src/app/model/part';
import { SongPlayer } from 'src/app/model/song.player';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NoteDuration } from 'src/app/model/melody';
import { MrTextAppliedEvent } from '../mr-text-editor/mr-text-editor.component';

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
    
    repetitions: number = 1;
    public metronome$: Observable<number>;
    variablesSidebarVisible: boolean = false;
    mrTextVisible: boolean = false;
    isPlaying: boolean = false;

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
     * La vista de texto `.mr` ha reemplazado el modelo: se detiene la
     * reproducción (para no mezclar la canción antigua) y se reemite la nueva
     * canción hacia arriba (AppComponent es el dueño del modelo).
     */
    onMrTextApplied(event: MrTextAppliedEvent): void {
        if (this.songPlayer.isPlaying) {
            this.songPlayer.stop();
        }
        this.repetitions = event.meta.repeats ?? 1;
        // No forzar CD aquí: el tick global posterior al evento propaga la
        // canción nueva al input `song` del editor `.mr` en la misma pasada.
        this.songChange.emit(event.song);
    }

    addPart() {
        if (!this.song.parts) {
            this.song.parts = [];
        }
        this.song.parts.push(new Part());
        this.cdr.detectChanges();
    }

    playSong() {
        this.songPlayer.songRepetitions = this.repetitions;
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