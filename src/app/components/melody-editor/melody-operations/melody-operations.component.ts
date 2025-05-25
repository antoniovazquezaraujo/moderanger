import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MusicElement, NoteDuration, SingleNote, GenericGroup } from '../../../model/melody';
import { MelodyEditorV2Service } from '../../../features/melody/melody-editor-v2.service';
import { KeyboardAction } from '../melody-keyboard-handler/melody-keyboard-handler.component';

export interface OperationResult {
  success: boolean;
  newSelectedId?: string | null;
  elementsChanged?: boolean;
  message?: string;
}

/**
 * 🔧 MelodyOperationsComponent
 * 
 * SINGLE RESPONSIBILITY: Melody operations and business logic
 * - Handles all CRUD operations on melody elements
 * - Manages note value and duration changes
 * - Coordinates group operations (create, move boundaries)
 * - Provides element manipulation (move, delete, insert)
 * - Maintains business rules and validation
 */
@Component({
  selector: 'app-melody-operations',
  template: `
    <!-- This component handles operations but has no visual template -->
    <div class="operations-manager" style="display: none;">
      <!-- Operations are handled programmatically -->
    </div>
  `
})
export class MelodyOperationsComponent {
  @Input() elements: MusicElement[] = [];
  @Input() selectedElementId: string | null = null;
  @Input() defaultDuration: NoteDuration = '4n';

  @Output() operationResult = new EventEmitter<OperationResult>();
  @Output() elementsChange = new EventEmitter<void>();

  readonly durations: NoteDuration[] = ['1n', '2n', '4n', '8n', '16n', '4t', '8t'];
  readonly noteValues = [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  constructor(private melodyEditorService: MelodyEditorV2Service) {}

  /**
   * Handle keyboard actions by converting them to specific operations
   */
  handleKeyboardAction(action: KeyboardAction): void {
    console.log('[MelodyOperations] Handling keyboard action:', action);

    let result: OperationResult;

    switch (action.type) {
      case 'increase-note':
        result = this.increaseNote(action.elementId!);
        break;
      case 'decrease-note':
        result = this.decreaseNote(action.elementId!);
        break;
      case 'toggle-silence':
        result = this.toggleSilence(action.elementId!);
        break;
      case 'delete-note':
        result = this.deleteElement(action.elementId!);
        break;
      case 'insert-note':
        result = this.insertNote();
        break;
      case 'start-group':
        result = this.startNewGroup();
        break;
      default:
        result = { success: false, message: `Unhandled action type: ${action.type}` };
    }

    this.operationResult.emit(result);

    if (result.elementsChanged) {
      this.elementsChange.emit();
    }
  }

  private increaseNote(elementId: string): OperationResult {
    const element = this.findElementRecursive(elementId, this.elements);
    if (!element || (element.type !== 'note' && element.type !== 'rest')) {
      return { success: false, message: 'Element not found or not a note/rest' };
    }

    const singleNote = element as SingleNote;
    const currentValue = singleNote.value ?? 0;
    const currentIndex = this.noteValues.indexOf(currentValue);
    
    let newValue: number;
    if (currentIndex === -1 || currentIndex === this.noteValues.length - 1) {
      newValue = this.noteValues[0]; // Wrap to beginning
    } else {
      newValue = this.noteValues[currentIndex + 1];
    }

    this.melodyEditorService.updateNote(elementId, { value: newValue });
    
    return { 
      success: true, 
      elementsChanged: true,
      message: `Increased note value to ${newValue}` 
    };
  }

  private decreaseNote(elementId: string): OperationResult {
    const element = this.findElementRecursive(elementId, this.elements);
    if (!element || (element.type !== 'note' && element.type !== 'rest')) {
      return { success: false, message: 'Element not found or not a note/rest' };
    }

    const singleNote = element as SingleNote;
    const currentValue = singleNote.value ?? 0;
    const currentIndex = this.noteValues.indexOf(currentValue);
    
    let newValue: number;
    if (currentIndex === -1 || currentIndex === 0) {
      newValue = this.noteValues[this.noteValues.length - 1]; // Wrap to end
    } else {
      newValue = this.noteValues[currentIndex - 1];
    }

    this.melodyEditorService.updateNote(elementId, { value: newValue });
    
    return { 
      success: true, 
      elementsChanged: true,
      message: `Decreased note value to ${newValue}` 
    };
  }

  private toggleSilence(elementId: string): OperationResult {
    const element = this.findElementRecursive(elementId, this.elements);
    if (!element || (element.type !== 'note' && element.type !== 'rest')) {
      return { success: false, message: 'Element not found or not a note/rest' };
    }

    const singleNote = element as SingleNote;
    const newValue = singleNote.value === null ? 0 : null;
    
    this.melodyEditorService.updateNote(elementId, { value: newValue });
    
    return { 
      success: true, 
      elementsChanged: true,
      message: `Toggled silence: ${newValue === null ? 'silent' : 'audible'}` 
    };
  }

  private insertNote(): OperationResult {
    const newNoteId = this.melodyEditorService.addNote({ value: 0 }, this.defaultDuration);
    
    return { 
      success: true, 
      elementsChanged: true,
      newSelectedId: newNoteId,
      message: 'Inserted new note' 
    };
  }

  private deleteElement(elementId: string): OperationResult {
    const elementExists = this.findElementRecursive(elementId, this.elements);
    if (!elementExists) {
      return { success: false, message: 'Element not found' };
    }

    this.melodyEditorService.removeNote(elementId);
    
    return { 
      success: true, 
      elementsChanged: true,
      newSelectedId: null,
      message: 'Deleted element' 
    };
  }

  private startNewGroup(): OperationResult {
    const newGroupId = this.melodyEditorService.startGroup(this.defaultDuration, this.selectedElementId);
    
    return { 
      success: true, 
      elementsChanged: true,
      newSelectedId: `${newGroupId}_start`,
      message: 'Started new group' 
    };
  }

  private findElementRecursive(id: string, els: MusicElement[]): MusicElement | null {
    for (const el of els) {
      if (el.id === id) return el;
      if (el.type === 'group' && (el as GenericGroup).children) {
        const found = this.findElementRecursive(id, (el as GenericGroup).children!);
        if (found) return found;
      }
    }
    return null;
  }

  addNewNote(): OperationResult {
    return this.insertNote();
  }
} 