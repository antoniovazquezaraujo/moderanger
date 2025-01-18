import { Component, OnInit, OnDestroy } from '@angular/core';
import { SongPlayer } from '../../model/song.player';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-metronome',
    template: `
        <div class="metronome">
            <div class="beat" *ngFor="let beat of beats" 
                 [class.active]="beat === currentBeat">
                ●
            </div>
        </div>
    `,
    styles: [`
        .metronome {
            display: flex;
            gap: 4px;
            padding: 10px;
            background: white;
            border-radius: 4px;
            margin: 10px 0;
            border: 1px solid #ddd;
        }
        .beat {
            width: 12px;
            height: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ccc;
            transition: all 0.1s ease;
            font-size: 10px;
        }
        .beat.active {
            color: #333;
            transform: scale(1.2);
        }
    `]
})
export class MetronomeComponent implements OnInit, OnDestroy {
    beats = Array.from({length: 32}, (_, i) => i);
    currentBeat: number = -1;
    private subscription?: Subscription;

    constructor(private songPlayer: SongPlayer) {}

    ngOnInit() {
        this.subscription = this.songPlayer.metronome$.subscribe((beat: number) => {
            this.currentBeat = beat;
        });
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
} 