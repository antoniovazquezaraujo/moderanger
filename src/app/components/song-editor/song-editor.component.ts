import { Component, HostListener, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Keyboard } from 'src/app/model/keyboard';
import { Part } from 'src/app/model/part';
import { Player } from 'src/app/model/player';
import { Song } from 'src/app/model/song';
import { SongPlayer } from 'src/app/model/song.player';
import { start } from 'tone';

type TabType = 'variables' | 'text';

@Component({
    selector: 'app-song-editor',
    templateUrl: './song-editor.component.html',
    styleUrls: ['./song-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongEditorComponent implements OnInit {
    @HostListener('window:keyup', ['$event'])
    keyUpEvent(event: KeyboardEvent) {
        this.keyboard.onKeyUp(event.key);
    }

    @HostListener('window:keydown', ['$event'])
    keyDownEvent(event: KeyboardEvent) {
        this.keyboard.onKeyDown(event.key);
    }

    public song: Song;
    public keyboard: Keyboard;
    public activeTab: TabType = 'variables';
    songAsText: string = '';
    songPlayer: SongPlayer;

    constructor(private cdr: ChangeDetectorRef) {
        this.songPlayer = new SongPlayer();
        this.keyboard = new Keyboard(this.songPlayer);
        this.song = new Song();
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.writeSong();
            this.cdr.detectChanges();
        });
    }

    setActiveTab(tab: TabType, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.activeTab = tab;
        this.cdr.detectChanges();
    }

    private getCircularReplacer() {
        const seen = new WeakSet();
        return (key: any, value: any) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    return;
                }
                seen.add(value);
            }
            return value;
        };
    }

    async playSong() {
        await start();
        this.songPlayer.playSong(this.song);
    }

    readSong() {
        try {
            const parsedData = JSON.parse(this.songAsText);
            this.song = new Song(parsedData);
            setTimeout(() => {
                this.cdr.detectChanges();
            });
        } catch (error) {
            console.error('Error parsing song:', error);
        }
    }

    writeSong() {
        try {
            this.songAsText = JSON.stringify(this.song, null, 2);
        } catch (error) {
            console.error('Error serializing song:', error);
        }
    }

    async stop() {
        this.songPlayer.stop();
    }

    playPart(part: Part): void {
        this.songPlayer.playPart(part, new Player(3), this.song);
    }
}