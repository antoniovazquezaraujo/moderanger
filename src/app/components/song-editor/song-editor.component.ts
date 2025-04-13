import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Input } from '@angular/core';
import { Song } from 'src/app/model/song';

@Component({
    selector: 'app-song-editor',
    templateUrl: './song-editor.component.html',
    styleUrls: ['./song-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongEditorComponent implements OnInit {
    @Input() song: Song = new Song();

    constructor(
        private cdr: ChangeDetectorRef
    ) {
    }

    ngOnInit(): void {
        this.cdr.detectChanges();
    }
}