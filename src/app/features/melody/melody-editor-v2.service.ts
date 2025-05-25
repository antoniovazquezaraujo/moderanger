import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { MusicElement, SingleNote, NoteDuration } from '../../model/melody';
import { NoteData } from '../../model/note';

// New specialized services
import { MelodyElementManagerService } from './melody-element-manager.service';
import { MelodySelectionService, SelectionState } from './melody-selection.service';
import { MelodyGroupManagerService } from './melody-group-manager.service';
import { MelodyDataConverterService, ConversionOptions, StructureAnalysis, ValidationResult } from './melody-data-converter.service';

export interface MelodyEditorState {
  elements: MusicElement[];
  selection: SelectionState;
  isReady: boolean;
  elementCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class MelodyEditorV2Service {
  private readonly serviceInstanceId = Math.random().toString(36).substring(2, 7);

  // Combined state observable
  readonly state$: Observable<MelodyEditorState>;

  // Convenience observables (delegated from child services)
  readonly elements$ = this.elementManager.elements$;
  readonly selectedElementId$ = this.selectionManager.selectedElementId$;

  constructor(
    private elementManager: MelodyElementManagerService,
    private selectionManager: MelodySelectionService,
    private groupManager: MelodyGroupManagerService,
    private dataConverter: MelodyDataConverterService
  ) {
    console.log(`[MelodyEditorV2 INSTANCE ${this.serviceInstanceId}] Created`);

    // Combine all states into a single observable
    this.state$ = combineLatest([
      this.elementManager.elements$,
      this.selectionManager.selectionState$
    ]).pipe(
      map(([elements, selection]) => ({
        elements,
        selection,
        isReady: true,
        elementCount: elements.length
      }))
    );
  }

  // ============= PUBLIC API =============

  /**
   * Get current elements
   */
  getElements(): MusicElement[] {
    return this.elementManager.getElements();
  }

  /**
   * Load elements from external source
   */
  loadElements(elements: MusicElement[]): void {
    console.log(`[MelodyEditorV2] Loading ${elements.length} elements`);
    this.elementManager.loadElements(elements);
    this.selectionManager.clearSelection();
  }

  /**
   * Clear all elements
   */
  clearElements(): void {
    console.log('[MelodyEditorV2] Clearing all elements');
    this.elementManager.loadElements([]);
    this.selectionManager.clearSelection();
  }

  // ============= ELEMENT MANAGEMENT (Delegated) =============

  /**
   * Add a new note
   */
  addNote(noteData: Partial<SingleNote>, duration: NoteDuration): string {
    const id = this.elementManager.addNote(noteData, duration);
    this.selectionManager.selectElement(id);
    return id;
  }

  /**
   * Add a note after a specific element
   */
  addNoteAfter(targetId: string, noteData: Partial<SingleNote>, duration: NoteDuration): string | null {
    const id = this.elementManager.addNoteAfter(targetId, noteData, duration);
    if (id) {
      this.selectionManager.selectElement(id);
    }
    return id;
  }

  /**
   * Add a note to a group
   */
  addNoteToGroup(groupId: string, noteData: Partial<SingleNote>, duration: NoteDuration): string | null {
    const id = this.elementManager.addNoteToGroup(groupId, noteData, duration);
    if (id) {
      this.selectionManager.selectElement(id);
    }
    return id;
  }

  /**
   * Remove an element
   */
  removeNote(id: string): void {
    const wasSelected = this.selectionManager.isSelected(id);
    
    if (this.elementManager.removeElement(id)) {
      if (wasSelected) {
        this.selectionManager.clearSelection();
      }
      console.log(`[MelodyEditorV2] Element ${id} removed`);
    }
  }

  /**
   * Update an element
   */
  updateNote(id: string, changes: Partial<MusicElement>): void {
    if (this.elementManager.updateElement(id, changes)) {
      console.log(`[MelodyEditorV2] Element ${id} updated`);
    }
  }

  // ============= SELECTION MANAGEMENT (Delegated) =============

  /**
   * Select an element
   */
  selectNote(id: string | null): void {
    this.selectionManager.selectElement(id);
  }

  /**
   * Get selected element ID
   */
  get selectedElementId(): string | null {
    return this.selectionManager.selectedElementId;
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectionManager.clearSelection();
  }

  /**
   * Select next/previous elements
   */
  selectNext(): string | null {
    return this.selectionManager.selectNext(this.getElements());
  }

  selectPrevious(): string | null {
    return this.selectionManager.selectPreviousInList(this.getElements());
  }

  // ============= GROUP MANAGEMENT (Delegated) =============

  /**
   * Start a new group
   */
  startGroup(duration: NoteDuration, afterVisualElementId?: string | null): string {
    const groupId = this.groupManager.startGroup(duration, afterVisualElementId);
    this.selectionManager.selectElement(groupId);
    return groupId;
  }

  /**
   * Move group boundaries
   */
  moveGroupStartLeft(groupId: string): void {
    this.groupManager.moveGroupStartLeft(groupId);
  }

  moveGroupStartRight(groupId: string): void {
    this.groupManager.moveGroupStartRight(groupId);
  }

  moveGroupEndLeft(groupId: string): void {
    this.groupManager.moveGroupEndLeft(groupId);
  }

  moveGroupEndRight(groupId: string): void {
    this.groupManager.moveGroupEndRight(groupId);
  }

  /**
   * Remove group and promote children
   */
  removeGroupAndPromoteChildren(groupId: string): void {
    if (this.groupManager.removeGroupAndPromoteChildren(groupId)) {
      this.selectionManager.clearSelection();
      console.log(`[MelodyEditorV2] Group ${groupId} removed and children promoted`);
    }
  }

  /**
   * Move elements left/right
   */
  moveElementLeft(id: string): void {
    this.groupManager.moveElementLeft(id);
  }

  moveElementRight(id: string): void {
    this.groupManager.moveElementRight(id);
  }

  // ============= DATA CONVERSION (Delegated) =============

  /**
   * Convert to NoteData array
   */
  toNoteData(): NoteData[] {
    return this.dataConverter.toNoteData(this.getElements());
  }

  /**
   * Load from NoteData array
   */
  loadFromNoteData(noteData: NoteData[]): void {
    console.log(`[MelodyEditorV2] Loading from ${noteData.length} NoteData items`);
    const elements = this.dataConverter.fromNoteData(noteData);
    this.loadElements(elements);
  }

  /**
   * Export to JSON
   */
  exportToJSON(options?: ConversionOptions): string {
    return this.dataConverter.toJSON(this.getElements(), options);
  }

  /**
   * Import from JSON
   */
  importFromJSON(jsonString: string, options?: ConversionOptions): void {
    const elements = this.dataConverter.fromJSON(jsonString, options);
    this.loadElements(elements);
  }

  /**
   * Flatten all groups
   */
  flattenGroups(): void {
    const flattened = this.dataConverter.flatten(this.getElements());
    this.loadElements(flattened);
    console.log('[MelodyEditorV2] All groups flattened');
  }

  /**
   * Analyze structure
   */
  analyzeStructure(): StructureAnalysis {
    return this.dataConverter.analyzeStructure(this.getElements());
  }

  /**
   * Validate structure
   */
  validateStructure(): ValidationResult {
    return this.dataConverter.validateStructure(this.getElements());
  }

  // ============= CONVENIENCE GETTERS =============

  /**
   * Get count of elements
   */
  get elementCount(): number {
    return this.elementManager.countElements();
  }

  /**
   * Check if melody is empty
   */
  get isEmpty(): boolean {
    return this.getElements().length === 0;
  }

  /**
   * Get selected element
   */
  get selectedElement(): MusicElement | null {
    const selectedId = this.selectedElementId;
    if (!selectedId) return null;
    
    const { element } = this.elementManager.findElementAndParent(selectedId);
    return element;
  }

  /**
   * Check if structure is valid
   */
  get isValid(): boolean {
    return this.validateStructure().isValid;
  }

  // ============= UTILITY METHODS =============

  /**
   * Find element and parent by ID
   */
  findElementAndParent(elementId: string): { element: MusicElement | null, parent: MusicElement | null } {
    return this.elementManager.findElementAndParent(elementId);
  }

  /**
   * Clone current melody
   */
  clone(): MusicElement[] {
    const json = this.exportToJSON();
    return this.dataConverter.fromJSON(json);
  }

  /**
   * Reset to empty state
   */
  reset(): void {
    console.log('[MelodyEditorV2] Resetting to empty state');
    this.clearElements();
    this.selectionManager.clearHistory();
  }

  /**
   * Get service info for debugging
   */
  getServiceInfo(): any {
    return {
      instanceId: this.serviceInstanceId,
      elementCount: this.elementCount,
      selectedElementId: this.selectedElementId,
      isEmpty: this.isEmpty,
      isValid: this.isValid,
      structure: this.analyzeStructure()
    };
  }
} 