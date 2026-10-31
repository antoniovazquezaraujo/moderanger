import { ChangeDetectionStrategy, Component, DoCheck, EventEmitter, Input, Output } from '@angular/core';
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
export class MrLivePanelComponent implements DoCheck {
    @Input() song!: Song;
    @Output() close = new EventEmitter<void>();
    @Output() edit = new EventEmitter<void>();

    text = '';
    error: string | null = null;

    ngDoCheck(): void {
        if (!this.song) {
            return;
        }
        try {
            const document = createDocumentFromContext(this.song, songToMrMeta(this.song));
            const next = serializeSong(document);
            if (next !== this.text) {
                this.text = next;
            }
            this.error = null;
        } catch (error) {
            this.error = error instanceof MrSerializeError ? error.message : String(error);
        }
    }

    requestEdit(): void {
        this.edit.emit();
    }

    requestClose(): void {
        this.close.emit();
    }
}
