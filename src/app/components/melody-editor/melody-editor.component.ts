import { Component, OnInit, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, OnDestroy, OnChanges, SimpleChanges, QueryList, ViewChildren } from '@angular/core';
import { NoteData } from '../../model/note';
import { parseBlockNotes } from '../../model/ohm.parser';
import { MelodyEditorService } from '../../services/melody-editor.service';
import { MusicElement, NoteDuration, SingleNote, NoteGroup } from '../../model/melody';
import { Subscription } from 'rxjs';
import { MelodyNoteComponent } from '../melody-note/melody-note.component';
import { MelodyGroupComponent } from '../melody-group/melody-group.component';

/**
 * Interfaz para notas en el editor de melodías
 */
interface EditorNote {
  value: number | null;        // Valor de la nota (null = silencio)
  duration: string;            // Duración ('4n', '8n', etc.)
  isSelected?: boolean;        // Estado de selección
  groupStart?: boolean;        // Es inicio de grupo
  groupEnd?: boolean;          // Es fin de grupo
  groupLevel?: number;         // Nivel de grupo (para anidamiento)
  groupDuration?: string;      // Duración del grupo
}

/**
 * Componente editor de melodías
 * 
 * Permite crear y editar secuencias de notas musicales,
 * y agruparlas usando corchetes.
 */
@Component({
  selector: 'app-melody-editor',
  templateUrl: './melody-editor.component.html',
  styleUrls: ['./melody-editor.component.scss']
})
export class MelodyEditorComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() notes: string = '';
  @Input() showVariableIcon: boolean = true;
  @Output() notesChange = new EventEmitter<string>();
  @Output() toggleVariable = new EventEmitter<void>();
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  @ViewChildren(MelodyNoteComponent) noteComponents!: QueryList<MelodyNoteComponent>;
  @ViewChildren(MelodyGroupComponent) groupComponents!: QueryList<MelodyGroupComponent>;
  
  focusedElement: MusicElement | null = null;
  elements: MusicElement[] = [];
  selectedId: string | null = null;
  private elementsSub!: Subscription;
  private selectedIdSub!: Subscription;
  private lastEmittedNotesString: string | null = null;
  expandedGroups = new Set<string>();
  readonly durations: NoteDuration[] = ['1n', '2n', '4n', '8n', '16n', '4t', '8t'];
  
  constructor(
    private melodyEditorService: MelodyEditorService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // Subscription moved to ngAfterViewInit to ensure ViewChildren are available
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['notes']) {
      const change = changes['notes'];
      const newNotes = change.currentValue as string | null ?? ''; // Ensure it's a string

      // Avoid reloading if the change came from our own emission via the parent binding
      // Allow reload if it's the first change or the incoming value is different from the last emitted one
      if (change.firstChange || newNotes !== this.lastEmittedNotesString) {
         // console.log(`[MelodyEditor] ngOnChanges: Reloading needed. FirstChange: ${change.firstChange}, Incoming: '${newNotes}', LastEmitted: '${this.lastEmittedNotesString}'`);
        // Reset last emitted string since this is considered an external change
        this.lastEmittedNotesString = null; 
        this.loadNotesFromString(newNotes);
      } else {
        // console.log(`[MelodyEditor] ngOnChanges: Skipping reload. Incoming: '${newNotes}', LastEmitted: '${this.lastEmittedNotesString}'`);
      }
    }
  }

  private loadNotesFromString(notesString: string): void {
    try {
      // console.log(`[MelodyEditor] loadNotesFromString called with: '${notesString}'`);
      if (notesString) {
        const noteData = parseBlockNotes(notesString);
        this.melodyEditorService.loadFromNoteData(noteData);
      } else {
        this.melodyEditorService.loadFromNoteData([]); 
      }
    } catch (e) {
      console.error('[MelodyEditor] Error parsing notes in loadNotesFromString:', notesString, e);
    }
    // Focus logic might be handled by subscription now, but keep initial focus?
    /* setTimeout(() => { 
      if (this.elements.length > 0) {
        const lastElement = this.elements[this.elements.length - 1];
        this.focusedElement = lastElement;
        this.melodyEditorService.selectNote(lastElement.id);
      } else {
        this.focusedElement = null;
        this.melodyEditorService.selectNote(null);
      }
      this.cdr.detectChanges();
    }, 0); */
  }

  ngAfterViewInit(): void {
    // Initial load
    this.loadNotesFromString(this.notes);

    // Subscribe AFTER initial load AND view init
    this.elementsSub = this.melodyEditorService.elements$.subscribe(elements => {
      const previouslySelectedId = this.selectedId;
      this.elements = elements; // Update the component's element list

      // Re-evaluate focusedElement based on the NEW elements list and the CURRENT selectedId
      if (previouslySelectedId && !elements.some(e => e.id === previouslySelectedId)) {
          // Previously selected element is gone, selection state handled by selectedId$ sub
      } else if (previouslySelectedId) {
          this.focusedElement = this.elements.find(e => e.id === previouslySelectedId) || null;
      } else {
          this.focusedElement = null;
      }
      // We need to detect changes so the *ngFor updates *before* the selectedId$ sub tries to find the element
      this.cdr.detectChanges();
    });

    // Subscribe to selection changes
    this.selectedIdSub = this.melodyEditorService.selectedElementId$.subscribe(id => {
      this.selectedId = id;
      if (id) {
        this.focusedElement = this.elements.find(e => e.id === id) || null;
      } else {
        this.focusedElement = null; // Deselected
      }
      
      // Detect changes to update the template bindings ([isSelected])
      this.cdr.detectChanges(); 
      
      // After view updates, scroll the selected element into view
      if (id) {
          this.scrollToElement(id);
      }
    });
    
    // Set initial focus to the editor container if needed
    this.editorContainer?.nativeElement.focus();
  }

  private scrollToElement(elementId: string): void {
    // Use setTimeout to allow DOM to update after change detection
    setTimeout(() => {
        const allComponents = [...this.noteComponents.toArray(), ...this.groupComponents.toArray()];
        const targetComponent = allComponents.find(comp => comp.note?.id === elementId);

        if (targetComponent) {
            targetComponent.elementRef.nativeElement.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
         // Also ensure the main editor retains browser focus for keyboard events
        const editorElement = this.editorContainer?.nativeElement;
        if (editorElement && document.activeElement !== editorElement) {
             // editorElement.focus(); // Re-focus container if needed, might steal focus unexpectedly
        }
    }, 0);
  }

  @HostListener('keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.repeat) return;

    if (['Insert', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', ' '].includes(event.key)) {
      event.preventDefault();
    }
    
    switch (event.key) {
      case 'Insert':
        this.insertNote();
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
      case 'Delete':
      case ' ':
        if (!this.focusedElement) return;
        switch (event.key) {
          case 'ArrowLeft':
            this.moveFocus(-1);
            break;
          case 'ArrowRight':
            this.moveFocus(1);
            break;
          case 'ArrowUp':
            if (event.shiftKey) {
              this.increaseDuration();
            } else {
              this.increaseNote();
            }
            break;
          case 'ArrowDown':
            if (event.shiftKey) {
              this.decreaseDuration();
            } else {
              this.decreaseNote();
            }
            break;
          case 'Delete':
            this.deleteNote();
            break;
          case ' ': // Spacebar to toggle silence
            this.toggleSilence(this.focusedElement.id);
            break;
        }
        break;
    }
  }

  onWheel(event: WheelEvent, element: MusicElement): void {
    if (!element || element.type !== 'note') return;
    
    event.preventDefault();
    const note = element as SingleNote;

    // Select the note being interacted with
    this.melodyEditorService.selectNote(note.id);
    
    if (event.shiftKey) {
      const currentIndex = this.durations.indexOf(note.duration);
      const delta = event.deltaY > 0 ? 1 : -1;
      const newIndex = currentIndex + delta;
      
      if (newIndex >= 0 && newIndex < this.durations.length) {
        const newDuration = this.durations[newIndex];
        this.melodyEditorService.updateNote(note.id, { duration: newDuration });
        this.emitNotesChange();
      }
    } else {
      const delta = event.deltaY > 0 ? -1 : 1;
      this.updateNoteValue(note, (note.value ?? 0) + delta);
    }
  }

  onNoteClick(element: MusicElement): void {
    this.melodyEditorService.selectNote(element.id);
    // focusedElement will be updated via subscription
    this.emitNotesChange(); // Still useful?
  }

  onEditorClick(event: MouseEvent) {
    const clickedInsideNote = (event.target as HTMLElement).closest('app-melody-note, app-melody-group');
    if (!clickedInsideNote) {
      this.melodyEditorService.selectNote(null);
    }
    // Always ensure editor container has focus on click within editor
    const editorElement = this.editorContainer?.nativeElement; 
    if (editorElement) {
      editorElement.focus();
    }
  }

  private moveFocus(direction: number): void {
    const currentIndex = this.elements.findIndex(e => e.id === this.focusedElement?.id);
    if (currentIndex === -1 && this.elements.length > 0) {
      // If no focus, start from beginning/end based on direction
      const newIndex = direction > 0 ? 0 : this.elements.length - 1;
      this.melodyEditorService.selectNote(this.elements[newIndex].id);
    } else if (currentIndex !== -1) {
      const newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < this.elements.length) {
        this.melodyEditorService.selectNote(this.elements[newIndex].id);
      }
    }
    // No need to emitNotesChange here, selection handles update
  }

  private updateNoteValue(note: MusicElement, newValue: number | null): void {
    // Ensure we are working with a note or rest that can have its value/type changed
    if (note.type !== 'note' && note.type !== 'rest') return;

    let updatePayload: Partial<SingleNote>; // Use Partial<SingleNote> as expected by service
    
    if (newValue === null) {
        // Changing TO a rest
        updatePayload = { type: 'rest', value: null }; 
    } else {
        // Changing TO a note (or updating existing note value)
        updatePayload = { type: 'note', value: newValue };
    }
    
    // Update the note data only. Selection should persist.
    this.melodyEditorService.updateNote(note.id, updatePayload);
    this.emitNotesChange();
  }

  private increaseNote(): void {
    if (!this.focusedElement || (this.focusedElement.type !== 'note' && this.focusedElement.type !== 'rest')) return;
    // Pass the whole focusedElement, which is MusicElement
    this.updateNoteValue(this.focusedElement, (this.focusedElement.value ?? -1) + 1); 
  }

  private decreaseNote(): void {
    if (!this.focusedElement || (this.focusedElement.type !== 'note' && this.focusedElement.type !== 'rest')) return;
    // Pass the whole focusedElement, which is MusicElement
    this.updateNoteValue(this.focusedElement, (this.focusedElement.value ?? 1) - 1); 
  }

  private increaseDuration(): void {
    if (!this.focusedElement) return;
    const currentDuration = this.focusedElement.duration;
    const currentIndex = this.durations.indexOf(currentDuration);
    if (currentIndex > 0) {
      const newDuration = this.durations[currentIndex - 1];
      this.melodyEditorService.updateNote(this.focusedElement.id, { duration: newDuration });
      this.emitNotesChange();
    }
  }

  private decreaseDuration(): void {
    if (!this.focusedElement) return;
    const currentDuration = this.focusedElement.duration;
    const currentIndex = this.durations.indexOf(currentDuration);
    if (currentIndex < this.durations.length - 1) {
      const newDuration = this.durations[currentIndex + 1];
      this.melodyEditorService.updateNote(this.focusedElement.id, { duration: newDuration });
      this.emitNotesChange();
    }
  }

  insertNote(): void {
    const baseNoteValue = 1; // Default value
    const baseDuration: NoteDuration = '4n';

    let newNoteId: string | null = null;

    if (this.focusedElement) {
      newNoteId = this.melodyEditorService.addNoteAfter(this.focusedElement.id, {
        value: baseNoteValue,
        duration: baseDuration,
        type: 'note' // Explicitly type as note
      });
    } else {
      newNoteId = this.melodyEditorService.addNote({
        value: baseNoteValue,
        duration: baseDuration,
        type: 'note' // Explicitly type as note
      });
    }

    // Service now handles selection via selectNote(newNoteId)
    // The selectedId$ subscription will handle focusing the container and scrolling
    /*
    if (newNoteId) {
      this.melodyEditorService.selectNote(newNoteId);
      setTimeout(() => {
        const editorElement = this.editorContainer?.nativeElement;
        if (editorElement) {
          editorElement.focus();
        }
      }, 0);
    }
    */
  }

  private deleteNote(): void {
    if (!this.focusedElement) return;

    const idToDelete = this.focusedElement.id;
    const currentIndex = this.elements.findIndex(e => e.id === idToDelete);
    if (currentIndex === -1) return; // Should not happen if focusedElement is valid

    let nextIdToSelect: string | null = null;
    const oldLength = this.elements.length;

    if (oldLength > 1) {
      // Determine the ID of the element to select AFTER deletion
      if (currentIndex > 0) {
        // If not the first element, select the previous one
        nextIdToSelect = this.elements[currentIndex - 1].id;
      } else {
        // If the first element was deleted, select the next one (which will become the new first)
        nextIdToSelect = this.elements[1].id; 
      }
    } // If oldLength <= 1, nextIdToSelect remains null
    
    // Perform the deletion and selection
    this.melodyEditorService.removeNote(idToDelete);
    this.melodyEditorService.selectNote(nextIdToSelect); 
    
    // Emit the change after state modifications
    this.emitNotesChange();
  }

  toggleSilence(id?: string): void {
    const elementId = id || this.focusedElement?.id;
    if (!elementId) return;
    const element = this.elements.find(e => e.id === elementId);
    if (!element) return;

    // Ensure we select the note we are acting upon
    this.melodyEditorService.selectNote(element.id);

    if ((element.type === 'note' || element.type === 'rest') && element.value !== null) {
        this.updateNoteValue(element as SingleNote, null);
    } else if ((element.type === 'note' || element.type === 'rest') && element.value === null) {
         this.updateNoteValue(element as SingleNote, 0); // Restore to default value C4
    }
    // No emitNotesChange needed here? updateNoteValue calls it.
  }

  isGroupExpanded(id: string): boolean {
    return this.expandedGroups.has(id);
  }

  toggleGroup(id: string): void {
    if (this.expandedGroups.has(id)) {
      this.expandedGroups.delete(id);
    } else {
      this.expandedGroups.add(id);
    }
    this.melodyEditorService.selectNote(id); // Select group when toggling
  }

  addNewNote(): void {
    this.melodyEditorService.addNote();
    this.emitNotesChange();
  }

  changeDuration(id: string, delta: number): void {
    const element = this.elements.find(e => e.id === id);
    if (!element) return;
    this.melodyEditorService.selectNote(id);
    const currentIndex = this.durations.indexOf(element.duration);
    const newIndex = currentIndex + delta;
    if (newIndex >= 0 && newIndex < this.durations.length) {
      this.melodyEditorService.updateNote(id, { duration: this.durations[newIndex] });
      this.emitNotesChange();
    }
  }

  changeNoteValue(id: string, delta: number): void {
    const element = this.elements.find(e => e.id === id);
    if (!element || (element.type !== 'note' && element.type !== 'rest')) return;
    this.melodyEditorService.selectNote(id);
    this.updateNoteValue(element as SingleNote, (element.value ?? (delta > 0 ? -1 : 1)) + delta);
  }

  private emitNotesChange(): void {
    const noteData = this.melodyEditorService.toNoteData();
    const stringArray = NoteData.toStringArray(noteData);
    // Store the value *before* emitting to prevent self-triggered reloads
    this.lastEmittedNotesString = stringArray; 
    // console.log(`[MelodyEditor] Emitting notesChange: '${stringArray}'`);
    this.notesChange.emit(stringArray);
  }

  ngOnDestroy() {
    this.elementsSub?.unsubscribe();
    this.selectedIdSub?.unsubscribe();
  }

  onToggleVariable(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleVariable.emit();
  }

  // Add trackBy function
  trackByElementId(index: number, element: MusicElement): string {
    return element.id;
  }
}
