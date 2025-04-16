import { Component, OnInit, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, OnDestroy, OnChanges, SimpleChanges, QueryList, ViewChildren } from '@angular/core';
import { NoteData } from '../../model/note';
import { parseBlockNotes } from '../../model/ohm.parser';
import { MelodyEditorService } from '../../services/melody-editor.service';
import { MusicElement, NoteDuration, SingleNote, CompositeNote, GenericGroup } from '../../model/melody';
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
 * Interfaz para elementos visuales en el editor de melodías
 */
interface VisualElement {
  id: string; // ID único para selección/trackBy (nota original o generado para marcador)
  type: 'note' | 'rest' | 'arpeggio' | 'chord' | 'group-start' | 'group-end';
  originalElement: MusicElement; // Referencia al elemento original
  // Propiedades específicas para renderizado (opcional)
  duration?: NoteDuration;
  value?: number | null;
  children?: VisualElement[]; // Solo para tipos compuestos, si decidimos mantener algo de jerarquía visual
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
  visualElements: VisualElement[] = [];
  selectedId: string | null = null;
  private elementsSub!: Subscription;
  private selectedIdSub!: Subscription;
  private lastEmittedNotesString: string | null = null;
  expandedGroups = new Set<string>();
  readonly durations: NoteDuration[] = ['1n', '2n', '4n', '8n', '16n', '4t', '8t'];
  private lastWheelTime: number = 0;
  private readonly wheelThrottleDelay: number = 150;

  constructor(
    private melodyEditorService: MelodyEditorService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['notes']) {
      const change = changes['notes'];
      const newNotes = change.currentValue as string | null ?? ''; // Ensure it's a string

      if (change.firstChange || newNotes !== this.lastEmittedNotesString) {
        this.lastEmittedNotesString = null; 
        this.loadNotesFromString(newNotes);
      } else {
        // console.log(`[MelodyEditor] ngOnChanges: Skipping reload.`);
      }
    }
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
      console.error('[MelodyEditor] Error parsing notes in loadNotesFromString:', notesString, e);
    }
  }

  ngAfterViewInit(): void {
    this.loadNotesFromString(this.notes);

    this.elementsSub = this.melodyEditorService.elements$.subscribe(elements => {
      this.elements = elements;
      this.visualElements = this.flattenElements(elements); 

      if (this.selectedId) {
          const visualEl = this.visualElements.find(ve => ve.id === this.selectedId);
          this.focusedElement = visualEl ? visualEl.originalElement : null;
      } else {
          this.focusedElement = null;
      }

      this.cdr.detectChanges();
    });

    this.selectedIdSub = this.melodyEditorService.selectedElementId$.subscribe(id => {
      this.selectedId = id;
      const visualEl = this.visualElements.find(ve => ve.id === id);
      this.focusedElement = visualEl ? visualEl.originalElement : null; 

      this.cdr.detectChanges(); 
      
      if (id) {
          this.scrollToElement(id);
      }
    });
    
    this.editorContainer?.nativeElement.focus();
  }

  private scrollToElement(elementId: string): void {
    // Use setTimeout 0 to run after current cycle, hoping DOM is stable
    setTimeout(() => {
        console.log(`[MelodyEditor] scrollToElement called for ID: ${elementId}`);
        const visualEl = this.visualElements.find(ve => ve.id === elementId);
        const componentId = visualEl?.originalElement.id;
        const visualType = visualEl?.type;

        if (!componentId) {
             console.warn(`[MelodyEditor] scrollToElement: Could not find original component ID for visual ID ${elementId}. Focusing container.`);
             this.editorContainer?.nativeElement?.focus({ preventScroll: true }); 
             return; 
        }

        let targetElement: HTMLElement | null = null;

        // Find the DOM element to focus
        if (visualType === 'group-start' || visualType === 'group-end') {
             // Find the span marker directly using the visual element ID (which includes _start/_end)
             targetElement = this.elementRef.nativeElement.querySelector(`[data-element-id="${elementId}"]`);
             console.log(`[MelodyEditor] scrollToElement: Found group marker element?`, targetElement);
        } else {
            // Find the component instance first for notes/rests/chords/arpeggios
            const allComponents = [...this.noteComponents.toArray(), ...this.groupComponents.toArray()];
            const targetComponent = allComponents.find(comp => comp.note?.id === componentId);
            if (targetComponent) {
                targetElement = targetComponent.elementRef.nativeElement;
                console.log(`[MelodyEditor] scrollToElement: Found component instance element?`, targetElement);
            }
        }

        if (targetElement) {
            // Scroll into view
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            
            // Attempt to focus the found element
            try {
                 if (!targetElement.hasAttribute('tabindex')) {
                     targetElement.setAttribute('tabindex', '-1'); 
                 }
                 console.log(`[MelodyEditor] scrollToElement: Calling focus() on element for ID: ${elementId}`);
                 targetElement.focus({ preventScroll: true });

                 // Verify focus AFTER the call
                 if (document.activeElement === targetElement) {
                     console.log(`[MelodyEditor] scrollToElement: Focus successful on element ${elementId}.`);
                 } else {
                      console.warn(`[MelodyEditor] scrollToElement: Focus call did not result in active element ${elementId}. Falling back to container.`);
                      this.editorContainer?.nativeElement?.focus({ preventScroll: true });
                 }
            } catch (e) {
                console.error("[MelodyEditor] Error focusing target element:", e);
                this.editorContainer?.nativeElement?.focus({ preventScroll: true });
            }
        } else {
             console.warn(`[MelodyEditor] scrollToElement: Could not find target DOM element for ID: ${elementId} to focus. Focusing container.`);
             this.editorContainer?.nativeElement?.focus({ preventScroll: true });
        }
    }, 0); 
  }

  private flattenElements(elements: MusicElement[]): VisualElement[] {
    let flatList: VisualElement[] = [];
    elements.forEach(element => {
      if (element.type === 'group') {
        const group = element as GenericGroup;
        flatList.push({
          id: `${group.id}_start`, 
          type: 'group-start',
          originalElement: group,
          duration: group.duration
        });
        flatList = flatList.concat(this.flattenElements(group.children || []));
        flatList.push({
          id: `${group.id}_end`,
          type: 'group-end',
          originalElement: group
        });
      } else if (element.type === 'arpeggio' || element.type === 'chord'){
          flatList.push({
              id: element.id,
              type: element.type,
              originalElement: element
          });
      } else { // note or rest
        flatList.push({
          id: element.id,
          type: element.type,
          originalElement: element
        });
      }
    });
    return flatList;
  }
  
  selectElement(id: string | null): void {
     this.melodyEditorService.selectNote(id);
  }

  onNoteClick(element: MusicElement): void {
    this.selectElement(element.id);
  }
  
  onMarkerClick(group: GenericGroup, markerType: 'start' | 'end', event: MouseEvent): void {
      event.stopPropagation(); 
      const markerId = `${group.id}_${markerType}`;
      this.selectElement(markerId);
  }
  
  private moveFocus(direction: number): void {
    const currentIndex = this.visualElements.findIndex(ve => ve.id === this.selectedId);
    if (currentIndex === -1 && this.visualElements.length > 0) {
      const newIndex = direction > 0 ? 0 : this.visualElements.length - 1;
      this.selectElement(this.visualElements[newIndex].id);
    } else if (currentIndex !== -1) {
      const newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < this.visualElements.length) {
        this.selectElement(this.visualElements[newIndex].id);
      } else {
          // Opcional: Mantener selección si estamos en los bordes
          // this.selectElement(this.selectedId); 
      }
    }
  }

  @HostListener('keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    console.log('RAW Keydown Event:', { key: event.key, code: event.code, shiftKey: event.shiftKey });
    if (event.repeat) return;

    if (['Insert', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', ' ', '(', ')'].includes(event.key)) {
      event.preventDefault();
    }
    
    if (event.key === '(') {
      console.log('Calling startNewGroup...');
      this.startNewGroup();
      return; 
    } else if (event.key === ')') {
      console.log('Cerrar grupo (pendiente)');
      return; 
    }
    
    if (!this.selectedId) {
        if (event.key === 'Insert') this.insertNote();
        return;
    }
    
    const selectedVisualElement = this.visualElements.find(ve => ve.id === this.selectedId);
    if (!selectedVisualElement) return; 
    const originalElement = selectedVisualElement.originalElement;
    if (!originalElement) return;

    if (event.shiftKey) { // Shift + Tecla
        if (event.key === 'ArrowUp') {
            this.increaseDuration(originalElement.id);
            return;
        } else if (event.key === 'ArrowDown') {
            this.decreaseDuration(originalElement.id);
            return;
        }

        if ((selectedVisualElement.type === 'group-start' || selectedVisualElement.type === 'group-end') && 
            (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) 
        {
            const groupId = originalElement.id;
            const markerId = selectedVisualElement.id; // Store ID before move

            if (selectedVisualElement.type === 'group-start') {
                if (event.key === 'ArrowLeft') this.melodyEditorService.moveGroupStartLeft(groupId);
                else this.melodyEditorService.moveGroupStartRight(groupId);
            } else { // group-end
                if (event.key === 'ArrowLeft') this.melodyEditorService.moveGroupEndLeft(groupId);
                else this.melodyEditorService.moveGroupEndRight(groupId);
            }
            // Re-select the marker after the operation
            this.selectElement(markerId);
            this.emitNotesChange(); // Moving groups changes structure
            return; 
        }
        
        if (event.key === 'ArrowLeft') {
            this.melodyEditorService.moveElementLeft(originalElement.id);
            this.selectElement(originalElement.id); // Re-select element
            this.emitNotesChange(); // Moving elements changes structure
        } else if (event.key === 'ArrowRight') {
            this.melodyEditorService.moveElementRight(originalElement.id);
            this.selectElement(originalElement.id); // Re-select element
            this.emitNotesChange(); // Moving elements changes structure
        }

        if (event.key === ' ') { 
            event.preventDefault(); // Prevent default space behavior (scrolling)
            if (this.focusedElement && (this.focusedElement.type === 'note' || this.focusedElement.type === 'rest')) {
                 console.log(`[MelodyEditor] Setting duration to undefined for ${this.focusedElement.id}`);
                 // We need the updateNote method from the service
                 this.melodyEditorService.updateNote(this.focusedElement.id, { duration: undefined });
                 this.emitNotesChange();
                 return; // Action handled
            }
        }

    } else { // Tecla sin Shift
        switch (event.key) {
            case 'Insert':
              this.insertNote(); 
              break;
            case 'ArrowLeft':
                this.moveFocus(-1);
                break;
            case 'ArrowRight':
                this.moveFocus(1);
                break;
            case 'ArrowUp':
                if (originalElement.type === 'note' || originalElement.type === 'rest') {
                  this.increaseNote();
                }
                break;
            case 'ArrowDown':
                if (originalElement.type === 'note' || originalElement.type === 'rest') {
                  this.decreaseNote();
                }
                break;
            case 'Delete':
              this.deleteNote();
              break;
            case ' ': 
              this.toggleSilence(originalElement.id);
              break;
        }
    }
  }

  private startNewGroup(): void {
      const currentSelectedVisualId = this.selectedId;
      const defaultDuration: NoteDuration = '4n';
      const newGroupId = this.melodyEditorService.startGroup(defaultDuration, currentSelectedVisualId);
      this.selectElement(`${newGroupId}_start`);
  }
  
  private increaseDuration(elementId?: string): void {
      const targetId = elementId ?? this.focusedElement?.id;
      if (!targetId) return;
      const findElementRecursive = (id: string, els: MusicElement[]): MusicElement | null => {
          for (const el of els) {
              if (el.id === id) return el;
              if (el.type === 'group' && el.children) {
                  const found = findElementRecursive(id, el.children);
                  if (found) return found;
              } else if ((el.type === 'arpeggio' || el.type === 'chord') && el.notes) {
                  const found = findElementRecursive(id, el.notes);
                  if (found) return found;
              }
          }
          return null;
      };
      const currentElement = findElementRecursive(targetId, this.elements);
      if (!currentElement) return;

      const currentDuration = currentElement.duration;
      let newDuration: NoteDuration | undefined;

      if (currentDuration === undefined) {
          newDuration = this.durations[this.durations.length - 1];
      } else {
          const currentIndex = this.durations.indexOf(currentDuration);
          if (currentIndex === 0) {
              newDuration = undefined;
          } else if (currentIndex > 0) {
              newDuration = this.durations[currentIndex - 1];
          } else {
             newDuration = undefined;
          }
      }

      this.melodyEditorService.updateNote(targetId, { duration: newDuration });
      this.emitNotesChange();
  }

  private decreaseDuration(elementId?: string): void {
      const targetId = elementId ?? this.focusedElement?.id;
      if (!targetId) return;
      const findElementRecursive = (id: string, els: MusicElement[]): MusicElement | null => {
           for (const el of els) {
               if (el.id === id) return el;
               if (el.type === 'group' && el.children) {
                   const found = findElementRecursive(id, el.children);
                   if (found) return found;
               } else if ((el.type === 'arpeggio' || el.type === 'chord') && el.notes) {
                   const found = findElementRecursive(id, el.notes);
                   if (found) return found;
               } 
           }
           return null;
      };
      const currentElement = findElementRecursive(targetId, this.elements);
      if (!currentElement) return;

      const currentDuration = currentElement.duration;
      let newDuration: NoteDuration | undefined;

      if (currentDuration === undefined) {
          newDuration = this.durations[0];
      } else {
          const currentIndex = this.durations.indexOf(currentDuration);
          if (currentIndex === this.durations.length - 1) {
              newDuration = undefined;
          } else if (currentIndex >= 0 && currentIndex < this.durations.length - 1) {
              newDuration = this.durations[currentIndex + 1];
          } else {
              newDuration = undefined;
          }
      }

      this.melodyEditorService.updateNote(targetId, { duration: newDuration });
      this.emitNotesChange();
  }
  
  private emitNotesChange(): void {
    const noteData = this.melodyEditorService.toNoteData();
    const stringArray = NoteData.toStringArray(noteData);
    this.lastEmittedNotesString = stringArray; 
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

  trackByElementId(index: number, element: MusicElement): string {
    return element.id; 
  }

  private increaseNote(): void {
    if (!this.focusedElement || (this.focusedElement.type !== 'note' && this.focusedElement.type !== 'rest')) return;
    this.updateNoteValue(this.focusedElement, (this.focusedElement.value ?? -1) + 1); 
  }
  
  onEditorClick(event: MouseEvent) {
    const clickedInsideNote = (event.target as HTMLElement).closest('app-melody-note, app-melody-group, .group-marker');
    if (!clickedInsideNote) {
      this.melodyEditorService.selectNote(null);
    }
    const editorElement = this.editorContainer?.nativeElement; 
    if (editorElement) {
      editorElement.focus();
    }
  }

  private decreaseNote(): void {
    if (!this.focusedElement || (this.focusedElement.type !== 'note' && this.focusedElement.type !== 'rest')) return;
    this.updateNoteValue(this.focusedElement, (this.focusedElement.value ?? 1) - 1); 
  }

  private updateNoteValue(note: MusicElement, newValue: number | null): void {
    if (note.type !== 'note' && note.type !== 'rest') return;
    let updatePayload: Partial<SingleNote>;
    if (newValue === null) {
        updatePayload = { type: 'rest', value: null }; 
    } else {
        updatePayload = { type: 'note', value: newValue };
    }
    this.melodyEditorService.updateNote(note.id, updatePayload);
    this.emitNotesChange();
  }

  private deleteNote(): void {
    if (!this.focusedElement || !this.selectedId) return;

    const selectedVisualElement = this.visualElements.find(ve => ve.id === this.selectedId);
    if (!selectedVisualElement) return; // Should not happen if selectedId is valid

    // --- Check if deleting a group marker --- 
    if (selectedVisualElement.type === 'group-start' || selectedVisualElement.type === 'group-end') {
        const groupId = selectedVisualElement.originalElement.id;
        console.log(`[MelodyEditor] Deleting group via marker ${this.selectedId}. Group ID: ${groupId}`);
        this.melodyEditorService.removeGroupAndPromoteChildren(groupId);
        this.emitNotesChange(); // Emit change because structure changed
        // Focus/Selection is handled by the service method now
    } 
    // --- Handle deleting note/rest --- 
    else if (selectedVisualElement.originalElement.type === 'note' || selectedVisualElement.originalElement.type === 'rest') {
        const idToDelete = selectedVisualElement.originalElement.id;
        const visualIndex = this.visualElements.findIndex(ve => ve.id === this.selectedId);
        let nextIdToSelect: string | null = null;
        const oldVisualLength = this.visualElements.length;

        // Determine next selection ID before removing
        if (oldVisualLength > 1) {
            if (visualIndex > 0) {
                nextIdToSelect = this.visualElements[visualIndex - 1].id;
            } else { // Deleting the first element
                nextIdToSelect = this.visualElements[1].id; 
            }
        }
        
        console.log(`[MelodyEditor] Deleting note/rest ${idToDelete}. Selecting ${nextIdToSelect} next.`);
        this.melodyEditorService.removeNote(idToDelete); // Service removes the note
        this.melodyEditorService.selectNote(nextIdToSelect); // Service selects next/previous
        this.emitNotesChange(); // Emit change because data changed
        // Focus is handled by the service selection triggering scrollToElement
    } else {
         console.warn("[MelodyEditor] Delete called on unexpected element type:", selectedVisualElement.type, selectedVisualElement.originalElement.type);
    }
  }

  public toggleSilence(id?: string): void {
    const elementId = id || this.focusedElement?.id;
    if (!elementId) return;
    const findElementRecursive = (targetId: string, els: MusicElement[]): MusicElement | null => {
        for (const el of els) {
            if (el.id === targetId) return el;
            if (el.type === 'group' && el.children) {
                const found = findElementRecursive(targetId, el.children);
                if (found) return found;
            } else if ((el.type === 'arpeggio' || el.type === 'chord') && el.notes) {
                const found = findElementRecursive(targetId, el.notes);
                if (found) return found;
            }
        }
        return null;
    };
    const element = findElementRecursive(elementId, this.elements);
    if (!element) return;

    this.melodyEditorService.selectNote(element.id);

    if ((element.type === 'note' || element.type === 'rest') && element.value !== null) {
        this.updateNoteValue(element as SingleNote, null);
    } else if ((element.type === 'note' || element.type === 'rest') && element.value === null) {
         this.updateNoteValue(element as SingleNote, 0);
    }
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
    this.melodyEditorService.selectNote(id);
  }

  addNewNote(): void {
    this.insertNote();
  }

  changeDuration(id: string, delta: number): void {
    if (delta > 0) {
      this.increaseDuration(id);
    } else if (delta < 0) {
      this.decreaseDuration(id);
    }
  }

  changeNoteValue(id: string, delta: number): void {
    const findElementRecursive = (targetId: string, els: MusicElement[]): MusicElement | null => {
        for (const el of els) {
            if (el.id === targetId) return el;
            if (el.type === 'group' && el.children) {
                const found = findElementRecursive(targetId, el.children);
                if (found) return found;
            } else if ((el.type === 'arpeggio' || el.type === 'chord') && el.notes) {
                const found = findElementRecursive(targetId, el.notes);
                if (found) return found;
            }
        }
        return null;
    };
    const element = findElementRecursive(id, this.elements);
    if (!element || (element.type !== 'note' && element.type !== 'rest')) return;
    this.melodyEditorService.selectNote(id);
    this.updateNoteValue(element as SingleNote, (element.value ?? (delta > 0 ? -1 : 1)) + delta);
  }

  onWheel(event: WheelEvent, visualElement: VisualElement): void { 
    const now = Date.now();
    if (now - this.lastWheelTime < this.wheelThrottleDelay) {
      console.log("[MelodyEditor] onWheel throttled.");
      event.preventDefault(); 
      return; 
    } 
    this.lastWheelTime = now;
    console.log(`[MelodyEditor] onWheel fired. deltaY: ${event.deltaY}`); 
    event.preventDefault();
    this.selectElement(visualElement.id);
    const element = visualElement.originalElement;
    if (event.shiftKey) {
      // --- Throttle Duration Change Too ---
      const delta = event.deltaY > 0 ? 1 : -1;
      if (delta > 0) {
        this.decreaseDuration(element.id);
      } else {
        this.increaseDuration(element.id);
      }
      // -----------------------------------
    } else {
      if (element.type === 'note' || element.type === 'rest') {
        const delta = event.deltaY > 0 ? -1 : 1;
        const currentValue = element.value;
        const calculatedNewValue = (currentValue ?? (delta > 0 ? -1 : 1)) + delta;
        console.log(`[MelodyEditor] onWheel: Current: ${currentValue}, Delta: ${delta}, NewValue: ${calculatedNewValue}`);
        this.updateNoteValue(element, calculatedNewValue);
      }
    }
  }

  insertNote(): void {
    const baseNoteValue = 1; 
    const baseDuration: NoteDuration = '4n';
    const noteData = { value: baseNoteValue, duration: baseDuration, type: 'note' as 'note' };
    let newNoteId: string | null = null;
    if (this.focusedElement) {
        if (this.focusedElement.type === 'group') {
            console.log(`Insert note inside group ${this.focusedElement.id}`);
            newNoteId = this.melodyEditorService.addNoteToGroup(this.focusedElement.id, noteData);
        } else {
            console.log(`Insert note after element ${this.focusedElement.id}`);
            newNoteId = this.melodyEditorService.addNoteAfter(this.focusedElement.id, noteData);
        }
    } else {
        console.log('Insert note at the end');
        newNoteId = this.melodyEditorService.addNote(noteData);
    }
    console.log('New note ID:', newNoteId);
    if (newNoteId) {
        this.emitNotesChange(); 
    }
  }
}
