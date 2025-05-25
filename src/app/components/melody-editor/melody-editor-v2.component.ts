import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild, AfterViewInit } from '@angular/core';
import { MusicElement, NoteDuration } from '../../model/melody';
import { parseBlockNotes } from '../../model/ohm.parser';
import { MelodyEditorV2Service } from '../../features/melody/melody-editor-v2.service';
import { Subscription } from 'rxjs';
import { SongPlayer } from '../../model/song.player';

// Import specialized components
import { VisualElement } from './melody-display/melody-display.component';
import { KeyboardAction } from './melody-keyboard-handler/melody-keyboard-handler.component';
import { OperationResult } from './melody-operations/melody-operations.component';
import { MelodySelectionComponent } from './melody-selection/melody-selection.component';
import { MelodyOperationsComponent } from './melody-operations/melody-operations.component';

/**
 * 🎼 MelodyEditorV2Component - NEW ARCHITECTURE
 * 
 * SINGLE RESPONSIBILITY: Orchestration and coordination
 * - Coordinates between 4 specialized components
 * - Manages component communication and data flow
 * - Handles external API and integration points
 * - Provides backwards compatibility with existing interface
 * 
 * ARCHITECTURE:
 * ├── 🎨 MelodyDisplayComponent - Visual rendering
 * ├── ⌨️ MelodyKeyboardHandlerComponent - Keyboard events
 * ├── 🎯 MelodySelectionComponent - Selection management
 * └── 🔧 MelodyOperationsComponent - Business operations
 */
@Component({
  selector: 'app-melody-editor-v2',
  template: `
    <div class="melody-editor-v2" (click)="onEditorClick($event)">
      
      <!-- 🎯 Selection Manager (wraps everything for selection coordination) -->
      <app-melody-selection 
        [visualElements]="visualElements"
        [selectedElementId]="selectedElementId" 
        [elements]="elements"
        (selectionChange)="onSelectionChange($event)"
        #selectionManager>
        
        <!-- ⌨️ Keyboard Handler (wraps content for keyboard capture) -->
        <app-melody-keyboard-handler
          [selectedElementId]="selectedElementId"
          [visualElements]="visualElements"
          [elements]="elements"
          [defaultDuration]="defaultDuration"
          (keyboardAction)="onKeyboardAction($event)">
          
          <!-- 🎨 Display Component (renders the visual content) -->
          <app-melody-display
            [elements]="elements"
            [selectedElementId]="selectedElementId"
            [showVariableIcon]="showVariableIcon"
            [expandedGroups]="expandedGroups"
            (elementClick)="onElementClick($event)"
            (addNote)="onAddNote()">
          </app-melody-display>
          
        </app-melody-keyboard-handler>
        
      </app-melody-selection>
      
      <!-- 🔧 Operations Component (handles business logic) -->
      <app-melody-operations
        [elements]="elements"
        [selectedElementId]="selectedElementId"
        [defaultDuration]="defaultDuration"
        (operationResult)="onOperationResult($event)"
        (elementsChange)="onElementsChange()"
        #operationsManager>
      </app-melody-operations>
      
    </div>
  `,
  styles: [`
    .melody-editor-v2 {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: 60px;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px;
      background-color: white;
      position: relative;
    }

    .melody-editor-v2:focus-within {
      border-color: #2196F3;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    }

    /* Ensure child components take full width */
    :host ::ng-deep app-melody-selection,
    :host ::ng-deep app-melody-keyboard-handler,
    :host ::ng-deep app-melody-display {
      width: 100%;
    }
  `]
})
export class MelodyEditorV2Component implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  // ============= EXTERNAL INTERFACE (Same as original) =============
  @Input() notes: string = '';
  @Input() showVariableIcon: boolean = true;
  @Input() defaultDuration: NoteDuration = '4n';
  @Output() notesChange = new EventEmitter<string>();

  // ============= INTERNAL STATE =============
  elements: MusicElement[] = [];
  visualElements: VisualElement[] = [];
  selectedElementId: string | null = null;
  expandedGroups = new Set<string>();

  // ============= CHILD COMPONENT REFERENCES =============
  @ViewChild('selectionManager') selectionManager!: MelodySelectionComponent;
  @ViewChild('operationsManager') operationsManager!: MelodyOperationsComponent;

  // ============= SUBSCRIPTIONS =============
  private elementsSub!: Subscription;
  private selectedIdSub!: Subscription;
  private globalDurationSub!: Subscription;
  private lastEmittedNotesString: string | null = null;

  constructor(
    private melodyEditorService: MelodyEditorV2Service,
    private cdr: ChangeDetectorRef,
    private songPlayer: SongPlayer
  ) {}

  // ============= LIFECYCLE METHODS =============

  ngOnInit(): void {
    console.log(`[MelodyEditorV2] ngOnInit: Component initialized. defaultDuration: ${this.defaultDuration}`);
    
    // Subscribe to global duration changes
    this.globalDurationSub = this.songPlayer.globalDefaultDuration$.subscribe(duration => {
      if (this.defaultDuration !== duration) {
        console.log(`[MelodyEditorV2] Global default duration changed to ${duration}`);
        this.defaultDuration = duration;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['notes']) {
      const change = changes['notes'];
      const newNotes = change.currentValue as string | null ?? '';

      if (change.firstChange || newNotes !== this.lastEmittedNotesString) {
        this.lastEmittedNotesString = null;
        this.loadNotesFromString(newNotes);
      }
    }

    if (changes['defaultDuration']) {
      const newDuration = changes['defaultDuration'].currentValue;
      if (newDuration) {
        console.log(`[MelodyEditorV2] Input defaultDuration changed to: ${newDuration}`);
      }
    }
  }

  ngAfterViewInit(): void {
    this.loadNotesFromString(this.notes);
    this.setupServiceSubscriptions();
  }

  ngOnDestroy(): void {
    this.elementsSub?.unsubscribe();
    this.selectedIdSub?.unsubscribe();
    this.globalDurationSub?.unsubscribe();
  }

  // ============= SETUP METHODS =============

  private setupServiceSubscriptions(): void {
    // Subscribe to elements changes
    this.elementsSub = this.melodyEditorService.elements$.subscribe(elements => {
      console.log(`[MelodyEditorV2] Elements updated: ${elements.length} elements`);
      this.elements = elements;
      this.visualElements = this.flattenElements(elements);
      this.cdr.detectChanges();
    });

    // Subscribe to selection changes
    this.selectedIdSub = this.melodyEditorService.selectedElementId$.subscribe(id => {
      console.log(`[MelodyEditorV2] Selection changed to: ${id}`);
      this.selectedElementId = id;
      this.cdr.detectChanges();
    });
  }

  private loadNotesFromString(notesString: string): void {
    try {
      if (notesString) {
        const noteData = parseBlockNotes(notesString);
        this.melodyEditorService.loadFromNoteData(noteData);
      } else {
        this.melodyEditorService.loadFromNoteData([]);
      }
    } catch (e) {
      console.error('[MelodyEditorV2] Error parsing notes:', notesString, e);
    }
  }

  // ============= VISUAL PROCESSING =============

  private flattenElements(elements: MusicElement[]): VisualElement[] {
    const result: VisualElement[] = [];
    
    for (const element of elements) {
      if (element.type === 'group') {
        const group = element as any;
        
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
          value: element.type === 'note' || element.type === 'rest' ? (element as any).value : undefined
        });
      }
    }
    
    return result;
  }

  // ============= EVENT HANDLERS =============

  onElementClick(elementId: string): void {
    console.log(`[MelodyEditorV2] Element clicked: ${elementId}`);
    this.melodyEditorService.selectNote(elementId);
  }

  onSelectionChange(elementId: string | null): void {
    console.log(`[MelodyEditorV2] Selection change requested: ${elementId}`);
    this.melodyEditorService.selectNote(elementId);
  }

  onKeyboardAction(action: KeyboardAction): void {
    console.log(`[MelodyEditorV2] Keyboard action: ${action.type}`);
    
    // Handle focus movement directly (doesn't require operations component)
    if (action.type === 'move-focus') {
      this.selectionManager.moveFocus(action.direction!);
      return;
    }

    // Delegate other actions to operations component
    this.operationsManager.handleKeyboardAction(action);
  }

  onOperationResult(result: OperationResult): void {
    console.log(`[MelodyEditorV2] Operation result:`, result);
    
    // Handle selection changes from operations
    if (result.newSelectedId !== undefined) {
      this.melodyEditorService.selectNote(result.newSelectedId);
    }
    
    // Log operation results
    if (!result.success) {
      console.warn(`[MelodyEditorV2] Operation failed: ${result.message}`);
    }
  }

  onElementsChange(): void {
    console.log(`[MelodyEditorV2] Elements changed, emitting notes change`);
    this.emitNotesChange();
  }

  onAddNote(): void {
    console.log(`[MelodyEditorV2] Add note requested`);
    const result = this.operationsManager.addNewNote();
    this.onOperationResult(result);
  }

  onEditorClick(event: MouseEvent): void {
    // Check if click was on empty space (not on any note/element)
    const target = event.target as HTMLElement;
    const isEmptySpace = target.classList.contains('melody-editor-v2') || 
                        target.classList.contains('notes-container') ||
                        target.classList.contains('selection-manager');
    
    if (isEmptySpace) {
      console.log(`[MelodyEditorV2] Clicked on empty space, clearing selection`);
      this.melodyEditorService.selectNote(null);
    }
  }

  // ============= EXTERNAL API METHODS =============

  /**
   * Load melody from external source
   */
  public loadMelody(elements: MusicElement[]): void {
    console.log(`[MelodyEditorV2] loadMelody called with ${elements.length} elements`);
    this.melodyEditorService.loadElements(elements);
    this.cdr.detectChanges();
  }

  /**
   * Get current melody elements
   */
  public getCurrentMelody(): MusicElement[] {
    return this.melodyEditorService.getElements();
  }

  /**
   * Get component statistics for debugging
   */
  public getComponentStats(): any {
    return {
      elements: this.elements.length,
      visualElements: this.visualElements.length,
      selectedElementId: this.selectedElementId,
      expandedGroups: this.expandedGroups.size,
      hasSelection: !!this.selectedElementId,
      architecture: 'specialized-components'
    };
  }

  // ============= UTILITY METHODS =============

  private emitNotesChange(): void {
    // Convert to NoteData and then to string representation
    const noteDataArray = this.melodyEditorService.toNoteData();
    const notesString = noteDataArray.length > 0 ? JSON.stringify(noteDataArray) : '';
    if (notesString !== this.lastEmittedNotesString) {
      this.lastEmittedNotesString = notesString;
      this.notesChange.emit(notesString);
      console.log(`[MelodyEditorV2] Emitted notes change: ${notesString.substring(0, 50)}...`);
    }
  }

  toggleGroup(id: string): void {
    if (this.expandedGroups.has(id)) {
      this.expandedGroups.delete(id);
    } else {
      this.expandedGroups.add(id);
    }
  }

  isGroupExpanded(id: string): boolean {
    return this.expandedGroups.has(id);
  }
} 