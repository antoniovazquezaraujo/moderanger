import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MusicElement } from '../../model/melody';

export interface SelectionState {
  selectedElementId: string | null;
  selectedElement: MusicElement | null;
  selectionHistory: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MelodySelectionService {
  private readonly selectedElementIdSubject = new BehaviorSubject<string | null>(null);
  private readonly selectionHistory: string[] = [];
  private readonly maxHistorySize = 10;

  // Public observables
  readonly selectedElementId$ = this.selectedElementIdSubject.asObservable();
  readonly selectionState$: Observable<SelectionState>;

  constructor() {
    // Combine selection state
    this.selectionState$ = this.selectedElementId$.pipe(
      map(id => ({
        selectedElementId: id,
        selectedElement: null, // Will be populated by caller
        selectionHistory: [...this.selectionHistory]
      }))
    );

    console.log('[MelodySelection] Service initialized');
  }

  // ============= PUBLIC API =============

  /**
   * Get currently selected element ID
   */
  get selectedElementId(): string | null {
    return this.selectedElementIdSubject.value;
  }

  /**
   * Select an element by ID
   */
  selectElement(id: string | null): void {
    const currentSelection = this.selectedElementIdSubject.value;
    
    // Only emit if the selection actually changes
    if (id !== currentSelection) {
      // Add to history if it's a valid selection
      if (currentSelection) {
        this.addToHistory(currentSelection);
      }
      
      this.selectedElementIdSubject.next(id);
      console.log(`[MelodySelection] Element selected: ${id}`);
    }
  }

  /**
   * Clear current selection
   */
  clearSelection(): void {
    this.selectElement(null);
  }

  /**
   * Check if an element is currently selected
   */
  isSelected(id: string): boolean {
    return this.selectedElementIdSubject.value === id;
  }

  /**
   * Get selection history
   */
  getSelectionHistory(): string[] {
    return [...this.selectionHistory];
  }

  /**
   * Go back to previous selection
   */
  selectPrevious(): string | null {
    if (this.selectionHistory.length === 0) {
      console.log('[MelodySelection] No previous selection available');
      return null;
    }

    const previousId = this.selectionHistory.pop()!;
    this.selectedElementIdSubject.next(previousId);
    
    console.log(`[MelodySelection] Selected previous element: ${previousId}`);
    return previousId;
  }

  /**
   * Clear selection history
   */
  clearHistory(): void {
    this.selectionHistory.length = 0;
    console.log('[MelodySelection] Selection history cleared');
  }

  /**
   * Select next element in a given list
   */
  selectNext(elements: MusicElement[]): string | null {
    const currentId = this.selectedElementIdSubject.value;
    if (!currentId || elements.length === 0) {
      return null;
    }

    const currentIndex = elements.findIndex(el => el.id === currentId);
    if (currentIndex === -1 || currentIndex === elements.length - 1) {
      return null; // Not found or already at end
    }

    const nextElement = elements[currentIndex + 1];
    this.selectElement(nextElement.id);
    return nextElement.id;
  }

  /**
   * Select previous element in a given list
   */
  selectPreviousInList(elements: MusicElement[]): string | null {
    const currentId = this.selectedElementIdSubject.value;
    if (!currentId || elements.length === 0) {
      return null;
    }

    const currentIndex = elements.findIndex(el => el.id === currentId);
    if (currentIndex <= 0) {
      return null; // Not found or already at beginning
    }

    const previousElement = elements[currentIndex - 1];
    this.selectElement(previousElement.id);
    return previousElement.id;
  }

  /**
   * Select first element in a list
   */
  selectFirst(elements: MusicElement[]): string | null {
    if (elements.length === 0) {
      return null;
    }

    const firstElement = elements[0];
    this.selectElement(firstElement.id);
    return firstElement.id;
  }

  /**
   * Select last element in a list
   */
  selectLast(elements: MusicElement[]): string | null {
    if (elements.length === 0) {
      return null;
    }

    const lastElement = elements[elements.length - 1];
    this.selectElement(lastElement.id);
    return lastElement.id;
  }

  /**
   * Multi-selection support (for future use)
   */
  private multiSelection: Set<string> = new Set();

  /**
   * Enable multi-selection mode
   */
  addToMultiSelection(id: string): void {
    this.multiSelection.add(id);
    console.log(`[MelodySelection] Added to multi-selection: ${id}`);
  }

  /**
   * Remove from multi-selection
   */
  removeFromMultiSelection(id: string): void {
    this.multiSelection.delete(id);
    console.log(`[MelodySelection] Removed from multi-selection: ${id}`);
  }

  /**
   * Get multi-selected elements
   */
  getMultiSelection(): string[] {
    return Array.from(this.multiSelection);
  }

  /**
   * Clear multi-selection
   */
  clearMultiSelection(): void {
    this.multiSelection.clear();
    console.log('[MelodySelection] Multi-selection cleared');
  }

  /**
   * Check if element is in multi-selection
   */
  isInMultiSelection(id: string): boolean {
    return this.multiSelection.has(id);
  }

  // ============= PRIVATE METHODS =============

  private addToHistory(id: string): void {
    // Remove if already exists to avoid duplicates
    const existingIndex = this.selectionHistory.indexOf(id);
    if (existingIndex !== -1) {
      this.selectionHistory.splice(existingIndex, 1);
    }

    // Add to end
    this.selectionHistory.push(id);

    // Maintain max history size
    if (this.selectionHistory.length > this.maxHistorySize) {
      this.selectionHistory.shift();
    }
  }
}

// Helper function to import map operator
import { map } from 'rxjs/operators'; 