import { Component, OnInit, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, AfterViewInit, NgZone } from '@angular/core';
import { NoteData } from '../../model/note';
import { parseBlockNotes } from '../../model/ohm.parser';
import { VariableContext } from '../../model/variable.context';

interface EditorNote {
  id: number;
  value: number | null; // null para silencios
  duration: string;
  isSelected: boolean;
  groupStart?: boolean;
  groupEnd?: boolean;
  groupLevel?: number;
  groupDuration?: string;
}

@Component({
  selector: 'app-melody-editor',
  templateUrl: './melody-editor.component.html',
  styleUrls: ['./melody-editor.component.scss']
})
export class MelodyEditorComponent implements OnInit, AfterViewInit {
  @Input() set notes(value: string) {
    this._notes = value;
    this.parseNotes();
  }
  @Output() notesChange = new EventEmitter<string>();
  
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  
  private _notes: string = '';
  editorNotes: EditorNote[] = [];
  selectedNoteIndex: number = -1;
  
  durations = ['1n', '2n', '4n', '8n', '16n', '4t', '8t'];
  currentGroupLevel: number = 0;
  groupStartIndexes: number[] = [];

  // Propiedades adicionales para manejar la selección de corchetes independientemente
  selectedBracketIndex: number = -1;
  selectedBracketType: 'start' | 'end' | null = null;

  constructor(private ngZone: NgZone) { }

  ngOnInit(): void {
    this.parseNotes();
  }

  ngAfterViewInit(): void {
    // Añadir event listeners manualmente
    this.attachBracketEventListeners();
  }

  private attachBracketEventListeners(): void {
    console.log('Attaching bracket event listeners');
    
    // Dar tiempo a que el DOM se renderice completamente
    setTimeout(() => {
      // Obtener todos los botones de corchetes
      const startBrackets = document.querySelectorAll('.group-bracket-start');
      const endBrackets = document.querySelectorAll('.group-bracket-end');
      
      console.log('Found brackets:', startBrackets.length, 'start,', endBrackets.length, 'end');
      
      // Añadir listeners a los corchetes de inicio
      startBrackets.forEach((bracket: Element) => {
        // Destacar visualmente para depuración
        (bracket as HTMLElement).style.border = '3px solid red';
        (bracket as HTMLElement).style.cursor = 'pointer';
        
        // Añadir eventos directamente al DOM
        bracket.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          
          const button = e.target as HTMLElement;
          const bracketButton = button.closest('.group-bracket-start') as HTMLElement;
          
          if (bracketButton) {
            const noteIndex = parseInt(bracketButton.getAttribute('data-note-index') || '-1');
            console.log('START BRACKET CLICKED:', noteIndex);
            
            if (noteIndex >= 0) {
              this.selectGroupStart(noteIndex);
              this.ngZone.run(() => {}); // Forzar detección de cambios
            }
          }
        });
      });
      
      // Añadir listeners a los corchetes de fin
      endBrackets.forEach((bracket: Element) => {
        // Destacar visualmente para depuración
        (bracket as HTMLElement).style.border = '3px solid blue';
        (bracket as HTMLElement).style.cursor = 'pointer';
        
        // Añadir eventos directamente al DOM
        bracket.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          
          const button = e.target as HTMLElement;
          const bracketButton = button.closest('.group-bracket-end') as HTMLElement;
          
          if (bracketButton) {
            const noteIndex = parseInt(bracketButton.getAttribute('data-note-index') || '-1');
            console.log('END BRACKET CLICKED:', noteIndex);
            
            if (noteIndex >= 0) {
              this.selectGroupEnd(noteIndex);
              this.ngZone.run(() => {}); // Forzar detección de cambios
            }
          }
        });
      });
    }, 100);
  }

  // Asegurarnos de que los listeners se añadan cuando cambie el contenido
  private refreshListeners(): void {
    clearTimeout(this.listenerRefreshTimeout);
    this.listenerRefreshTimeout = setTimeout(() => {
      this.attachBracketEventListeners();
    }, 200);
  }
  
  private listenerRefreshTimeout: any = null;
  
  // Método para añadir una nueva nota - usado por los botones en el template
  addNewNote(): void {
    const newNote = {
      id: this.getNextId(),
      value: 0, // Valor predeterminado 0 (en lugar de 1)
      duration: '4n', // Negra por defecto
      isSelected: false
    };
    
    this.editorNotes.push(newNote);
    this.validateAndFixGroups(); // Asegurar integridad de grupos
    this.selectNote(this.editorNotes.length - 1);
    this.updateNotesOutput();
    this.refreshListeners();
  }

  private parseNotes(): void {
    if (!this._notes || this._notes.trim() === '') {
      // Si no hay notas, crear una vacía
      this.editorNotes = [this.createEmptyNote()];
      this.selectedNoteIndex = 0;
      this.currentGroupLevel = 0;
      this.groupStartIndexes = [];
      return;
    }

    try {
      // Parsear las notas
      const noteData = parseBlockNotes(this._notes);
      this.editorNotes = this.convertToEditorNotes(noteData);
      
      // Reconstruir el estado de los grupos
      this.reconstructGroupState();
      
      // Seleccionar la primera nota si hay alguna
      if (this.editorNotes.length > 0 && this.selectedNoteIndex === -1) {
        this.selectedNoteIndex = 0;
        this.editorNotes[0].isSelected = true;
      }
    } catch (error) {
      console.error('Error parsing notes:', error);
      
      // En caso de error, mantener las notas actuales si hay alguna
      if (this.editorNotes.length === 0) {
        this.editorNotes = [this.createEmptyNote()];
        this.selectedNoteIndex = 0;
      }
    }
  }

  private reconstructGroupState(): void {
    // Limpiar el estado de los grupos
    this.currentGroupLevel = 0;
    this.groupStartIndexes = [];
    
    // Encontrar el máximo nivel de grupo y reconstruir los índices
    let maxLevel = 0;
    
    // Recorrer todas las notas para reconstruir el estado de los grupos
    for (let i = 0; i < this.editorNotes.length; i++) {
      const note = this.editorNotes[i];
      
      if (note.groupStart && note.groupLevel !== undefined) {
        maxLevel = Math.max(maxLevel, note.groupLevel);
        this.groupStartIndexes.push(i);
      }
    }
    
    // Establecer el nivel actual como el máximo encontrado
    this.currentGroupLevel = maxLevel;
  }

  private convertToEditorNotes(noteData: NoteData[]): EditorNote[] {
    const result: EditorNote[] = [];
    let id = 0;
    
    // Función recursiva para manejar grupos anidados
    const processNotes = (notes: NoteData[], groupLevel: number = 0, groupDuration?: string) => {
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        
        // Los "chord" en el parser representan grupos con paréntesis
        if (note.type === 'chord' && note.noteDatas) {
          // Marcar como inicio de grupo
          const groupStart = result.length;
          
          // Procesar notas del acorde como grupo
          processNotes(note.noteDatas, groupLevel + 1, note.duration);
          
          // Marcar límites del grupo
          if (result.length > groupStart) {
            result[groupStart].groupStart = true;
            result[groupStart].groupLevel = groupLevel;
            result[groupStart].groupDuration = note.duration;
            result[result.length - 1].groupEnd = true;
            result[result.length - 1].groupLevel = groupLevel;
          }
        } else {
          const editorNote: EditorNote = {
            id: id++,
            value: note.type === 'rest' ? null : (note.note !== undefined ? note.note : 0),
            duration: note.duration,
            isSelected: false,
            groupLevel: groupLevel
          };
          result.push(editorNote);
        }
      }
    };
    
    processNotes(noteData);
    return result;
  }

  private createEmptyNote(): EditorNote {
    return {
      id: 0,
      value: 0,
      duration: '4n',
      isSelected: true
    };
  }

  selectNote(index: number): void {
    console.log('Selecting note at index', index);
    if (index < 0 || index >= this.editorNotes.length) return;
    this.selectElement('note', index);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    // Si hay un bracket seleccionado, gestionar sus eventos con prioridad
    if (this.selectedBracketIndex >= 0 && this.selectedBracketType) {
      // Shift + flechas para brackets
      if (event.shiftKey) {
        if (event.key === 'ArrowLeft') {
          this.moveGroupBracket('left');
          event.preventDefault();
          return;
        } else if (event.key === 'ArrowRight') {
          this.moveGroupBracket('right');
          event.preventDefault();
          return;
        } else if (this.selectedBracketType === 'start' && event.key === 'ArrowUp') {
          this.changeGroupDuration('increase');
          event.preventDefault();
          return;
        } else if (this.selectedBracketType === 'start' && event.key === 'ArrowDown') {
          this.changeGroupDuration('decrease');
          event.preventDefault();
          return;
        }
      }
    }

    // Solo procesar si el editor tiene el foco o alguno de sus elementos internos
    if (!this.editorContainer?.nativeElement.contains(document.activeElement) && 
        document.activeElement !== this.editorContainer?.nativeElement) {
      return;
    }

    // Registrar evento para depuración
    console.log('KeyDown event:', event.key, 'Bracket selected:', this.selectedBracketIndex, this.selectedBracketType);

    // Verificar primero si hay un corchete seleccionado
    const hasBracketSelected = this.selectedBracketIndex >= 0 && this.selectedBracketType;

    // Procesamiento de teclas para navegación (tanto notas como corchetes)
    switch (event.key) {
      case 'ArrowLeft':
        if (event.shiftKey && hasBracketSelected) {
          // Con Shift, mover el corchete
          this.handleBracketKeyDown(event);
        } else {
          // Sin Shift, navegar entre elementos
          this.moveSelection(-1);
        }
        event.preventDefault();
        return;
        
      case 'ArrowRight':
        if (event.shiftKey && hasBracketSelected) {
          // Con Shift, mover el corchete
          this.handleBracketKeyDown(event);
        } else {
          // Sin Shift, navegar entre elementos
          this.moveSelection(1);
        }
        event.preventDefault();
        return;
    }

    // Si hay un corchete seleccionado, manejar las teclas específicas
    if (hasBracketSelected) {
      // Teclas para corchetes con Shift (duración)
      if (event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        if (this.handleBracketKeyDown(event)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
      
      // Para otras teclas, dejarlo pasar a los manejadores normales
    }

    // Procesamiento para notas (cuando no hay corchete seleccionado)
    if (!hasBracketSelected) {
      switch (event.key) {
        case 'ArrowUp':
          if (event.shiftKey) {
            // Invertido: subir = nota más larga (cambiar a un índice menor en durations)
            this.changeDuration(-1);
          } else {
            this.changeNoteValue(1);
          }
          event.preventDefault();
          break;
        case 'ArrowDown':
          if (event.shiftKey) {
            // Invertido: bajar = nota más corta (cambiar a un índice mayor en durations)
            this.changeDuration(1);
          } else {
            this.changeNoteValue(-1);
          }
          event.preventDefault();
          break;
      }
    }
    
    // Teclas comunes para todos los casos
    switch (event.key) {
      case 'Delete':
        this.deleteNote();
        event.preventDefault();
        break;
      case 'Insert':
        this.insertNote();
        event.preventDefault();
        break;
      case '[':
        this.startGroup();
        event.preventDefault();
        break;
      case ']':
        this.endGroup();
        event.preventDefault();
        break;
      case '-':
        // Permitir notas negativas
        if (this.selectedNoteIndex >= 0) {
          const currentNote = this.editorNotes[this.selectedNoteIndex];
          if (currentNote.value !== null) {
            currentNote.value = -Math.abs(currentNote.value);
            this.updateNotesOutput();
          }
        }
        event.preventDefault();
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        if (this.selectedNoteIndex >= 0) {
          const currentNote = this.editorNotes[this.selectedNoteIndex];
          if (currentNote.value === null) {
            currentNote.value = parseInt(event.key);
          } else {
            const newValue = parseInt(event.key);
            // Preservar el signo al reemplazar el valor
            const isNegative = currentNote.value < 0;
            if (newValue >= 0 && newValue <= 9) {
              currentNote.value = isNegative ? -newValue : newValue;
            }
          }
          this.updateNotesOutput();
        }
        event.preventDefault();
        break;
      case 'x':
      case 'X':
        if (this.selectedNoteIndex >= 0) {
          // Convertir en silencio
          this.editorNotes[this.selectedNoteIndex].value = null;
          this.updateNotesOutput();
        }
        event.preventDefault();
        break;
    }
  }

  // Método modificado para mover la selección entre notas y corchetes
  moveSelection(direction: number): void {
    console.log('Moving selection in direction:', direction);
    
    // Determinar todos los elementos seleccionables (notas y corchetes) en orden
    const selectableElements: {type: 'note' | 'startBracket' | 'endBracket', index: number}[] = [];
    
    // Añadir todas las notas y corchetes en orden lineal
    for (let i = 0; i < this.editorNotes.length; i++) {
      const note = this.editorNotes[i];
      
      // Si hay un corchete de inicio en esta posición, añadirlo primero
      if (note.groupStart) {
        selectableElements.push({type: 'startBracket', index: i});
      }
      
      // Añadir la nota
      selectableElements.push({type: 'note', index: i});
      
      // Si hay un corchete de fin en esta posición, añadirlo después
      if (note.groupEnd) {
        selectableElements.push({type: 'endBracket', index: i});
      }
    }
    
    if (selectableElements.length === 0) return;
    
    // Encontrar el índice del elemento actualmente seleccionado en la lista
    let currentIndex = -1;
    
    if (this.selectedBracketIndex >= 0 && this.selectedBracketType) {
      // Hay un corchete seleccionado
      const bracketType = this.selectedBracketType === 'start' ? 'startBracket' : 'endBracket';
      currentIndex = selectableElements.findIndex(el => 
        el.type === bracketType && el.index === this.selectedBracketIndex);
    } else if (this.selectedNoteIndex >= 0) {
      // Hay una nota seleccionada
      currentIndex = selectableElements.findIndex(el => 
        el.type === 'note' && el.index === this.selectedNoteIndex);
    }
    
    if (currentIndex === -1) {
      // Si no hay selección, seleccionar el primer elemento
      const firstElement = selectableElements[0];
      this.selectElement(firstElement.type, firstElement.index);
      return;
    }
    
    // Calcular el nuevo índice
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < selectableElements.length) {
      const elementToSelect = selectableElements[newIndex];
      this.selectElement(elementToSelect.type, elementToSelect.index);
    }
  }
  
  // Método auxiliar para seleccionar el tipo correcto de elemento
  private selectElement(type: 'note' | 'startBracket' | 'endBracket', index: number): void {
    console.log('Selecting element of type', type, 'at index', index);
    
    // Deseleccionar todo primero
    if (this.selectedNoteIndex >= 0 && this.selectedNoteIndex < this.editorNotes.length) {
      this.editorNotes[this.selectedNoteIndex].isSelected = false;
    }
    this.selectedBracketIndex = -1;
    this.selectedBracketType = null;
    
    // Seleccionar el nuevo elemento
    if (type === 'note') {
      this.selectedNoteIndex = index;
      if (index >= 0 && index < this.editorNotes.length) {
        this.editorNotes[index].isSelected = true;
      }
    } else if (type === 'startBracket') {
      this.selectedBracketIndex = index;
      this.selectedBracketType = 'start';
      this.selectedNoteIndex = -1;
    } else if (type === 'endBracket') {
      this.selectedBracketIndex = index;
      this.selectedBracketType = 'end';
      this.selectedNoteIndex = -1;
    }
    
    // Forzar detección de cambios y refrescar los estilos
    this.ngZone.run(() => {});
    
    // Dar tiempo para que se apliquen los cambios y destacar visualmente
    setTimeout(() => {
      this.highlightSelectedElement();
    }, 10);
  }
  
  // Método para destacar visualmente el elemento seleccionado
  highlightSelectedElement(): void {
    // Eliminar todas las clases selected previas
    const allNotes = document.querySelectorAll('.melody-editor-note');
    const allBrackets = document.querySelectorAll('.group-start, .group-end');
    
    allNotes.forEach(note => note.classList.remove('selected'));
    allBrackets.forEach(bracket => bracket.classList.remove('selected-bracket'));
    
    if (this.selectedNoteIndex >= 0) {
      // Obtener el elemento de la nota seleccionada
      const noteElement = document.querySelector(`.melody-editor-note[data-index="${this.selectedNoteIndex}"]`);
      if (noteElement) {
        noteElement.classList.add('selected');
        (noteElement as HTMLElement).focus(); // Asegurar que el elemento tiene foco para eventos de teclado
      }
    }
    
    if (this.selectedBracketIndex >= 0 && this.selectedBracketType) {
      // Obtener el elemento del bracket seleccionado
      const bracketClass = this.selectedBracketType === 'start' ? 'group-start' : 'group-end';
      const bracketElement = document.querySelector(`.${bracketClass}[data-index="${this.selectedBracketIndex}"]`);
      
      if (bracketElement) {
        bracketElement.classList.add('selected-bracket');
        // Dar foco al bracket para que pueda recibir eventos de teclado
        (bracketElement as HTMLElement).focus();
        
        // Desplazar al bracket si está fuera de vista
        setTimeout(() => {
          (bracketElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      }
      
      // También asegurar que el contenedor del editor tenga foco para capturar eventos de teclado
      if (this.editorContainer) {
        this.editorContainer.nativeElement.focus();
      }
    }
  }

  changeNoteValue(delta: number): void {
    if (this.selectedNoteIndex >= 0) {
      const note = this.editorNotes[this.selectedNoteIndex];
      if (note.value !== null) {
        note.value = note.value + delta;
        this.updateNotesOutput();
      }
    }
  }

  changeDuration(direction: number, index?: number): void {
    // Usar el índice seleccionado si no se proporciona uno específico
    const noteIndex = index !== undefined ? index : this.selectedNoteIndex;
    
    if (noteIndex < 0 || noteIndex >= this.editorNotes.length) return;
    
    const note = this.editorNotes[noteIndex];
    const currentIndex = this.durations.indexOf(note.duration);
    
    if (currentIndex >= 0) {
      const newIndex = Math.max(0, Math.min(this.durations.length - 1, currentIndex + direction));
      note.duration = this.durations[newIndex];
      
      // Si es el inicio de un grupo, actualizar la duración del grupo
      if (note.groupStart) {
        note.groupDuration = note.duration;
      }
      
      this.updateNotesOutput();
    }
  }

  deleteNote(): void {
    if (this.selectedNoteIndex >= 0) {
      this.editorNotes.splice(this.selectedNoteIndex, 1);
      
      if (this.editorNotes.length === 0) {
        this.editorNotes.push(this.createEmptyNote());
        this.selectedNoteIndex = 0;
      } 
      else if (this.selectedNoteIndex >= this.editorNotes.length) {
        this.selectedNoteIndex = this.editorNotes.length - 1;
      }
      
      this.validateAndFixGroups(); // Asegurar integridad de grupos
      
      if (this.selectedNoteIndex >= 0) {
        this.editorNotes[this.selectedNoteIndex].isSelected = true;
      }
      
      this.updateNotesOutput();
      this.refreshListeners();
    }
  }

  insertNote(): void {
    const newNote = {
      id: this.getNextId(),
      value: 0,
      duration: '4n',
      isSelected: false
    };
    
    if (this.selectedNoteIndex >= 0) {
      this.editorNotes.splice(this.selectedNoteIndex + 1, 0, newNote);
      this.validateAndFixGroups(); // Asegurar integridad de grupos
      this.selectNote(this.selectedNoteIndex + 1);
    } else {
      this.editorNotes.push(newNote);
      this.validateAndFixGroups(); // Asegurar integridad de grupos
      this.selectNote(this.editorNotes.length - 1);
    }
    
    this.updateNotesOutput();
    this.refreshListeners();
  }

  startGroup(): void {
    if (this.selectedNoteIndex < 0 || this.selectedNoteIndex >= this.editorNotes.length) {
      return;
    }
    
    const note = this.editorNotes[this.selectedNoteIndex];
    
    // No permitir marcar como inicio si ya lo es
    if (note.groupStart) return;
    
    // Incrementar el nivel de grupo
    this.currentGroupLevel++;
    this.groupStartIndexes.push(this.selectedNoteIndex);
    
    // Marcar el inicio del grupo
    note.groupStart = true;
    note.groupLevel = this.currentGroupLevel;
    note.groupDuration = note.duration;
    
    // Actualizar la salida sin validar primero, para evitar que se eliminen notas
    this._notes = this.generateOutputString();
    this.notesChange.emit(this._notes);
    
    // Validar y corregir grupos
    setTimeout(() => {
      this.validateAndFixGroups();
      this.refreshListeners();
    }, 0);
  }

  endGroup(): void {
    if (this.selectedNoteIndex < 0 || this.selectedNoteIndex >= this.editorNotes.length) {
      return;
    }
    
    const note = this.editorNotes[this.selectedNoteIndex];
    
    // No permitir marcar como fin si ya lo es
    if (note.groupEnd) return;
    
    // Buscar un grupo abierto para cerrar
    let foundGroupToClose = false;
    let groupLevelToClose: number | undefined;
    
    for (let i = this.selectedNoteIndex - 1; i >= 0; i--) {
      if (this.editorNotes[i].groupStart && !this.isGroupClosed(i, this.selectedNoteIndex - 1, this.editorNotes)) {
        foundGroupToClose = true;
        groupLevelToClose = this.editorNotes[i].groupLevel;
        break;
      }
    }
    
    if (foundGroupToClose && groupLevelToClose !== undefined) {
      // Marcar el fin del grupo
      note.groupEnd = true;
      note.groupLevel = groupLevelToClose;
      
      // Actualizar los índices de grupo
      const startIndex = this.groupStartIndexes.findIndex(idx => 
        idx < this.selectedNoteIndex && 
        this.editorNotes[idx].groupLevel === groupLevelToClose
      );
      
      if (startIndex >= 0) {
        this.groupStartIndexes.splice(startIndex, 1);
        
        // Solo reducir el nivel si no hay más grupos abiertos
        if (this.groupStartIndexes.length === 0) {
          this.currentGroupLevel = 0;
        } else {
          // Recalcular el nivel máximo actual
          this.currentGroupLevel = Math.max(
            ...this.editorNotes
              .filter(n => n.groupStart && n.groupLevel !== undefined)
              .map(n => n.groupLevel as number)
          );
        }
      }
      
      // Actualizar la salida sin validar primero
      this._notes = this.generateOutputString();
      this.notesChange.emit(this._notes);
      
      // Luego validar y corregir
      setTimeout(() => {
        this.validateAndFixGroups();
        this.refreshListeners();
      }, 0);
    }
  }

  // Función auxiliar para verificar si un grupo ya está cerrado
  isGroupClosed(startIndex: number, endIndex: number, notes: EditorNote[]): boolean {
    const startLevel = notes[startIndex].groupLevel;
    
    if (startLevel === undefined) return true;
    
    for (let i = startIndex + 1; i <= endIndex; i++) {
      if (notes[i].groupEnd && notes[i].groupLevel === startLevel) {
        return true;
      }
    }
    
    return false;
  }

  // Método simplificado para seleccionar el inicio de un grupo
  selectGroupStart(index: number): void {
    console.log('Selecting START bracket at index', index);
    
    // Verificar si la nota existe y tiene un corchete de inicio
    if (index < 0 || index >= this.editorNotes.length || !this.editorNotes[index].groupStart) {
      return;
    }
    
    this.selectElement('startBracket', index);
  }

  // Método simplificado para seleccionar el final de un grupo
  selectGroupEnd(index: number): void {
    console.log('Selecting END bracket at index', index);
    
    // Verificar si la nota existe y tiene un corchete de fin
    if (index < 0 || index >= this.editorNotes.length || !this.editorNotes[index].groupEnd) {
      return;
    }
    
    this.selectElement('endBracket', index);
  }

  private getNextId(): number {
    return Math.max(0, ...this.editorNotes.map(n => n.id)) + 1;
  }

  // Método para sanitizar y validar la salida final
  private sanitizeOutput(input: string): string {
    let output = input;
    
    // 1. Asegurar que hay espacios entre todas las notas
    output = output.replace(/(\d+[nt]):(\d+|\-\d+|s)(\d+[nt]):(\d+|\-\d+|s)/g, '$1:$2 $3:$4');
    
    // 2. Eliminar espacios antes de paréntesis de cierre
    output = output.replace(/\s+\)/g, ')');
    
    // 3. Asegurar que hay espacios después de los paréntesis de cierre
    output = output.replace(/\)(\d+[nt])/g, ') $1');
    
    // 4. Verificar balance de paréntesis
    let openCount = 0;
    let closeCount = 0;
    
    for (const char of output) {
      if (char === '(') openCount++;
      if (char === ')') closeCount++;
    }
    
    // 5. Corregir paréntesis si es necesario
    if (openCount > closeCount) {
      // Añadir paréntesis de cierre faltantes
      for (let i = 0; i < openCount - closeCount; i++) {
        output += ')';
      }
    } else if (closeCount > openCount) {
      // Eliminar paréntesis de cierre sobrantes
      let result = '';
      let remaining = closeCount - openCount;
      
      for (const char of output) {
        if (char === ')' && remaining > 0) {
          remaining--;
          continue;
        }
        result += char;
      }
      output = result;
    }
    
    // 6. Evitar valores y duraciones inválidos
    // Reemplazar cualquier duración no reconocida con 4n
    output = output.replace(/(\d+[^nt]):(\d+|\-\d+|s)/g, '4n:$2');
    
    // 7. Eliminar caracteres no válidos
    output = output.replace(/[^\d\s\-\(\):nts]/g, '');
    
    // 8. Convertir corchetes a paréntesis (compatibilidad)
    output = output.replace(/\[/g, '(').replace(/\]/g, ')');
    
    return output;
  }

  updateNotesOutput(): void {
    // Asegurarse de que hay al menos una nota
    if (this.editorNotes.length === 0) {
      this.editorNotes.push(this.createEmptyNote());
      this.selectedNoteIndex = 0;
      return;
    }
    
    // Guardar información sobre el bracket seleccionado antes de validar
    const selectedBracketInfo = {
      index: this.selectedBracketIndex,
      type: this.selectedBracketType,
      level: this.selectedBracketIndex >= 0 ? 
        this.editorNotes[this.selectedBracketIndex].groupLevel : undefined
    };
    
    // Verificar y corregir la integridad de los grupos, pero con cuidado si hay un bracket seleccionado
    this.validateAndFixGroups();
    
    // Restaurar selección de bracket si se ha movido o cambiado
    if (selectedBracketInfo.index >= 0 && selectedBracketInfo.type) {
      // Verificar si el bracket seleccionado todavía existe
      const note = this.editorNotes[selectedBracketInfo.index];
      if (note) {
        if ((selectedBracketInfo.type === 'start' && !note.groupStart) ||
            (selectedBracketInfo.type === 'end' && !note.groupEnd)) {
          // El bracket ha desaparecido, intentar encontrarlo en otra posición
          this.findAndSelectBracketByLevel(selectedBracketInfo.level, selectedBracketInfo.type);
        } else {
          // El bracket sigue ahí, asegurar que está correctamente seleccionado
          this.selectedBracketIndex = selectedBracketInfo.index;
          this.selectedBracketType = selectedBracketInfo.type;
        }
      }
    }
    
    // Si hay un bracket seleccionado, usar el método directo para generar el output
    // para evitar que se pierda la selección durante la validación
    if (this.selectedBracketIndex >= 0 && this.selectedBracketType) {
      this._notes = this.generateOutputString();
      this.notesChange.emit(this._notes);
      
      setTimeout(() => {
        this.highlightSelectedElement();
        this.refreshListeners();
      }, 0);
      return;
    }
    
    // De lo contrario, generar la salida con el enfoque normal
    this._notes = this.generateOutputString();
    this.notesChange.emit(this._notes);
    
    // Añadir listeners después de actualizar las notas
    this.refreshListeners();
  }
  
  // Método auxiliar para encontrar un bracket por su nivel
  private findAndSelectBracketByLevel(level: number | undefined, type: 'start' | 'end'): void {
    if (level === undefined) return;
    
    console.log(`Buscando bracket de tipo ${type} con nivel ${level}`);
    
    // Primero buscamos en el mismo índice actual o cercano
    if (this.selectedBracketIndex >= 0) {
      // Buscar en un rango de 3 posiciones antes y después
      const rangeStart = Math.max(0, this.selectedBracketIndex - 3);
      const rangeEnd = Math.min(this.editorNotes.length - 1, this.selectedBracketIndex + 3);
      
      for (let i = rangeStart; i <= rangeEnd; i++) {
        const note = this.editorNotes[i];
        if (note.groupLevel === level) {
          if ((type === 'start' && note.groupStart) || 
              (type === 'end' && note.groupEnd)) {
            console.log(`¡Encontrado bracket cercano en índice ${i}!`);
            this.selectedBracketIndex = i;
            this.selectedBracketType = type;
            this.highlightSelectedElement();
            return;
          }
        }
      }
    }
    
    // Si no lo encontramos cerca, buscar en todo el array
    for (let i = 0; i < this.editorNotes.length; i++) {
      const note = this.editorNotes[i];
      if (note.groupLevel === level) {
        if ((type === 'start' && note.groupStart) || 
            (type === 'end' && note.groupEnd)) {
          console.log(`¡Encontrado bracket en índice ${i}!`);
          this.selectedBracketIndex = i;
          this.selectedBracketType = type;
          
          // Forzar actualización visual
          setTimeout(() => {
            this.highlightSelectedElement();
          }, 10);
          
          return;
        }
      }
    }
    
    console.log(`No se encontró ningún bracket de tipo ${type} con nivel ${level}`);
    
    // Si no encontramos ninguno del mismo nivel, deseleccionar
    this.selectedBracketIndex = -1;
    this.selectedBracketType = null;
  }

  // Método para validar y corregir grupos de forma más simple
  validateAndFixGroups(): void {
    // Si no hay notas, no hay nada que validar
    if (this.editorNotes.length === 0) {
      return;
    }

    // 1. Identificar los niveles de grupo existentes
    const levels = new Set<number>();
    for (const note of this.editorNotes) {
      if (note.groupLevel !== undefined) {
        levels.add(note.groupLevel);
      }
    }

    // Guardar los niveles en un array para ordenarlos
    const levelArray = Array.from(levels).sort((a, b) => a - b);

    // 2. Para cada nivel, asegurar que hay un inicio y un fin correspondiente
    for (const level of levelArray) {
      let hasStart = false;
      let hasEnd = false;
      let startIndex = -1;
      let endIndex = -1;

      // Encontrar si el nivel tiene un inicio y un fin
      for (let i = 0; i < this.editorNotes.length; i++) {
        const note = this.editorNotes[i];
        if (note.groupLevel === level) {
          if (note.groupStart) {
            hasStart = true;
            startIndex = i;
          }
          if (note.groupEnd) {
            hasEnd = true;
            endIndex = i;
          }
        }
      }

      // Corregir si falta inicio o fin
      if (hasStart && !hasEnd) {
        // Si hay inicio pero no fin, añadir el fin en la última nota
        this.editorNotes[this.editorNotes.length - 1].groupEnd = true;
        this.editorNotes[this.editorNotes.length - 1].groupLevel = level;
        endIndex = this.editorNotes.length - 1;
      } else if (!hasStart && hasEnd) {
        // Si hay fin pero no inicio, añadir el inicio en la primera nota
        this.editorNotes[0].groupStart = true;
        this.editorNotes[0].groupLevel = level;
        // Asegurar que tenga una duración por defecto
        this.editorNotes[0].groupDuration = this.editorNotes[0].groupDuration || '4n';
        startIndex = 0;
      } else if (!hasStart && !hasEnd) {
        // Si no hay ni inicio ni fin, eliminar cualquier nota con este nivel
        for (const note of this.editorNotes) {
          if (note.groupLevel === level) {
            delete note.groupLevel;
          }
        }
        continue; // Continuar con el siguiente nivel
      }

      // Si el fin viene antes que el inicio, corregirlo
      if (startIndex > endIndex) {
        // Quitar el fin y el inicio actuales
        this.editorNotes[startIndex].groupStart = false;
        this.editorNotes[endIndex].groupEnd = false;
        
        // Colocarlos en el orden correcto
        this.editorNotes[endIndex].groupStart = true;
        this.editorNotes[endIndex].groupLevel = level;
        this.editorNotes[endIndex].groupDuration = this.editorNotes[startIndex].groupDuration || '4n';
        
        this.editorNotes[startIndex].groupEnd = true;
        this.editorNotes[startIndex].groupLevel = level;
        
        // Actualizar los índices
        [startIndex, endIndex] = [endIndex, startIndex];
      }
      
      // Asegurar que todas las notas entre el inicio y el fin tengan el nivel correcto
      for (let i = startIndex + 1; i < endIndex; i++) {
        if (this.editorNotes[i].groupLevel === undefined || 
            this.editorNotes[i].groupLevel === level) {
          this.editorNotes[i].groupLevel = level;
        }
      }
    }

    // 3. Reconstruir el array de índices de inicio de grupo y calcular el nivel máximo
    this.groupStartIndexes = [];
    let maxLevel = 0;
    
    for (let i = 0; i < this.editorNotes.length; i++) {
      const note = this.editorNotes[i];
      if (note.groupStart) {
        this.groupStartIndexes.push(i);
        if (note.groupLevel !== undefined && note.groupLevel > maxLevel) {
          maxLevel = note.groupLevel;
        }
      }
    }
    
    this.currentGroupLevel = maxLevel;
  }

  // Este método ya no se utiliza para aplicar clases específicas
  // pero podemos mantenerlo por si se necesita en el futuro
  getDurationClass(duration: string): string {
    return ''; // Ya no devolvemos clases específicas
  }

  toggleNoteSilence(index: number): void {
    if (index >= 0 && index < this.editorNotes.length) {
      const note = this.editorNotes[index];
      note.value = note.value === null ? 1 : null;
      this.updateNotesOutput();
    }
  }

  onChangeDuration(index: number, duration: string): void {
    if (index >= 0 && index < this.editorNotes.length) {
      this.editorNotes[index].duration = duration;
      
      // Si es el inicio de un grupo, actualizar la duración del grupo
      if (this.editorNotes[index].groupStart) {
        this.editorNotes[index].groupDuration = duration;
      }
      
      this.updateNotesOutput();
    }
  }

  // Método auxiliar para manejar el evento change del select
  handleDurationChange(event: Event, index: number): void {
    const selectElement = event.target as HTMLSelectElement;
    if (selectElement) {
      this.onChangeDuration(index, selectElement.value);
    }
  }

  // Método para manejar el cambio de duración con la rueda del ratón
  handleDurationWheel(event: WheelEvent, index: number): void {
    // Prevenir el scroll de la página
    event.preventDefault();
    
    // Determinar la dirección INVERTIDA: 
    // arriba (wheel arriba, deltaY negativo) = nota más larga = dirección -1
    // abajo (wheel abajo, deltaY positivo) = nota más corta = dirección 1
    const direction = event.deltaY < 0 ? -1 : 1;
    
    // Usar la función existente para cambiar la duración
    this.changeDuration(direction, index);
  }

  // Método para manejar las teclas cuando un corchete está seleccionado
  handleBracketKeyDown(event: KeyboardEvent): boolean {
    // Si no hay corchete seleccionado, no procesamos
    if (this.selectedBracketIndex < 0 || !this.selectedBracketType) return false;
    
    // Asegurarnos de que la nota existe
    if (this.selectedBracketIndex >= this.editorNotes.length) return false;
    
    const note = this.editorNotes[this.selectedBracketIndex];
    const isStart = this.selectedBracketType === 'start';
    
    // Procesamos teclas específicas para corchetes
    if (event.shiftKey) {
      switch (event.key) {
        case 'ArrowLeft':
          this.moveGroupBracket('left');
          return true;
          
        case 'ArrowRight':
          this.moveGroupBracket('right');
          return true;
          
        case 'ArrowUp':
        case 'ArrowDown':
          if (isStart) {
            // Cambiar duración del grupo solo para brackets iniciales
            const direction = event.key === 'ArrowUp' ? 'increase' : 'decrease';
            this.changeGroupDuration(direction);
            return true;
          }
          break;
      }
    }
    
    return false;
  }
  
  // Método para mover un corchete de grupo
  moveGroupBracket(direction: 'left' | 'right'): void {
    if (this.selectedBracketIndex < 0 || this.selectedBracketType === null) {
      console.log('No bracket selected to move');
      return;
    }
    
    const currentIndex = this.selectedBracketIndex;
    const currentNote = this.editorNotes[currentIndex];
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    
    // Validar que el nuevo índice es válido
    if (newIndex < 0 || newIndex >= this.editorNotes.length) {
      console.log('Cannot move bracket outside bounds');
      return;
    }
    
    console.log(`Moving bracket from ${currentIndex} to ${newIndex}, type: ${this.selectedBracketType}`);
    
    // Verificar si el bracket existe
    if ((this.selectedBracketType === 'start' && !currentNote.groupStart) ||
        (this.selectedBracketType === 'end' && !currentNote.groupEnd)) {
      console.log('Selected bracket does not exist at index', currentIndex);
      return;
    }
    
    // Guardar información crítica
    const bracketType = this.selectedBracketType;
    const level = currentNote.groupLevel;
    const duration = currentNote.groupDuration;
    
    // Encontrar el bracket correspondiente para validación
    if (bracketType === 'start') {
      // Buscar el fin correspondiente
      let endIndex = -1;
      for (let i = 0; i < this.editorNotes.length; i++) {
        if (i !== currentIndex && this.editorNotes[i].groupEnd && 
            this.editorNotes[i].groupLevel === level) {
          endIndex = i;
        }
      }
      
      // Validar que no nos pasemos del final (si existe)
      if (endIndex !== -1 && newIndex >= endIndex) {
        console.log('Cannot move start bracket past end bracket');
        return;
      }
      
      // Permitir grupos de una sola nota (inicio y fin en la misma nota)
      // Solo validamos que no avancemos más allá del fin del grupo
      
      // Mover inicio -> quitar actual, poner nuevo
      currentNote.groupStart = false;
      
      // Mantener nivel si también es un fin
      if (currentNote.groupEnd) {
        console.log('Original note is also end bracket, preserving groupLevel');
      } else {
        currentNote.groupLevel = undefined;
      }
      
      // Quitar duración si no es fin también
      if (!currentNote.groupEnd) {
        currentNote.groupDuration = undefined;
      }
      
      // Establecer nuevo bracket
      this.editorNotes[newIndex].groupStart = true;
      this.editorNotes[newIndex].groupLevel = level;
      this.editorNotes[newIndex].groupDuration = duration;
      
    } else { // bracketType === 'end'
      // Buscar el inicio correspondiente
      let startIndex = -1;
      for (let i = 0; i < this.editorNotes.length; i++) {
        if (i !== currentIndex && this.editorNotes[i].groupStart && 
            this.editorNotes[i].groupLevel === level) {
          startIndex = i;
        }
      }
      
      // Validar que no nos pasemos del inicio (si existe)
      if (startIndex !== -1 && newIndex <= startIndex) {
        console.log('Cannot move end bracket before start bracket');
        return;
      }
      
      // Permitir grupos de una sola nota (inicio y fin en la misma nota)
      // Solo validamos que no retrocedamos más allá del inicio del grupo
      
      // Mover fin -> quitar actual, poner nuevo
      currentNote.groupEnd = false;
      
      // Mantener nivel si también es un inicio
      if (currentNote.groupStart) {
        console.log('Original note is also start bracket, preserving groupLevel');
      } else {
        currentNote.groupLevel = undefined;
      }
      
      // Establecer nuevo bracket
      this.editorNotes[newIndex].groupEnd = true;
      this.editorNotes[newIndex].groupLevel = level;
    }
    
    // Actualizar selección
    this.selectedBracketIndex = newIndex;
    
    console.log('Before updating notes, groupLevel at new position:', this.editorNotes[newIndex].groupLevel);
    
    // Actualizar salida sin validación inmediata para evitar perder brackets
    this._notes = this.generateOutputString();
    this.notesChange.emit(this._notes);
    
    // Retrasar la validación para permitir que la UI se actualice primero
    setTimeout(() => {
      // Suave validación que mantenga los brackets seleccionados intactos
      this.validateGroupsButPreserveSelection();
      
      // Refrescar la visualización
      this.highlightSelectedElement();
      this.refreshListeners();
    }, 0);
  }
  
  // Versión especial de validación que preserva la selección actual
  private validateGroupsButPreserveSelection(): void {
    // Guardar referencia al bracket seleccionado
    const selectedBracketInfo = {
      index: this.selectedBracketIndex,
      type: this.selectedBracketType,
      level: this.selectedBracketIndex >= 0 ? 
        this.editorNotes[this.selectedBracketIndex].groupLevel : undefined
    };
    
    // Ejecutar validación estándar
    this.validateAndFixGroups();
    
    // Verificar si el bracket seleccionado sigue existiendo
    if (selectedBracketInfo.index >= 0 && selectedBracketInfo.type) {
      const note = this.editorNotes[selectedBracketInfo.index];
      if (note) {
        if ((selectedBracketInfo.type === 'start' && !note.groupStart) ||
            (selectedBracketInfo.type === 'end' && !note.groupEnd)) {
          // El bracket ha desaparecido, buscarlo por su nivel
          this.findAndSelectBracketByLevel(selectedBracketInfo.level, selectedBracketInfo.type);
        }
      }
    }
  }
  
  // Generar string de salida sin pasar por toda la lógica de validación
  private generateOutputString(): string {
    let result = '';
    
    // Un mapa para mantener los grupos abiertos y sus notas
    const openGroups: Map<number, {duration: string, notes: string[]}> = new Map();
    
    // Primera pasada: recopilar notas simples y grupos
    for (let i = 0; i < this.editorNotes.length; i++) {
      const note = this.editorNotes[i];
      let noteAdded = false;
      
      // Si es inicio de un grupo, inicializarlo y generar el marcador de grupo
      if (note.groupStart && note.groupLevel !== undefined) {
        // Crear un nuevo grupo con duración pero sin notas aún
        openGroups.set(note.groupLevel, {
          duration: note.groupDuration || '4n',
          notes: []
        });
      }
      
      // Si la nota está dentro de un grupo existente, añadirla a ese grupo
      if (note.groupLevel !== undefined) {
        const groupData = openGroups.get(note.groupLevel);
        if (groupData) {
          // Crear representación de la nota
          const noteStr = note.value === null ? `${note.duration}:s` : `${note.duration}:${note.value}`;
          
          // Añadir la nota al grupo
          groupData.notes.push(noteStr);
          noteAdded = true;
        }
      }
      
      // Si es fin de un grupo, cerrarlo y añadirlo al resultado
      if (note.groupEnd && note.groupLevel !== undefined) {
        const groupData = openGroups.get(note.groupLevel);
        if (groupData) {
          // Formatear el grupo y añadirlo al resultado
          // Formato esperado: 4n:(nota1 nota2 nota3)
          const groupStr = `${groupData.duration}:(${groupData.notes.join(' ')})`;
          result += result ? ` ${groupStr}` : groupStr;
          
          // Eliminar el grupo del mapa
          openGroups.delete(note.groupLevel);
          
          // Ya lo hemos añadido como parte del grupo, marcar como añadido
          noteAdded = true;
        }
      }
      
      // Si la nota no se añadió como parte de un grupo, añadirla directamente al resultado
      if (!noteAdded) {
        const noteStr = note.value === null ? `${note.duration}:s` : `${note.duration}:${note.value}`;
        result += result ? ` ${noteStr}` : noteStr;
      }
    }
    
    // Segunda pasada: asegurarnos de cerrar todos los grupos que quedaron abiertos
    openGroups.forEach((groupData) => {
      const groupStr = `${groupData.duration}:(${groupData.notes.join(' ')})`;
      result += result ? ` ${groupStr}` : groupStr;
    });
    
    return result;
  }

  changeGroupDuration(direction: 'increase' | 'decrease'): void {
    if (this.selectedBracketIndex < 0 || this.selectedBracketType !== 'start') {
      return;
    }
    
    const note = this.editorNotes[this.selectedBracketIndex];
    if (!note.groupStart) {
      return;
    }
    
    // Obtener la duración actual
    const currentDuration = note.groupDuration || '4n';
    
    // Lista de duraciones posibles
    const durations = ['1n', '2n', '4n', '8n', '16n', '32n'];
    
    // Encontrar el índice actual
    let currentIndex = durations.indexOf(currentDuration);
    if (currentIndex === -1) {
      // Si la duración no está en la lista, usar 4n por defecto
      currentIndex = 2; // índice de '4n'
    }
    
    // Calcular el nuevo índice según la dirección
    let newIndex;
    if (direction === 'increase') {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(durations.length - 1, currentIndex + 1);
    }
    
    // Actualizar la duración
    note.groupDuration = durations[newIndex];
    
    // Actualizar la salida
    this.updateNotesOutput();
    
    // Refrescar la visualización
    this.highlightSelectedElement();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Solo para depuración
    console.log('Document clicked, target:', event.target);
    
    // Si el elemento clickeado es un corchete, podemos usar esta oportunidad para detectarlo
    const target = event.target as HTMLElement;
    if (target) {
      // Buscar brackets con las nuevas clases
      if (target.closest('.group-start')) {
        console.log('CLICKED ON START BRACKET!');
        const bracketElement = target.closest('.group-start') as HTMLElement;
        const index = bracketElement.getAttribute('data-index');
        if (index) {
          const bracketIndex = parseInt(index, 10);
          if (!isNaN(bracketIndex)) {
            console.log('Selecting start bracket with index:', bracketIndex);
            this.selectGroupStart(bracketIndex);
            event.stopPropagation();
            return;
          }
        }
      } else if (target.closest('.group-end')) {
        console.log('CLICKED ON END BRACKET!');
        const bracketElement = target.closest('.group-end') as HTMLElement;
        const index = bracketElement.getAttribute('data-index');
        if (index) {
          const bracketIndex = parseInt(index, 10);
          if (!isNaN(bracketIndex)) {
            console.log('Selecting end bracket with index:', bracketIndex);
            this.selectGroupEnd(bracketIndex);
            event.stopPropagation();
            return;
          }
        }
      }
      
      // Compatibilidad para las clases antiguas
      if (target.closest('.group-bracket-start')) {
        console.log('CLICKED ON OLD START BRACKET!');
        // Intentar encontrar el índice correspondiente
        this.findAndSelectBracket(target, 'start');
        event.stopPropagation();
      } else if (target.closest('.group-bracket-end')) {
        console.log('CLICKED ON OLD END BRACKET!');
        // Intentar encontrar el índice correspondiente
        this.findAndSelectBracket(target, 'end');
        event.stopPropagation();
      }
    }
  }
  
  // Método auxiliar para encontrar y seleccionar un corchete por su elemento DOM
  private findAndSelectBracket(bracketElement: HTMLElement, bracketType: 'start' | 'end'): void {
    // Encontrar el índice de la nota que contiene este corchete
    const bracketsContainer = bracketElement.closest('.notes-container');
    if (!bracketsContainer) return;
    
    // Obtener todos los hijos de este contenedor que sean corchetes
    const allBrackets = bracketType === 'start' 
      ? bracketsContainer.querySelectorAll('.group-bracket-start')
      : bracketsContainer.querySelectorAll('.group-bracket-end');
    
    // Encontrar el índice del corchete clickeado
    const bracketIndex = Array.from(allBrackets).indexOf(bracketElement.closest(bracketType === 'start' ? '.group-bracket-start' : '.group-bracket-end') as HTMLElement);
    
    if (bracketIndex !== -1) {
      console.log(`Found ${bracketType} bracket at DOM index:`, bracketIndex);
      
      // Buscar la nota correspondiente en nuestro array de editorNotes
      let foundIndex = -1;
      let count = 0;
      
      for (let i = 0; i < this.editorNotes.length; i++) {
        if ((bracketType === 'start' && this.editorNotes[i].groupStart) ||
            (bracketType === 'end' && this.editorNotes[i].groupEnd)) {
          if (count === bracketIndex) {
            foundIndex = i;
            break;
          }
          count++;
        }
      }
      
      if (foundIndex !== -1) {
        console.log(`Found matching note index:`, foundIndex);
        if (bracketType === 'start') {
          this.selectGroupStart(foundIndex);
        } else {
          this.selectGroupEnd(foundIndex);
        }
      }
    }
  }
} 