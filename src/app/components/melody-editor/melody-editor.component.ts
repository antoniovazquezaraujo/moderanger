import { Component, OnInit, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
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
export class MelodyEditorComponent implements OnInit, AfterViewInit {
  @Input() notes: string = '';
  @Output() notesChange = new EventEmitter<string>();
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  
  focusedElement: MusicElement | null = null;
  elements: MusicElement[] = [];
  selectedNoteId?: string;
  expandedGroups = new Set<string>();
  readonly durations: NoteDuration[] = ['1n', '2n', '4n', '8n', '16n', '4t', '8t'];
  
  constructor(
    private melodyEditorService: MelodyEditorService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.notes) {
      const noteData = parseBlockNotes(this.notes);
      this.melodyEditorService.loadFromNoteData(noteData);
    }
  }

  ngAfterViewInit(): void {
    this.melodyEditorService.elements$.subscribe(elements => {
      this.elements = elements;
      // Mantener el foco en el elemento actual después de actualizar
      if (this.focusedElement) {
        const updatedElement = elements.find(e => e.id === this.focusedElement?.id);
        if (updatedElement) {
          this.focusedElement = updatedElement;
        }
      }
      this.cdr.detectChanges();
    });
  }

  @HostListener('keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.focusedElement) return;

    switch (event.key) {
      case 'ArrowLeft':
        this.moveFocus(-1);
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.moveFocus(1);
        event.preventDefault();
        break;
      case 'ArrowUp':
        if (event.shiftKey) {
          this.increaseDuration();
        } else {
          this.increaseNote();
        }
        event.preventDefault();
        break;
      case 'ArrowDown':
        if (event.shiftKey) {
          this.decreaseDuration();
        } else {
          this.decreaseNote();
        }
        event.preventDefault();
        break;
      case 'Insert':
        this.insertNote();
        event.preventDefault();
        break;
      case 'Delete':
        this.deleteNote();
        event.preventDefault();
        break;
      case ' ':
        this.toggleSilence();
        event.preventDefault();
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
        this.melodyEditorService.updateNote(note.id, { duration: this.durations[newIndex] });
        this.emitNotesChange();
      }
    } else {
      // Cambiar valor de la nota con rueda
      const delta = event.deltaY > 0 ? -1 : 1;
      this.melodyEditorService.updateNote(note.id, { value: (note.value ?? 0) + delta });
      this.emitNotesChange();
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

  private increaseNote(): void {
    if (!this.focusedElement || this.focusedElement.type !== 'note') return;
    const note = this.focusedElement as SingleNote;
    this.melodyEditorService.updateNote(note.id, { value: (note.value ?? 0) + 1 });
    this.emitNotesChange();
  }

  private decreaseNote(): void {
    if (!this.focusedElement || this.focusedElement.type !== 'note') return;
    const note = this.focusedElement as SingleNote;
    this.melodyEditorService.updateNote(note.id, { value: (note.value ?? 0) - 1 });
    this.emitNotesChange();
  }

  private increaseDuration(): void {
    if (!this.focusedElement) return;
    const currentDuration = this.focusedElement.duration;
    const currentIndex = this.durations.indexOf(currentDuration);
    if (currentIndex > 0) {
      this.melodyEditorService.updateNote(this.focusedElement.id, { duration: this.durations[currentIndex - 1] });
      this.emitNotesChange();
    }
  }

  private decreaseDuration(): void {
    if (!this.focusedElement) return;
    const currentDuration = this.focusedElement.duration;
    const currentIndex = this.durations.indexOf(currentDuration);
    if (currentIndex < this.durations.length - 1) {
      this.melodyEditorService.updateNote(this.focusedElement.id, { duration: this.durations[currentIndex + 1] });
      this.emitNotesChange();
    }
  }

  private insertNote(): void {
    if (!this.focusedElement) return;
    this.melodyEditorService.addNoteAfter(this.focusedElement.id);
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
    this.melodyEditorService.updateNote(elementId, { value: null });
    this.emitNotesChange();
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
    
    const note = element as SingleNote;
    this.melodyEditorService.updateNote(note.id, { value: (note.value ?? 0) + delta });
    this.emitNotesChange();
  }

  private emitNotesChange(): void {
    const noteData = this.melodyEditorService.toNoteData();
    this.notesChange.emit(NoteData.toStringArray(noteData));
  }
}
