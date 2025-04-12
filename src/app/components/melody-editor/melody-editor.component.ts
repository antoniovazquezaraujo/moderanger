import { Component, OnInit, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { NoteData } from '../../model/note';
import { parseBlockNotes } from '../../model/ohm.parser';
import { VariableContext } from '../../model/variable.context';
import { MelodyEditorService } from '../../services/melody-editor.service';
import { MusicElement, NoteDuration, SingleNote, NoteGroup } from '../../model/melody';

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
  
  focusedElement: MusicElement | null = null;
  elements: MusicElement[] = [];
  selectedNoteId?: string;
  expandedGroups = new Set<string>();
  readonly durations: NoteDuration[] = ['1n', '2n', '4n', '8n', '16n', '4t', '8t'];
  
  constructor(
    private melodyEditorService: MelodyEditorService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // Initial load logic remains here, but ngOnChanges will handle subsequent updates
    // this.loadNotesFromString(this.notes);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['notes']) {
      const newNotes = changes['notes'].currentValue;
      // console.log(`[MelodyEditor] ngOnChanges detected notes change: Prev=`, changes['notes'].previousValue, ` New=`, newNotes);
      this.loadNotesFromString(newNotes);
    }
  }

  private loadNotesFromString(notesString: string): void {
    // console.log(`[MelodyEditor] loadNotesFromString called with:`, notesString);
    try {
      if (notesString) {
        const noteData = parseBlockNotes(notesString);
        // console.log(`[MelodyEditor] Parsed NoteData:`, noteData);
        this.melodyEditorService.loadFromNoteData(noteData);
      } else {
        // console.log(`[MelodyEditor] Empty notes string received, clearing editor.`);
        this.melodyEditorService.loadFromNoteData([]); 
      }
    } catch (e) {
      console.error('[MelodyEditor] Error parsing notes in loadNotesFromString:', notesString, e);
    }
    setTimeout(() => { 
      if (this.elements.length > 0) {
        this.focusedElement = this.elements[this.elements.length - 1];
        if (this.focusedElement) { // Check if focusedElement is not null
          this.melodyEditorService.selectNote(this.focusedElement.id);
        }
      } else {
        this.focusedElement = null;
      }
      this.cdr.detectChanges();
    }, 0); 
  }

  ngAfterViewInit(): void {
    this.loadNotesFromString(this.notes);

    this.melodyEditorService.elements$.subscribe(elements => {
      this.elements = elements;
      
      // Si no hay elemento enfocado y hay elementos, enfocar el último
      if (!this.focusedElement && elements.length > 0) {
        this.focusedElement = elements[elements.length - 1];
        this.melodyEditorService.selectNote(this.focusedElement.id);
      }
      
      // Si hay elemento enfocado, asegurarse de que sigue existiendo
      if (this.focusedElement) {
        const updatedElement = elements.find(e => e.id === this.focusedElement?.id);
        if (!updatedElement) {
          // Si el elemento enfocado ya no existe, enfocar el último
          this.focusedElement = elements[elements.length - 1];
          this.melodyEditorService.selectNote(this.focusedElement.id);
        }
      }
      
      this.cdr.detectChanges();
    });
  }

  @HostListener('keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Solo procesar el evento si no es una repetición de tecla
    if (event.repeat) return;

    // Solo prevenir el comportamiento por defecto para las teclas que manejamos
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
          case ' ':
            this.toggleSilence();
            break;
        }
        break;
    }
  }

  onWheel(event: WheelEvent, element: MusicElement): void {
    if (element.type !== 'note') return;
    
    event.preventDefault();
    const note = element as SingleNote;
    
    if (event.shiftKey) {
      // Cambiar duración con Shift + rueda
      const currentIndex = this.durations.indexOf(note.duration);
      const delta = event.deltaY > 0 ? 1 : -1;
      const newIndex = currentIndex + delta;
      
      if (newIndex >= 0 && newIndex < this.durations.length) {
        const newDuration = this.durations[newIndex];
        this.melodyEditorService.updateNote(note.id, { duration: newDuration });
        this.focusedElement = { ...note, duration: newDuration };
        this.emitNotesChange();
      }
    } else {
      // Cambiar valor de la nota con rueda
      const delta = event.deltaY > 0 ? -1 : 1;
      this.updateNoteValue(note, (note.value ?? 0) + delta);
    }
  }

  private moveFocus(direction: number): void {
    const currentIndex = this.elements.findIndex(e => e.id === this.focusedElement?.id);
    if (currentIndex === -1) return;

    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.elements.length) {
      this.focusedElement = this.elements[newIndex];
      this.melodyEditorService.selectNote(this.focusedElement.id);
      this.emitNotesChange();
    }
  }

  private updateNoteValue(note: SingleNote, newValue: number | null): void {
    let updatePayload: Partial<SingleNote>;
    if (newValue === null) {
        // console.log(`[MelodyEditor] Setting note ${note.id} to silence (type: rest).`);
        updatePayload = { value: null, type: 'rest' }; 
    } else {
        // console.log(`[MelodyEditor] Setting note ${note.id} to value ${newValue} (type: note).`);
        updatePayload = { value: newValue, type: 'note' };
    }
    this.melodyEditorService.updateNote(note.id, updatePayload);
    this.focusedElement = { ...note, ...updatePayload }; 
    this.emitNotesChange();
  }

  private increaseNote(): void {
    if (!this.focusedElement || this.focusedElement.type !== 'note') return;
    const note = this.focusedElement as SingleNote;
    this.updateNoteValue(note, (note.value ?? 0) + 1);
  }

  private decreaseNote(): void {
    if (!this.focusedElement || this.focusedElement.type !== 'note') return;
    const note = this.focusedElement as SingleNote;
    this.updateNoteValue(note, (note.value ?? 0) - 1);
  }

  private increaseDuration(): void {
    if (!this.focusedElement) return;
    const currentDuration = this.focusedElement.duration;
    const currentIndex = this.durations.indexOf(currentDuration);
    if (currentIndex > 0) {
      const newDuration = this.durations[currentIndex - 1];
      this.melodyEditorService.updateNote(this.focusedElement.id, { duration: newDuration });
      this.focusedElement = { ...this.focusedElement, duration: newDuration };
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
      this.focusedElement = { ...this.focusedElement, duration: newDuration };
      this.emitNotesChange();
    }
  }

  insertNote(): void {
    if (this.elements.length === 0) {
      this.melodyEditorService.addNote();
    } else if (this.focusedElement) {
      this.melodyEditorService.addNoteAfter(this.focusedElement.id);
    }
    this.emitNotesChange();
  }

  private deleteNote(): void {
    if (!this.focusedElement) return;
    
    const currentIndex = this.elements.findIndex(e => e.id === this.focusedElement?.id);
    if (currentIndex === -1) return;

    // Eliminar la nota
    this.melodyEditorService.removeNote(this.focusedElement.id);
    
    // Actualizar el foco
    if (this.elements.length > 1) {
      if (currentIndex > 0) {
        // Si no es el primer elemento, enfocar el anterior
        this.focusedElement = this.elements[currentIndex - 1];
      } else {
        // Si es el primer elemento, enfocar el nuevo primer elemento
        this.focusedElement = this.elements[0];
      }
      this.melodyEditorService.selectNote(this.focusedElement.id);
    } else {
      // Si era la última nota, limpiar el foco
      this.focusedElement = null;
    }
    
    this.emitNotesChange();
  }

  toggleSilence(id?: string): void {
    const elementId = id || this.focusedElement?.id;
    if (!elementId) return;
    const element = this.elements.find(e => e.id === elementId);
    if (element && element.type === 'note' && element.value !== null) {
        // console.log(`[MelodyEditor] Toggling note ${element.id} TO silence.`);
        this.updateNoteValue(element as SingleNote, null);
    } else if (element && element.type === 'note' && element.value === null) {
         // console.log(`[MelodyEditor] Note ${element.id} is already silence. Toggle ignored.`);
    } else {
        // console.warn('[MelodyEditor] toggleSilence called on non-note or missing element:', elementId);
    }
  }

  onNoteClick(element: MusicElement): void {
    this.focusedElement = element;
    this.melodyEditorService.selectNote(element.id);
    this.emitNotesChange();
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
  }

  addNewNote(): void {
    this.melodyEditorService.addNote();
    this.emitNotesChange();
  }

  changeDuration(id: string, delta: number): void {
    const element = this.elements.find(e => e.id === id);
    if (!element) return;
    
    const currentIndex = this.durations.indexOf(element.duration);
    const newIndex = currentIndex + delta;
    
    if (newIndex >= 0 && newIndex < this.durations.length) {
      this.melodyEditorService.updateNote(id, { duration: this.durations[newIndex] });
      this.emitNotesChange();
    }
  }

  changeNoteValue(id: string, delta: number): void {
    const element = this.elements.find(e => e.id === id);
    if (!element || element.type !== 'note') return;
    this.updateNoteValue(element as SingleNote, (element.value ?? 0) + delta);
  }

  private emitNotesChange(): void {
    const noteData = this.melodyEditorService.toNoteData();
    // console.log('[MelodyEditor] Emitting notes change. NoteData from service:', JSON.stringify(noteData));
    const stringArray = NoteData.toStringArray(noteData);
    // console.log('[MelodyEditor] Emitting string array:', stringArray);
    this.notesChange.emit(stringArray);
  }

  ngOnDestroy() {
    // Limpiar cualquier suscripción si es necesario
  }

  onEditorClick(event: MouseEvent) {
    // Asegurarse de que el editor gane el foco
    const editorElement = this.elementRef.nativeElement.querySelector('.melody-editor');
    if (editorElement) {
      editorElement.focus();
    }
  }

  // Método para manejar el clic en el icono de variable
  onToggleVariable(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleVariable.emit();
  }
}
