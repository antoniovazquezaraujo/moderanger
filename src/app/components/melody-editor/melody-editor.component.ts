import { Component, OnInit, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, OnDestroy, OnChanges, SimpleChanges, QueryList, ViewChildren } from '@angular/core';
import { NoteData } from '../../model/note';
import { parseBlockNotes } from '../../model/ohm.parser';
import { MelodyEditorService } from '../../services/melody-editor.service';
import { MusicElement, NoteDuration, SingleNote, CompositeNote, GenericGroup } from '../../model/melody';
import { Subscription } from 'rxjs';
import { MelodyNoteComponent } from '../melody-note/melody-note.component';
import { MelodyGroupComponent } from '../melody-group/melody-group.component';
import { SongPlayer } from '../../model/song.player';

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
  @Input() defaultDuration: NoteDuration = '4n';
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
  private globalDurationSub!: Subscription;
  expandedGroups = new Set<string>();
  readonly durations: NoteDuration[] = ['1n', '2n', '4n', '8n', '16n', '4t', '8t'];
  private lastWheelTime: number = 0;
  private readonly wheelThrottleDelay: number = 150;

  constructor(
    private melodyEditorService: MelodyEditorService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef,
    private songPlayer: SongPlayer
  ) {}

  ngOnInit(): void {
    // NO llamar al servicio desde aquí
    // this.melodyEditorService.setDefaultDuration(this.defaultDuration);
    console.log(`[MelodyEditor] ngOnInit: Component initialized. Input defaultDuration is: ${this.defaultDuration}`);
    // Subscribe to global duration changes
    this.globalDurationSub = this.songPlayer.globalDefaultDuration$.subscribe(duration => {
        if (this.defaultDuration !== duration) {
            console.log(`[MelodyEditor] ngOnInit: Global default duration changed to ${duration}, updating local.`);
            this.defaultDuration = duration;
            // We might need ChangeDetectorRef here if the change doesn't reflect immediately
            // this.cdr.detectChanges(); 
        }
    });
  }

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
    if (changes['defaultDuration']) {
      const newDuration = changes['defaultDuration'].currentValue;
      if (newDuration) {
        console.log(`[MelodyEditor] ngOnChanges: Input defaultDuration changed to: ${newDuration}`);
        // Eliminar la llamada al servicio, ya no gestiona el estado global
        // this.melodyEditorService.setDefaultDuration(newDuration);
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

      // Update focused element based on current selection ID
      // No longer call scrollToElement from here
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
      // Find the element in the *current* visual list just for immediate focusedElement update
      const visualEl = this.visualElements.find(ve => ve.id === id);
      this.focusedElement = visualEl ? visualEl.originalElement : null;

      this.cdr.detectChanges();
      // DO NOT call scrollToElement here
    });

    this.editorContainer?.nativeElement.focus();
  }

  private scrollToElement(elementId: string): void {
    const attemptScroll = (attempt = 1) => {
      console.log(`[MelodyEditor] scrollToElement attempt ${attempt} for ID: ${elementId}`);
      // Use the component's current visualElements state inside the attempt
      const visualEl = this.visualElements.find(ve => ve.id === elementId);
      const componentId = visualEl?.originalElement.id;
      const visualType = visualEl?.type;

      if (componentId) {
          // Found the visual element, proceed to find DOM element and focus
          let targetElement: HTMLElement | null = null;

          // Find the DOM element to focus
          if (visualType === 'group-start' || visualType === 'group-end') {
               targetElement = this.elementRef.nativeElement.querySelector(`[data-element-id="${elementId}"]`);
               console.log(`[MelodyEditor] scrollToElement: Found group marker element?`, targetElement);
          } else {
              const allComponents = [...this.noteComponents.toArray(), ...this.groupComponents.toArray()];
              const targetComponent = allComponents.find(comp => comp.note?.id === componentId);
              if (targetComponent) {
                  targetElement = targetComponent.elementRef.nativeElement;
                  console.log(`[MelodyEditor] scrollToElement: Found component instance element?`, targetElement);
              }
          }

          if (targetElement) {
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
              try {
                   if (!targetElement.hasAttribute('tabindex')) {
                       targetElement.setAttribute('tabindex', '-1');
                   }
                   targetElement.focus({ preventScroll: true });
                   // Verify focus AFTER the call
                   console.log('[MelodyEditor] Active element immediately after focus call:', document.activeElement);
                   if (document.activeElement !== targetElement) {
                        console.warn(`[MelodyEditor] scrollToElement: Focus call did not result in active element ${elementId} (Attempt ${attempt}). Falling back to container.`);
                        this.editorContainer?.nativeElement?.focus({ preventScroll: true });
                   } else {
                        console.log(`[MelodyEditor] scrollToElement: Focus successful on element ${elementId} (Attempt ${attempt}).`);
                   }
              } catch (e) {
                   console.error(`[MelodyEditor] Error focusing target element (Attempt ${attempt}):`, e);
                   this.editorContainer?.nativeElement?.focus({ preventScroll: true });
              }
          } else {
               console.warn(`[MelodyEditor] scrollToElement: Could not find target DOM element for ID: ${elementId} (Attempt ${attempt}). Focusing container.`);
               this.editorContainer?.nativeElement?.focus({ preventScroll: true });
          }
      } else {
        // Visual element not found in this.visualElements yet
        if (attempt < 3) { // Retry up to 2 times more (total 3 attempts)
          console.warn(`[MelodyEditor] scrollToElement: Could not find visual element for ID ${elementId} on attempt ${attempt}. Retrying...`);
          setTimeout(() => attemptScroll(attempt + 1), 50); // Wait 50ms before retrying
        } else {
          console.warn(`[MelodyEditor] scrollToElement: Could not find visual element for ID ${elementId} after ${attempt} attempts. Focusing container.`);
          this.editorContainer?.nativeElement?.focus({ preventScroll: true });
        }
      }
    };

    // Initial call wrapped in setTimeout(0) to wait for the current cycle
    setTimeout(() => attemptScroll(1), 0);
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
            this.emitNotesChange(); // Moving groups changes structure
            // Call scrollToElement after a short delay to allow DOM updates
            setTimeout(() => {
                 if (this.selectedId === markerId) { // Optional: Check if selection is still the same
                    this.scrollToElement(markerId);
                 }
            }, 0);
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

        // --- Shift + Space: Assign parent group duration if inside a group ---
        if (event.key === ' ') { 
            event.preventDefault(); 
            // Use originalElement derived from selectedId, not this.focusedElement
            if (originalElement && (originalElement.type === 'note' || originalElement.type === 'rest')) {
                const elementId = originalElement.id;
                const parentGroup = this.findParentGroup(elementId, this.elements);
                
                if (parentGroup && parentGroup.duration) {
                    console.log(`[MelodyEditor] Shift+Space (in group ${parentGroup.id}): Setting duration to parent's duration (${parentGroup.duration}) for ${elementId}`);
                    this.melodyEditorService.updateNote(elementId, { duration: parentGroup.duration });
                    this.emitNotesChange();
                } else if (parentGroup) {
                     console.log(`[MelodyEditor] Shift+Space (in group ${parentGroup.id}): Parent group has no duration. Doing nothing for ${elementId}`);
                     // Explicitly do nothing if parent group has no duration
                } else {
                    console.log(`[MelodyEditor] Shift+Space (top-level): Doing nothing for ${elementId}`);
                    // Explicitly do nothing for top-level notes
                }
                return; // Action handled, whether something changed or not
            }
        }
        // --- End Shift + Space ---

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
              // Prevent default space behavior (like scrolling)
              event.preventDefault(); 
              // Check if there is a selected element and it's a note or rest
              if (originalElement && (originalElement.type === 'note' || originalElement.type === 'rest')) {
                  this.toggleSilence(originalElement.id);
              }
              break;
        }
    }
  }

  private startNewGroup(): void {
      const currentSelectedVisualId = this.selectedId;
      // Usar la duración por defecto del componente
      const newGroupId = this.melodyEditorService.startGroup(this.defaultDuration, currentSelectedVisualId); 
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

      const currentDuration = currentElement.duration ?? this.durations[0]; // Default to first duration if undefined
      let newDuration: NoteDuration;

      // Simplified logic: Always cycle through defined durations
      const currentIndex = this.durations.indexOf(currentDuration); 
      if (currentIndex === -1) { // If current duration isn't in the list, start from first
           newDuration = this.durations[this.durations.length -1]; // Cycle up wraps to last
      } else if (currentIndex === 0) {
          newDuration = this.durations[this.durations.length - 1]; // Wrap around
      } else {
          newDuration = this.durations[currentIndex - 1]; // Cycle up
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

      const currentDuration = currentElement.duration ?? this.durations[0]; // Default to first duration if undefined
      let newDuration: NoteDuration;

       // Simplified logic: Always cycle through defined durations
       const currentIndex = this.durations.indexOf(currentDuration);
       if (currentIndex === -1) { // If current duration isn't in the list, start from first
            newDuration = this.durations[0];
       } else if (currentIndex === this.durations.length - 1) {
           newDuration = this.durations[0]; // Wrap around
       } else {
           newDuration = this.durations[currentIndex + 1]; // Cycle down
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
    this.globalDurationSub?.unsubscribe();
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

  /**
   * Toggles the silence state (note <-> rest) of the element with the given ID.
   * If no ID is provided, uses the currently focused element.
   */
  public toggleSilence(id?: string): void {
    const elementId = id ?? this.selectedId; // Use selectedId instead of focusedElement.id
    if (!elementId) {
        console.warn("[MelodyEditor] toggleSilence called without a selected element.");
        return;
    }
    
    // We need to find the element in the original structure, not just the visual one
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
    const noteData = { value: baseNoteValue, type: 'note' as 'note' }; 
    // Usar la duración por defecto del componente
    const durationToUse = this.defaultDuration;
    console.log(`[MelodyEditor] insertNote: Using component default duration: ${durationToUse}`);
    let newNoteId: string | null = null;
    if (this.focusedElement) {
        if (this.focusedElement.type === 'group') {
            console.log(`Insert note inside group ${this.focusedElement.id}`);
            // Pasar la duración explícitamente
            newNoteId = this.melodyEditorService.addNoteToGroup(this.focusedElement.id, noteData, durationToUse);
        } else {
            console.log(`Insert note after element ${this.focusedElement.id}`);
            // Pasar la duración explícitamente
            newNoteId = this.melodyEditorService.addNoteAfter(this.focusedElement.id, noteData, durationToUse);
        }
    } else {
        console.log('Insert note at the end');
        // Pasar la duración explícitamente
        newNoteId = this.melodyEditorService.addNote(noteData, durationToUse);
    }
    console.log('New note ID:', newNoteId);
    if (newNoteId) {
        this.emitNotesChange(); 
    }
  }

  // --- Helper function to find the direct parent group of an element ---
  private findParentGroup(elementId: string, elements: MusicElement[]): GenericGroup | null {
    for (const el of elements) {
        if (el.type === 'group' && el.children) {
            if (el.children.some(child => child.id === elementId)) {
                // Found as a direct child of this group
                return el as GenericGroup; 
            }
            // Recursively check inside this group's children
            const parent = this.findParentGroup(elementId, el.children);
            if (parent) {
                return parent; // Return the parent found deeper in the hierarchy
            }
        } else if ((el.type === 'arpeggio' || el.type === 'chord') && el.notes) {
             // Also check inside chords/arpeggios, treating them like potential groups
             // NOTE: Chords/Arpeggios typically don't have their own duration in the model, 
             // but if they did, this logic might need adjustment depending on desired inheritance.
             // For now, just traverse into them.
            const parent = this.findParentGroup(elementId, el.notes);
            if (parent) {
                return parent; 
            }
        }
        // We don't check el.id === elementId here, because we are looking for a *parent*
    }
    // Element not found within any group at this level or below
    return null; 
  }
  // --- End helper function ---
}
