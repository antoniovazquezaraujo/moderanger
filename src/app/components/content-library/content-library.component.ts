import {
    ChangeDetectorRef,
    Component,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges,
    ViewChild,
    ElementRef
} from '@angular/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Tooltip } from 'primeng/tooltip';
import { ContentKind, Melody, Preset, Procedure } from 'src/app/model/content';
import { NoteDuration } from 'src/app/model/melody';
import { Song } from 'src/app/model/song';
import { PlayingNoteSource, SongPlayer } from 'src/app/model/song.player';
import {
    ContentEntry,
    ContentUsage,
    contentList,
    contentUsages,
    copyContentLabel,
    createContent,
    findContent,
    isContentLabelAvailable,
    kindDisplayName,
    removeContent
} from './content-usage';
import { MelodyEditorWrapperComponent } from '../melody-editor-wrapper/melody-editor-wrapper.component';
import { PresetEditorComponent } from '../preset-editor/preset-editor.component';
import { ProcedureEditorComponent } from '../procedure-editor/procedure-editor.component';

/**
 * Biblioteca global de contenido (ADR-004): melodías, presets y
 * procedimientos en un panel plegable con pestañas.
 *
 * Cada entrada se puede crear, duplicar, renombrar y borrar. Los usos se
 * cuentan recorriendo los bloques de todas las partes; borrar una entrada en
 * uso pide confirmación y limpia las referencias. La navegación desde un chip
 * de bloque llama a `focusContent` (expande, cambia de pestaña y resalta).
 */
@Component({
    selector: 'app-content-library',
    templateUrl: './content-library.component.html',
    styleUrls: ['./content-library.component.scss'],
    imports: [
        Bind,
        Button,
        Dialog,
        Tooltip,
        FormsModule,
        MelodyEditorWrapperComponent,
        PresetEditorComponent,
        ProcedureEditorComponent
    ]
})
export class ContentLibraryComponent implements OnChanges, OnInit, OnDestroy {
    @Input() song!: Song;

    expanded = false;
    activeTab: ContentKind = 'melody';

    readonly tabs: ReadonlyArray<{ kind: ContentKind; label: string }> = [
        { kind: 'melody', label: 'Melodies' },
        { kind: 'preset', label: 'Presets' },
        { kind: 'procedure', label: 'Procedures' }
    ];
    readonly availableDurations: ReadonlyArray<NoteDuration> = [
        '1n',
        '2n',
        '4n',
        '8n',
        '16n',
        '4t',
        '8t'
    ];

    private expandedEntries = new Set<ContentEntry>();
    private confirmedLabels = new Map<ContentEntry, string>();
    private highlightTimer: ReturnType<typeof setTimeout> | null = null;

    renameWarning = '';
    highlightedEntry: ContentEntry | null = null;

    deleteVisible = false;
    deleteKind: ContentKind | null = null;
    deleteCandidate: ContentEntry | null = null;
    deleteUsages: ContentUsage[] = [];

    /** Entradas de contenido que están sonando ahora mismo. */
    private readonly playingMelodyIds = new Set<number>();
    private readonly playingPresetIds = new Set<number>();
    private readonly playingProcedureIds = new Set<number>();
    private playingSourcesSub?: Subscription;

    @ViewChild('panelHeader') panelHeaderRef?: ElementRef<HTMLElement>;

    constructor(
        private readonly cdr: ChangeDetectorRef,
        private readonly songPlayer?: SongPlayer
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['song']) {
            this.resetState();
            this.registerLabels();
        }
    }

    ngOnInit(): void {
        this.playingSourcesSub = this.songPlayer?.playingSources$.subscribe(sources => {
            this.updatePlayingSources(sources);
        });
    }

    ngOnDestroy(): void {
        this.playingSourcesSub?.unsubscribe();
    }

    private updatePlayingSources(sources: readonly PlayingNoteSource[]): void {
        this.playingMelodyIds.clear();
        this.playingPresetIds.clear();
        this.playingProcedureIds.clear();
        sources.forEach(source => {
            if (source.melodyId !== undefined) {
                this.playingMelodyIds.add(source.melodyId);
            }
            if (source.presetId !== undefined) {
                this.playingPresetIds.add(source.presetId);
            }
            if (source.procedureId !== undefined) {
                this.playingProcedureIds.add(source.procedureId);
            }
        });
        this.cdr.detectChanges();
    }

    /** `true` si la entrada de la biblioteca está sonando ahora mismo. */
    isPlayingEntry(kind: ContentKind, entry: ContentEntry): boolean {
        if (kind === 'melody') {
            return this.playingMelodyIds.has(entry.id);
        }
        if (kind === 'preset') {
            return this.playingPresetIds.has(entry.id);
        }
        return this.playingProcedureIds.has(entry.id);
    }

    get melodies(): Melody[] {
        return this.song?.melodies ?? [];
    }

    get presets(): Preset[] {
        return this.song?.presets ?? [];
    }

    get procedures(): Procedure[] {
        return this.song?.procedures ?? [];
    }

    get totalCount(): number {
        return this.melodies.length + this.presets.length + this.procedures.length;
    }

    togglePanel(): void {
        this.expanded = !this.expanded;
    }

    selectTab(kind: ContentKind): void {
        this.activeTab = kind;
        this.renameWarning = '';
    }

    countFor(kind: ContentKind): number {
        return contentList(this.song, kind).length;
    }

    isExpanded(entry: ContentEntry): boolean {
        return this.expandedEntries.has(entry);
    }

    toggleEntry(entry: ContentEntry): void {
        if (this.expandedEntries.has(entry)) {
            this.expandedEntries.delete(entry);
        } else {
            this.expandedEntries.add(entry);
        }
    }

    trackByEntry(_index: number, entry: ContentEntry): number {
        return entry.id;
    }

    trackByUsage(_index: number, usage: ContentUsage): string {
        return `${usage.partIndex}:${usage.path}`;
    }

    addEntry(kind: ContentKind = this.activeTab): void {
        const entry = createContent(this.song, kind);
        contentList(this.song, kind).push(entry);
        this.confirmedLabels.set(entry, entry.label);
        this.expandedEntries.add(entry);
        this.activeTab = kind;
        this.expanded = true;
        this.renameWarning = '';
        this.cdr.detectChanges();
    }

    duplicateEntry(kind: ContentKind, entry: ContentEntry): void {
        const copy = this.cloneEntry(kind, entry);
        copy.label = copyContentLabel(this.song, kind, entry.label);
        const list = contentList(this.song, kind);
        const index = list.indexOf(entry);
        list.splice(index === -1 ? list.length : index + 1, 0, copy);
        this.confirmedLabels.set(copy, copy.label);
        this.expandedEntries.add(copy);
        this.cdr.detectChanges();
    }

    onRenameInput(kind: ContentKind, entry: ContentEntry): void {
        const previous = this.confirmedLabels.get(entry) ?? '';
        if (entry.label === previous) {
            return;
        }
        if (isContentLabelAvailable(this.song, kind, entry.label, entry)) {
            this.confirmedLabels.set(entry, entry.label);
            this.renameWarning = '';
        }
    }

    onRenameBlur(kind: ContentKind, entry: ContentEntry): void {
        const attempted = entry.label;
        const previous = this.confirmedLabels.get(entry) ?? '';
        if (isContentLabelAvailable(this.song, kind, attempted, entry)) {
            entry.label = attempted.trim();
            this.confirmedLabels.set(entry, entry.label);
            return;
        }
        entry.label = previous;
        this.renameWarning =
            attempted.trim() === ''
                ? `A ${kindDisplayName(kind).toLowerCase()} needs a name.`
                : `${kindDisplayName(kind)} '${attempted}' already exists.`;
    }

    usageCount(kind: ContentKind, entry: ContentEntry): number {
        return contentUsages(this.song, kind, entry).length;
    }

    usageTooltip(kind: ContentKind, entry: ContentEntry): string {
        const usages = contentUsages(this.song, kind, entry);
        if (usages.length === 0) {
            return 'Not used by any block';
        }
        return usages.map(usage => `${usage.partName} · ${this.blockName(usage)}`).join(', ');
    }

    usageLabel(usage: ContentUsage): string {
        return `${usage.partName} · ${this.blockName(usage)}`;
    }

    requestDelete(kind: ContentKind, entry: ContentEntry): void {
        const usages = contentUsages(this.song, kind, entry);
        if (usages.length === 0) {
            removeContent(this.song, kind, entry);
            this.forgetEntry(entry);
            this.cdr.detectChanges();
            return;
        }
        this.deleteKind = kind;
        this.deleteCandidate = entry;
        this.deleteUsages = usages;
        this.deleteVisible = true;
    }

    confirmDelete(): void {
        if (this.deleteCandidate && this.deleteKind) {
            removeContent(this.song, this.deleteKind, this.deleteCandidate);
            this.forgetEntry(this.deleteCandidate);
        }
        this.cancelDelete();
        this.cdr.detectChanges();
    }

    cancelDelete(): void {
        this.deleteVisible = false;
        this.deleteKind = null;
        this.deleteCandidate = null;
        this.deleteUsages = [];
    }

    /** Expande el panel, cambia a la pestaña y resalta la entrada indicada. */
    focusContent(kind: ContentKind, label: string): void {
        this.expanded = true;
        this.activeTab = kind;
        const entry = findContent(this.song, kind, label);
        if (entry) {
            this.expandedEntries.add(entry);
        }
        this.highlightedEntry = entry ?? null;
        this.cdr.detectChanges();
        if (this.highlightTimer !== null) {
            clearTimeout(this.highlightTimer);
        }
        this.highlightTimer = setTimeout(() => {
            this.highlightedEntry = null;
            this.cdr.detectChanges();
        }, 1600);
    }

    isHighlighted(entry: ContentEntry): boolean {
        return this.highlightedEntry === entry;
    }

    private resetState(): void {
        this.expandedEntries = new Set();
        this.confirmedLabels = new Map();
        this.renameWarning = '';
        this.highlightedEntry = null;
    }

    private registerLabels(): void {
        this.melodies.forEach(melody => this.confirmedLabels.set(melody, melody.label));
        this.presets.forEach(preset => this.confirmedLabels.set(preset, preset.label));
        this.procedures.forEach(procedure => this.confirmedLabels.set(procedure, procedure.label));
    }

    private forgetEntry(entry: ContentEntry): void {
        this.confirmedLabels.delete(entry);
        this.expandedEntries.delete(entry);
        if (this.highlightedEntry === entry) {
            this.highlightedEntry = null;
        }
    }

    private cloneEntry(kind: ContentKind, entry: ContentEntry): ContentEntry {
        switch (kind) {
            case 'melody':
                return (entry as Melody).clone();
            case 'preset':
                return (entry as Preset).clone();
            case 'procedure':
                return (entry as Procedure).clone();
        }
    }

    private blockName(usage: ContentUsage): string {
        return usage.blockLabel.trim() !== '' ? usage.blockLabel : 'Unnamed block';
    }
}
