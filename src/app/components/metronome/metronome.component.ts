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
        /* Default styles (for potential standalone use) */
        :host {
            display: inline-block; /* Changed to inline-block */
            vertical-align: middle; /* Align host vertically */
            line-height: 1; /* Prevent extra space */
        }
        .metronome {
            display: inline-flex; /* Changed to inline-flex for inline layout */
            gap: 2px; /* Reduced gap */
            padding: 0 5px; /* Minimal padding, adjust as needed */
            /* background: white; /* Remove background */
            /* border-radius: 4px; /* Remove border-radius */
            /* margin: 10px 0; /* Remove default margin */
            /* border: 1px solid #ddd; /* Remove border */
            height: 30px; /* Match button height */
            align-items: center; /* Center dots vertically */
        }
        .beat {
            width: 8px; /* Smaller dots */
            height: 8px; /* Smaller dots */
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ccc;
            transition: all 0.1s ease;
            font-size: 8px; /* Smaller font size */
            line-height: 8px; /* Match height */
        }
        .beat.active {
            color: #333;
            transform: scale(1.2);
        }
        
        /* Styles when used with .inline-metronome class */
        /* We can put specific inline styles here if needed, 
           but adjusting the base .metronome might be enough */
    `]
})
export class MetronomeComponent implements OnInit, OnDestroy {
    beats = Array.from({length: 32}, (_, i) => i);
    currentBeat: number = -1;
    private subscription?: Subscription;

    constructor(private songPlayer: SongPlayer) {}

    ngOnInit() {
        this.subscription = this.songPlayer.metronome$.subscribe((beat: number) => {
            this.currentBeat = beat % this.beats.length;
        });
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
} 