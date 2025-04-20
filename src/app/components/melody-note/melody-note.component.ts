import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { SingleNote, NoteDuration } from '../../model/melody';

@Component({
    selector: 'app-melody-note',
    template: `
        <div class="note-item" [class.selected]="isSelected" (click)="onClick()">
            <div class="note-visual" (wheel)="onWheelValue($event)">
                <span class="note-value" [class.silence]="note.value === null">
                    {{ note.value === null ? 'x' : note.value }}
                </span>
            </div>
            <div class="note-duration" (wheel)="onWheelDuration($event)">
                <span class="duration-value">{{ note.duration  }}</span>
            </div>
        </div>
    `,
    styles: [`
        .note-item {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            margin: 0 2px;
            padding: 2px 4px;
            border: 1px solid #ccc;
            border-radius: 2px;
            cursor: pointer;
            background-color: white;
            min-width: 40px;
            
            &:hover {
                background-color: #f0f0f0;
            }
            
            &.selected {
                border-color: #2196F3;
                background-color: #E3F2FD;
            }
        }
        
        .note-visual {
            cursor: ns-resize;
            padding: 0;
            margin-right: 4px;
            
            .note-value {
               font-size: 1.2em; 
               font-weight: bold;
            }
            .silence {
                color: #666;
            }
        }
        
        .note-duration {
            font-size: 0.8em;
            color: #666;
            cursor: ns-resize;
            padding: 0 2px;
            text-align: right;
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
    
    constructor(public elementRef: ElementRef) {}
    
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