import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { MusicElement, NoteDuration, SingleNote, GenericGroup } from '../../../model/melody';

/**
 * Interface for visual elements in the melody display
 */
export interface VisualElement {
  id: string;
  type: 'note' | 'rest' | 'arpeggio' | 'chord' | 'group-start' | 'group-end';
  originalElement: MusicElement;
  duration?: NoteDuration;
  value?: number | null;
  children?: VisualElement[];
}

/**
 * 🎨 MelodyDisplayComponent
 * 
 * SINGLE RESPONSIBILITY: Visual rendering and display logic
 * - Converts MusicElement[] to VisualElement[] for rendering
 * - Handles visual element display structure
 * - Manages expanded groups state
 * - Provides clean event emission for parent coordination
 */
@Component({
  selector: 'app-melody-display',
  template: `
    <div class="notes-container-wrapper">
      <!-- Variable icon -->
      <div class="variable-toggle-icon" *ngIf="showVariableIcon">$</div>
      
      <div class="notes-container">
        <!-- Visual elements -->
        <ng-container *ngFor="let element of visualElements; trackBy: trackByElementId">
          
          <!-- Simple note display -->
          <div *ngIf="element.type === 'note' || element.type === 'rest'"
               class="note-item"
               [class.selected]="element.id === selectedElementId"
               (click)="onElementClick(element.id)">
            <div class="note-visual">
              <span class="note-value" [class.silence]="element.value === null">
                {{ element.value === null ? 'x' : element.value }}
              </span>
            </div>
            <div class="note-duration">
              <span class="duration-value">{{ element.duration }}</span>
            </div>
          </div>
          
          <!-- Composite group display -->
          <div *ngIf="element.type === 'arpeggio' || element.type === 'chord'"
               class="group-item"
               [class.selected]="element.id === selectedElementId"
               (click)="onElementClick(element.id)">
            <span class="group-type">{{ element.type }}</span>
            <span class="group-duration">{{ element.duration }}</span>
          </div>

          <!-- Group markers -->
          <span *ngIf="element.type === 'group-start' || element.type === 'group-end'"
                class="group-marker" 
                [class.group-start-marker]="element.type === 'group-start'"
                [class.group-end-marker]="element.type === 'group-end'"
                [class.active-marker]="element.id === selectedElementId"
                (click)="onElementClick(element.id)">
            <span *ngIf="element.type === 'group-start'" class="group-duration">{{element.duration}}:</span>
            <span class="group-bracket">{{ element.type === 'group-start' ? '(' : ')' }}</span>
          </span>

        </ng-container>
        
        <!-- Add note button -->
        <div class="note-item add-note" (click)="onAddNote()" tabindex="0">
          <div class="note-visual">
            <span class="note-value">+</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notes-container-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .variable-toggle-icon {
      position: absolute;
      top: -8px;
      right: 4px;
      font-size: 0.8em;
      cursor: pointer;
      color: #666;
      z-index: 1;
    }

    .notes-container {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
      padding: 4px;
      min-height: 40px;
    }

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
    }

    .note-item:hover {
      background-color: #f0f0f0;
    }

    .note-item.selected {
      border-color: #2196F3;
      background-color: #E3F2FD;
    }

    .note-item.add-note {
      border: 2px dashed #ccc;
      justify-content: center;
      width: 30px;
      height: 30px;
    }

    .note-item.add-note:hover {
      border-color: #2196F3;
      background-color: #f0f8ff;
    }

    .note-visual {
      cursor: ns-resize;
      padding: 0;
      margin-right: 4px;
    }

    .note-visual .note-value {
      font-size: 1.2em;
      font-weight: bold;
    }

    .note-visual .silence {
      color: #666;
    }

    .note-duration {
      font-size: 0.8em;
      color: #666;
      cursor: ns-resize;
      padding: 0 2px;
      text-align: right;
    }

    .group-item {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      background-color: white;
      margin: 0 2px;
    }

    .group-item:hover {
      background-color: #f0f0f0;
    }

    .group-item.selected {
      border-color: #2196F3;
      background-color: #E3F2FD;
    }

    .group-type {
      font-weight: bold;
      margin-right: 8px;
    }

    .group-duration {
      font-size: 0.8em;
      color: #666;
    }

    .group-marker {
      display: inline-flex;
      align-items: center;
      padding: 2px 4px;
      margin: 0 2px;
      cursor: pointer;
      border-radius: 2px;
      transition: background-color 0.2s;
    }

    .group-marker:hover {
      background-color: #f0f0f0;
    }

    .group-marker.active-marker {
      background-color: #E3F2FD;
      border: 1px solid #2196F3;
    }

    .group-bracket {
      font-weight: bold;
      font-size: 1.2em;
      color: #333;
    }
  `]
})
export class MelodyDisplayComponent implements OnChanges {
  @Input() elements: MusicElement[] = [];
  @Input() selectedElementId: string | null = null;
  @Input() showVariableIcon: boolean = true;
  @Input() expandedGroups = new Set<string>();

  @Output() elementClick = new EventEmitter<string>();
  @Output() addNote = new EventEmitter<void>();

  visualElements: VisualElement[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['elements']) {
      this.visualElements = this.flattenElements(this.elements);
    }
  }

  // ============= VISUAL PROCESSING =============

  /**
   * Convert MusicElement[] to VisualElement[] for rendering
   */
  private flattenElements(elements: MusicElement[]): VisualElement[] {
    const result: VisualElement[] = [];
    
    for (const element of elements) {
      if (element.type === 'group') {
        const group = element as GenericGroup;
        
        // Add group start marker
        result.push({
          id: `${element.id}_start`,
          type: 'group-start',
          originalElement: element,
          duration: group.duration
        });
        
        // Add children elements recursively
        if (group.children) {
          result.push(...this.flattenElements(group.children));
        }
        
        // Add group end marker
        result.push({
          id: `${element.id}_end`,
          type: 'group-end',
          originalElement: element
        });
      } else {
        // Regular note, rest, arpeggio, or chord
        result.push({
          id: element.id,
          type: element.type as any,
          originalElement: element,
          duration: element.duration,
          value: element.type === 'note' || element.type === 'rest' ? (element as SingleNote).value : undefined
        });
      }
    }
    
    return result;
  }

  // ============= EVENT HANDLERS =============

  onElementClick(id: string): void {
    this.elementClick.emit(id);
  }

  onAddNote(): void {
    this.addNote.emit();
  }

  // ============= UTILITY METHODS =============

  trackByElementId(index: number, element: VisualElement): string {
    return element.id;
  }

  isGroupExpanded(id: string): boolean {
    return this.expandedGroups.has(id);
  }
} 