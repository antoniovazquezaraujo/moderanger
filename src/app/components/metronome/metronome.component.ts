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
            gap: 10px;
            padding: 10px;
            background: #2a2a2a;
            border-radius: 4px;
            margin: 10px 0;
        }
        .beat {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            transition: all 0.1s ease;
        }
        .beat.active {
            color: #fff;
            transform: scale(1.2);
        }
    `]
})
export class MetronomeComponent implements OnInit, OnDestroy {
    beats = [0, 1, 2, 3];
    currentBeat: number = -1;
    private subscription?: Subscription;

    constructor(private songPlayer: SongPlayer) {}

    ngOnInit() {
        this.subscription = this.songPlayer.metronome$.subscribe(beat => {
            this.currentBeat = beat;
        });
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
} 