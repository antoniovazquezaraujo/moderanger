import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { EXAMPLE_SONGS, ExampleSong } from 'src/app/model/examples';

export interface ExampleLoadRequest {
    example: ExampleSong;
    play: boolean;
}

/**
 * In-app gallery of complete, validated `.mr` songs. It is intentionally
 * presentational: the parent owns the song model and playback.
 */
@Component({
    selector: 'app-example-library',
    templateUrl: './example-library.component.html',
    styleUrls: ['./example-library.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExampleLibraryComponent {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() loadExample = new EventEmitter<ExampleLoadRequest>();

    readonly examples = EXAMPLE_SONGS;

    trackByExample(_index: number, example: ExampleSong): string {
        return example.id;
    }

    onVisibleChange(visible: boolean): void {
        this.visibleChange.emit(visible);
    }

    requestLoad(example: ExampleSong, play: boolean): void {
        this.loadExample.emit({ example, play });
    }
}
