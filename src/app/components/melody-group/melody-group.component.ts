import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CompositeNote, MusicElement, NoteDuration } from '../../model/melody';
import { MelodyNoteComponent } from '../melody-note/melody-note.component';

@Component({
    selector: 'app-melody-group',
    template: `
        <div class="group-container" [class.selected]="isSelected">
            <div class="group-header" (click)="onClick()">
                <span class="group-type">{{ note.type }}</span>
                <span class="group-duration">{{ note.duration }}</span>
                <button class="expand-button" (click)="onToggleExpand($event)">
                    {{ isExpanded ? '▼' : '▶' }}
                </button>
            </div>
            <div class="group-content" *ngIf="isExpanded">
                <app-melody-note
                    *ngFor="let child of note.notes"
                    [note]="child"
                    [isSelected]="child.id === selectedNoteId"
                    (select)="onSelectChild(child.id)"
                    (toggleSilence)="onToggleSilence(child.id)"
                    (changeDuration)="onChangeChildDuration(child.id, $event)">
                </app-melody-note>
            </div>
        </div>
    `,
    styles: [`
        .group-container {
            border: 1px solid #ccc;
            border-radius: 4px;
            margin: 5px;
            background-color: white;
            
            &.selected {
                border-color: #2196F3;
                background-color: #E3F2FD;
            }
        }
        
        .group-header {
            display: flex;
            align-items: center;
            padding: 5px;
            cursor: pointer;
            background-color: #f5f5f5;
            border-bottom: 1px solid #eee;
            
            &:hover {
                background-color: #eee;
            }
        }
        
        .group-type {
            font-weight: bold;
            margin-right: 10px;
        }
        
        .group-duration {
            color: #666;
            margin-right: 10px;
        }
        
        .expand-button {
            margin-left: auto;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0 5px;
        }
        
        .group-content {
            padding: 5px;
            display: flex;
            flex-wrap: wrap;
        }
    `]
})
export class MelodyGroupComponent {
    @Input() note!: CompositeNote;
    @Input() isSelected = false;
    @Input() isExpanded = false;
    @Input() selectedNoteId?: string;
    @Input() expandedGroups = new Set<string>();
    
    @Output() select = new EventEmitter<string>();
    @Output() toggleExpand = new EventEmitter<string>();
    @Output() changeDuration = new EventEmitter<number>();
    @Output() toggleSilence = new EventEmitter<string>();
    @Output() changeChildDuration = new EventEmitter<{ id: string; delta: number }>();
    
    onClick(): void {
        this.select.emit(this.note.id);
    }
    
    onToggleExpand(event: Event): void {
        event.stopPropagation();
        this.toggleExpand.emit(this.note.id);
    }
    
    onSelectChild(id: string): void {
        this.select.emit(id);
    }
    
    onToggleChildExpand(id: string): void {
        this.toggleExpand.emit(id);
    }
    
    onChangeChildDuration(id: string, delta: number): void {
        this.changeChildDuration.emit({ id, delta });
    }
    
    onToggleSilence(id: string): void {
        this.toggleSilence.emit(id);
    }
    
    isChildExpanded(id: string): boolean {
        return this.expandedGroups.has(id);
    }
} 