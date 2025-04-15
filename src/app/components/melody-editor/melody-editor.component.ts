import { Component, OnInit, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { NoteData } from '../../model/note';
import { parseBlockNotes } from '../../model/ohm.parser';
import { VariableContext } from '../../model/variable.context';
import { MelodyEditorService } from '../../services/melody-editor.service';
import { MusicElement, NoteDuration, SingleNote, CompositeNote, GenericGroup } from '../../model/melody';
import { Subscription } from 'rxjs';

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
  
  focusedElement: MusicElement | null = null;
  elements: MusicElement[] = [];
  visualElements: VisualElement[] = [];
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
    // Suscribirse a cambios en el servicio
    this.elementsSub = this.melodyEditorService.elements$.subscribe(elements => {
      console.log('Component: Received elements update from service:', elements);
      this.elements = elements; // Guardar original
      this.visualElements = this.flattenElements(elements); // <<< GENERAR LISTA VISUAL
      console.log('Component: Generated visual elements:', this.visualElements);
      
      // Resetear selección si el elemento seleccionado ya no existe en la lista visual
      if (this.selectedId && !this.visualElements.some(ve => ve.id === this.selectedId)) {
          this.selectElement(null); // Usar nueva función de selección
      }
      
      this.cdr.detectChanges();
    });
    
    // Suscribirse a cambios de ID seleccionado del servicio (si se mantiene)
    // O manejar la selección solo localmente en el componente ahora?
    // Por ahora, comentamos la suscripción a selectedElementId$ del servicio
    /*
    this.selectedIdSub = this.melodyEditorService.selectedElementId$.subscribe(id => {
      this.selectedId = id;
      // ... (lógica foco basada en ID del servicio) ...
      this.cdr.detectChanges();
    });
    */
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
      // No llamar a loadNotesFromString aquí, la suscripción ngOnInit lo manejará
      // this.loadNotesFromString(this.notes);
      // La suscripción a elements$ ya está en ngOnInit
  }

  // <<< NUEVA FUNCIÓN DE APLANADO >>>
  private flattenElements(elements: MusicElement[]): VisualElement[] {
    let flatList: VisualElement[] = [];
    elements.forEach(element => {
      if (element.type === 'group') {
        const group = element as GenericGroup;
        // Marcador de inicio
        flatList.push({
          id: `${group.id}_start`, // ID generado para el marcador
          type: 'group-start',
          originalElement: group,
          duration: group.duration
        });
        // Hijos (recursivo)
        flatList = flatList.concat(this.flattenElements(group.children || []));
        // Marcador de fin
        flatList.push({
          id: `${group.id}_end`,
          type: 'group-end',
          originalElement: group
        });
      } else if (element.type === 'arpeggio' || element.type === 'chord'){
          // Añadir el grupo compuesto como un solo elemento visual
          flatList.push({
              id: element.id,
              type: element.type,
              originalElement: element
              // Podríamos aplanar sus hijos también si quisiéramos foco interno?
          });
      } else { // note o rest
        flatList.push({
          id: element.id,
          type: element.type,
          originalElement: element
        });
      }
    });
    return flatList;
  }
  
  // <<< NUEVA FUNCIÓN DE SELECCIÓN >>>
  selectElement(id: string | null): void {
      if (this.selectedId !== id) {
          this.selectedId = id;
          console.log('[MelodyEditor] Selecting visual element ID:', id);
          const visualEl = this.visualElements.find(ve => ve.id === id);
          this.focusedElement = visualEl ? visualEl.originalElement : null;
          console.log('[MelodyEditor] Focused original element:', this.focusedElement ? JSON.parse(JSON.stringify(this.focusedElement)) : null);
          this.cdr.detectChanges();
      }
  }

  // Modificar onNoteClick y onMarkerClick para usar selectElement
  onNoteClick(element: MusicElement): void {
    this.selectElement(element.id);
  }
  
  onMarkerClick(group: GenericGroup, markerType: 'start' | 'end', event: MouseEvent): void {
      event.stopPropagation(); 
      const markerId = `${group.id}_${markerType}`;
      this.selectElement(markerId);
  }
  
  // Modificar moveFocus para operar sobre visualElements
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

  // Modificar handleKeyboardEvent para usar visualElements y nueva lógica de Shift
  @HostListener('keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    console.log('RAW Keydown Event:', { key: event.key, code: event.code, shiftKey: event.shiftKey });
    if (event.repeat) return;

    if (['Insert', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', ' ', '(', ')'].includes(event.key)) {
      event.preventDefault();
    }
    
    // <<< LÓGICA SIMPLIFICADA Y MODIFICADA >>>
    
    // Manejo de teclas de grupo (sin cambios)
    if (event.key === '(') {
      console.log('Calling startNewGroup...');
      this.startNewGroup(); // Este método debe seleccionar el NUEVO marcador de inicio
      return; 
    } else if (event.key === ')') {
      console.log('Cerrar grupo (pendiente)');
      return; 
    }
    
    // Necesitamos un elemento seleccionado para casi todo lo demás
    if (!this.selectedId) {
        if (event.key === 'Insert') this.insertNote();
        return;
    }
    
    const selectedVisualElement = this.visualElements.find(ve => ve.id === this.selectedId);
    if (!selectedVisualElement) return; 
    const originalElement = selectedVisualElement.originalElement;
    if (!originalElement) return; // Seguridad adicional

    if (event.shiftKey) { // Shift + Tecla
        
        // Cambiar duración (Siempre activo con Shift+Up/Down)
        if (event.key === 'ArrowUp') {
            this.increaseDuration(originalElement.id);
            return; // Acción completada
        } else if (event.key === 'ArrowDown') {
            this.decreaseDuration(originalElement.id);
            return; // Acción completada
        }

        // Intentar mover bordes SI estamos en un marcador y tecla es Izq/Der
        if ((selectedVisualElement.type === 'group-start' || selectedVisualElement.type === 'group-end') && 
            (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) 
        {
            const groupId = originalElement.id;
            if (selectedVisualElement.type === 'group-start') {
                if (event.key === 'ArrowLeft') this.melodyEditorService.moveGroupStartLeft(groupId);
                else this.melodyEditorService.moveGroupStartRight(groupId);
            } else { // group-end
                if (event.key === 'ArrowLeft') this.melodyEditorService.moveGroupEndLeft(groupId);
                else this.melodyEditorService.moveGroupEndRight(groupId);
            }
            // Independientemente de si el servicio pudo mover el borde (por anidamiento), 
            // la acción intentada fue mover borde, así que salimos.
            return; 
        }
        
        // <<< RESTAURAR: Mover elemento COMPLETO si NO estamos en marcador (o si tecla no es Izq/Der) >>>
        if (event.key === 'ArrowLeft') {
            this.melodyEditorService.moveElementLeft(originalElement.id);
        } else if (event.key === 'ArrowRight') {
            this.melodyEditorService.moveElementRight(originalElement.id);
        }

    } else { // Tecla sin Shift
        switch (event.key) {
            case 'Insert':
              this.insertNote(); 
              break;
            case 'ArrowLeft':
                this.moveFocus(-1); // Moverse en la lista visual
                break;
            case 'ArrowRight':
                this.moveFocus(1); // Moverse en la lista visual
                break;
            case 'ArrowUp':
                // Solo actuar si es nota o silencio (comprobar originalElement)
                if (originalElement.type === 'note' || originalElement.type === 'rest') {
                  this.increaseNote(); // increaseNote usa this.focusedElement que actualizamos en selectElement
                }
                break;
            case 'ArrowDown':
                if (originalElement.type === 'note' || originalElement.type === 'rest') {
                  this.decreaseNote();
                }
                break;
            case 'Delete':
              this.deleteNote(); // deleteNote usa this.focusedElement
              break;
            case ' ': 
              this.toggleSilence(originalElement.id); // Pasar ID original
              break;
        }
    }
  }

  // Modificar startNewGroup para seleccionar el marcador correcto
  private startNewGroup(): void {
      const currentSelectedVisualId = this.selectedId; // Usar ID del elemento VISUAL seleccionado
      const defaultDuration: NoteDuration = '4n';
      // Llamar al servicio y obtener el ID del nuevo grupo
      const newGroupId = this.melodyEditorService.startGroup(defaultDuration, currentSelectedVisualId);
      // Seleccionar el MARCADOR DE INICIO del nuevo grupo
      this.selectElement(`${newGroupId}_start`);
  }
  
  // Asegurar que increase/decreaseDuration operen sobre el elemento original (raíz o anidado)
  private increaseDuration(elementId?: string): void {
      const targetId = elementId ?? this.focusedElement?.id;
      if (!targetId) return;
      // Find the element within the complete, potentially nested 'elements' structure
      const findElementRecursive = (id: string, els: MusicElement[]): MusicElement | null => {
          for (const el of els) {
              if (el.id === id) return el;
              if (el.type === 'group' && el.children) {
                  const found = findElementRecursive(id, el.children);
                  if (found) return found;
              } else if ((el.type === 'arpeggio' || el.type === 'chord') && el.notes) {
                  // Arpeggios/Chords might have MusicElements too if we adapt the model later
                  // For now, assume they don't contain nestable elements with durations
                  // const found = findElementRecursive(id, el.notes);
                  // if (found) return found;
              }
          }
          return null;
      };
      const currentElement = findElementRecursive(targetId, this.elements);
      if (!currentElement) return;

      const currentDuration = currentElement.duration;
      let newDuration: NoteDuration | undefined;

      if (currentDuration === undefined) {
          // If current is undefined, cycle to the last duration ('8t')
          newDuration = this.durations[this.durations.length - 1];
      } else {
          const currentIndex = this.durations.indexOf(currentDuration);
          if (currentIndex === 0) {
              // If current is the first ('1n'), cycle to undefined
              newDuration = undefined;
          } else if (currentIndex > 0) {
              // Otherwise, go to the previous duration
              newDuration = this.durations[currentIndex - 1];
          } else {
             // Duration existed but wasn't in our list? Fallback to undefined.
             newDuration = undefined;
          }
      }

      this.melodyEditorService.updateNote(targetId, { duration: newDuration });
      this.emitNotesChange(); // Emit after update
  }

  private decreaseDuration(elementId?: string): void {
      const targetId = elementId ?? this.focusedElement?.id;
      if (!targetId) return;
      // Find the element within the complete, potentially nested 'elements' structure
      const findElementRecursive = (id: string, els: MusicElement[]): MusicElement | null => {
           for (const el of els) {
               if (el.id === id) return el;
               if (el.type === 'group' && el.children) {
                   const found = findElementRecursive(id, el.children);
                   if (found) return found;
               } // Add checks for arpeggio/chord if needed
           }
           return null;
      };
      const currentElement = findElementRecursive(targetId, this.elements);
      if (!currentElement) return;

      const currentDuration = currentElement.duration;
      let newDuration: NoteDuration | undefined;

      if (currentDuration === undefined) {
          // If current is undefined, cycle to the first duration ('1n')
          newDuration = this.durations[0];
      } else {
          const currentIndex = this.durations.indexOf(currentDuration);
          if (currentIndex === this.durations.length - 1) {
              // If current is the last ('8t'), cycle to undefined
              newDuration = undefined;
          } else if (currentIndex >= 0 && currentIndex < this.durations.length - 1) {
              // Otherwise, go to the next duration
              newDuration = this.durations[currentIndex + 1];
          } else {
              // Duration existed but wasn't in list? Fallback to undefined.
              newDuration = undefined;
          }
      }

      this.melodyEditorService.updateNote(targetId, { duration: newDuration });
      this.emitNotesChange(); // Emit after update
  }
  
  // deleteNote y toggleSilence probablemente necesiten ajustarse para usar el ID del elemento original también
  // ... (revisar/ajustar deleteNote, toggleSilence, increase/decreaseNote si usan directamente focusedElement)

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

  // <<< HACER PÚBLICO toggleSilence >>>
  public toggleSilence(id?: string): void {
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
    // Handle undefined duration before calling indexOf
    if (element.duration === undefined) {
      // If undefined, delta > 0 (up) goes to last, delta < 0 (down) goes to first
      const newDuration = delta > 0 ? this.durations[this.durations.length - 1] : this.durations[0];
      this.melodyEditorService.updateNote(id, { duration: newDuration });
    } else {
      const currentIndex = this.durations.indexOf(element.duration);
      if (currentIndex === -1) return; // Duration not in list, do nothing?
      const newIndex = currentIndex + delta;
      if (newIndex === -1) { // Trying to go before the first duration
        this.melodyEditorService.updateNote(id, { duration: undefined });
      } else if (newIndex === this.durations.length) { // Trying to go after the last duration
        this.melodyEditorService.updateNote(id, { duration: undefined });
      } else if (newIndex >= 0 && newIndex < this.durations.length) {
        this.melodyEditorService.updateNote(id, { duration: this.durations[newIndex] });
      }
    }
    this.emitNotesChange();
  }

  changeNoteValue(id: string, delta: number): void {
    const element = this.elements.find(e => e.id === id);
    if (!element || (element.type !== 'note' && element.type !== 'rest')) return;
    this.melodyEditorService.selectNote(id);
    this.updateNoteValue(element as SingleNote, (element.value ?? (delta > 0 ? -1 : 1)) + delta);
  }

  // <<< RESTAURAR onEditorClick >>>
  onEditorClick(event: MouseEvent) {
    // Comprobar si el clic fue DENTRO de algún elemento interactivo
    const clickedInsideInteractive = (event.target as HTMLElement).closest(
        'app-melody-note, app-melody-group, .group-marker'
    );
    if (!clickedInsideInteractive) {
      // Si el clic fue fuera (en el fondo), deseleccionar
      this.selectElement(null);
    }
    // Intentar dar foco al contenedor principal para capturar teclas
    const editorElement = this.elementRef.nativeElement.querySelector('.melody-editor');
    if (editorElement) {
      editorElement.focus();
    }
  }
  
  // <<< RESTAURAR onWheel >>>
  onWheel(event: WheelEvent, visualElement: VisualElement): void { 
    // Recibe VisualElement desde la plantilla
    event.preventDefault();
    this.selectElement(visualElement.id); // Seleccionar el elemento sobre el que se hizo scroll
    
    const element = visualElement.originalElement; // Trabajar con el elemento original

    if (event.shiftKey) { // Cambiar duración
      const delta = event.deltaY > 0 ? 1 : -1; // Positive delta (scroll down) = decrease duration
      // Handle undefined duration before calling indexOf
      if (element.duration === undefined) {
        const newDuration = delta > 0 ? this.durations[0] : this.durations[this.durations.length - 1];
        this.melodyEditorService.updateNote(element.id, { duration: newDuration });
      } else {
        const currentIndex = this.durations.indexOf(element.duration); 
        if (currentIndex === -1) return; // Not found
        const newIndex = currentIndex + delta;
        if (newIndex === -1) { // Trying to go before the first duration
          this.melodyEditorService.updateNote(element.id, { duration: undefined });
        } else if (newIndex === this.durations.length) { // Trying to go after the last duration
          this.melodyEditorService.updateNote(element.id, { duration: undefined });
        } else if (newIndex >= 0 && newIndex < this.durations.length) {
          this.melodyEditorService.updateNote(element.id, { duration: this.durations[newIndex] });
        }
      }
      this.emitNotesChange(); // Emitir cambios
    } else { // Cambiar valor (si es nota/silencio)
      if (element.type === 'note' || element.type === 'rest') {
        const delta = event.deltaY > 0 ? -1 : 1;
        this.updateNoteValue(element, (element.value ?? (delta > 0 ? -1 : 1)) + delta);
      }
    }
  }

  // <<< RESTAURAR insertNote >>>
  insertNote(): void {
    const baseNoteValue = 1; 
    const baseDuration: NoteDuration = '4n'; // Asegúrate que NoteDuration esté importado si usas el tipo
    const noteData = { value: baseNoteValue, duration: baseDuration, type: 'note' as 'note' };
    let newNoteId: string | null = null;

    if (this.focusedElement) {
        // <<< LÓGICA MODIFICADA >>>
        if (this.focusedElement.type === 'group') {
            // Si el foco está en un GenericGroup, añadir DENTRO
            console.log(`Insert note inside group ${this.focusedElement.id}`);
            newNoteId = this.melodyEditorService.addNoteToGroup(this.focusedElement.id, noteData);
        } else {
            // Si el foco está en una nota u otro elemento, añadir DESPUÉS
            console.log(`Insert note after element ${this.focusedElement.id}`);
            newNoteId = this.melodyEditorService.addNoteAfter(this.focusedElement.id, noteData);
        }
    } else {
        // Si no hay foco, añadir al final de la lista raíz
        console.log('Insert note at the end');
        newNoteId = this.melodyEditorService.addNote(noteData);
    }
    
    // La selección de la nueva nota (newNoteId) la maneja el servicio
    // La actualización de la vista la maneja la suscripción a elements$
    console.log('New note ID:', newNoteId);
    // Ya no necesitamos emitir cambios aquí si el servicio actualiza el observable
    // this.emitNotesChange(); 
  }
}
