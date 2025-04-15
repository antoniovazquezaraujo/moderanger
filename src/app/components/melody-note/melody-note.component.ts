import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { SingleNote, NoteDuration } from '../../model/melody';

@Component({
    selector: 'app-melody-note',
    template: `
        <div class="note-item" [class.selected]="isSelected" (click)="onClick()">
            <div class="note-visual" (click)="onToggleSilence($event)" (wheel)="onWheelValue($event)">
                <span class="note-value" [class.silence]="note.value === null">
                    {{ note.value === null ? 'x' : note.value }}
                </span>
            </div>
            <div class="note-duration" (wheel)="onWheelDuration($event)">
                <span class="duration-value">{{ note.duration ?? '-' }}</span>
            </div>
        </div>
    `,
    styles: [`
        .note-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin: 0 2px;
            padding: 2px;
            border: 1px solid #ccc;
            border-radius: 2px;
            cursor: pointer;
            background-color: white;
            min-width: 24px;
            
            &:hover {
                background-color: #f0f0f0;
            }
            
            &.selected {
                border-color: #2196F3;
                background-color: #E3F2FD;
            }
        }
        
        .note-visual {
            font-size: 1.2em;
            font-weight: bold;
            cursor: ns-resize;
            padding: 0 2px;
            
            .silence {
                color: #666;
            }
        }
        
        .note-duration {
            font-size: 0.8em;
            color: #666;
            cursor: ns-resize;
            padding: 0 2px;
        }
    `]
})
export class MelodyNoteComponent {
    @Input() note!: SingleNote;
    @Input() isSelected = false;
    
    @Output() select = new EventEmitter<void>();
    @Output() toggleSilence = new EventEmitter<void>();
    @Output() changeDuration = new EventEmitter<number>();
    @Output() changeValue = new EventEmitter<number>();
    
    onClick(): void {
        this.select.emit();
    }
    
    onToggleSilence(event: Event): void {
        event.stopPropagation();
        this.toggleSilence.emit();
    }
    
    onWheelDuration(event: WheelEvent): void {
        event.preventDefault();
        this.changeDuration.emit(event.deltaY > 0 ? 1 : -1);
    }

    onWheelValue(event: WheelEvent): void {
        event.preventDefault();
        this.changeValue.emit(event.deltaY > 0 ? -1 : 1);
    }
} 