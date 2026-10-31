import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    NgZone,
    AfterViewInit,
    OnDestroy,
    OnInit,
    Output
} from '@angular/core';
import {
    createDocumentFromContext,
    MrSerializeError,
    serializeSong,
    songToMrMeta
} from 'src/app/model/mr';
import { Song } from 'src/app/model/song';

/**
 * Read-only live view of the canonical `.mr` text.
 *
 * It is a sibling of the editor content, not a modal: while open it stays
 * fixed on the right and refreshes after every model change. The advanced
 * editor (validate/apply/revert) remains available through the Edit action.
 */
@Component({
    selector: 'app-mr-live-panel',
    templateUrl: './mr-live-panel.component.html',
    styleUrls: ['./mr-live-panel.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MrLivePanelComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() song!: Song;
    @Output() close = new EventEmitter<void>();
    @Output() edit = new EventEmitter<void>();

    text = '';
    error: string | null = null;

    private pollId: ReturnType<typeof setInterval> | null = null;
    private viewReady = false;

    constructor(
        private readonly zone: NgZone,
        private readonly cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.refresh(false);
        // The editor mutates nested model objects from many child components;
        // polling keeps this read-only view live even when OnPush ancestors
        // are not marked for check by those mutations.
        this.zone.runOutsideAngular(() => {
            this.pollId = setInterval(() => this.refresh(), 250);
        });
    }

    ngAfterViewInit(): void {
        this.viewReady = true;
        this.refresh();
    }

    ngOnDestroy(): void {
        if (this.pollId !== null) {
            clearInterval(this.pollId);
            this.pollId = null;
        }
    }

    refresh(notify = true): void {
        if (!this.song) {
            return;
        }
        try {
            const document = createDocumentFromContext(this.song, songToMrMeta(this.song));
            const next = serializeSong(document);
            const error = null;
            if (next !== this.text || error !== this.error) {
                this.text = next;
                this.error = error;
                if (notify && this.viewReady) {
                    this.cdr.detectChanges();
                }
            }
        } catch (error) {
            const message = error instanceof MrSerializeError ? error.message : String(error);
            if (message !== this.error) {
                this.error = message;
                if (notify && this.viewReady) {
                    this.cdr.detectChanges();
                }
            }
        }
    }

    requestEdit(): void {
        this.edit.emit();
    }

    requestClose(): void {
        this.close.emit();
    }
}
