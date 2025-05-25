import { Component, Input, Output, EventEmitter, ElementRef, QueryList, ViewChildren, OnChanges, SimpleChanges } from '@angular/core';
import { MusicElement } from '../../../model/melody';
import { VisualElement } from '../melody-display/melody-display.component';
import { MelodyNoteComponent } from '../../melody-note/melody-note.component';
import { MelodyGroupComponent } from '../../melody-group/melody-group.component';

export interface SelectionAction {
  type: 'select' | 'move-focus' | 'scroll-to-element';
  elementId: string | null;
  direction?: number;
}

/**
 * 🎯 MelodySelectionComponent
 * 
 * SINGLE RESPONSIBILITY: Selection management and visual focus
 * - Manages selected element state and visual feedback
 * - Handles focus navigation (left/right movement)
 * - Provides scrolling to selected elements
 * - Coordinates visual selection updates
 */
@Component({
  selector: 'app-melody-selection',
  template: `
    <!-- This component manages selection state but doesn't render content directly -->
    <div class="selection-manager" #selectionContainer>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .selection-manager {
      width: 100%;
      position: relative;
    }

    /* Global selection styles that apply to child components */
    :host ::ng-deep .selected {
      border-color: #2196F3 !important;
      background-color: #E3F2FD !important;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
    }

    :host ::ng-deep .focused {
      outline: 2px solid #2196F3;
      outline-offset: 1px;
    }
  `]
})
export class MelodySelectionComponent implements OnChanges {
  @Input() visualElements: VisualElement[] = [];
  @Input() selectedElementId: string | null = null;
  @Input() elements: MusicElement[] = [];

  @Output() selectionChange = new EventEmitter<string | null>();
  @Output() focusMove = new EventEmitter<{ direction: number; currentId: string | null }>();

  @ViewChildren(MelodyNoteComponent) noteComponents!: QueryList<MelodyNoteComponent>;
  @ViewChildren(MelodyGroupComponent) groupComponents!: QueryList<MelodyGroupComponent>;

  private focusedElement: MusicElement | null = null;

  constructor(private elementRef: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedElementId']) {
      this.updateFocusedElement();
      
      // Auto-scroll to newly selected element
      if (this.selectedElementId) {
        setTimeout(() => this.scrollToElement(this.selectedElementId!), 0);
      }
    }
  }

  // ============= SELECTION MANAGEMENT =============

  /**
   * Select an element by ID
   */
  selectElement(id: string | null): void {
    if (id !== this.selectedElementId) {
      this.selectionChange.emit(id);
    }
  }

  /**
   * Move focus in a specific direction
   */
  moveFocus(direction: number): void {
    if (this.visualElements.length === 0) return;

    let newSelectedId: string | null = null;

    if (!this.selectedElementId) {
      // No current selection - select first/last element
      newSelectedId = direction > 0 
        ? this.visualElements[0]?.id 
        : this.visualElements[this.visualElements.length - 1]?.id;
    } else {
      // Find current position and move
      const currentIndex = this.visualElements.findIndex(ve => ve.id === this.selectedElementId);
      if (currentIndex !== -1) {
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.visualElements.length) {
          newSelectedId = this.visualElements[newIndex].id;
        } else {
          // Wrap around
          newSelectedId = direction > 0 
            ? this.visualElements[0]?.id
            : this.visualElements[this.visualElements.length - 1]?.id;
        }
      }
    }

    if (newSelectedId && newSelectedId !== this.selectedElementId) {
      console.log(`[MelodySelection] Moving focus ${direction > 0 ? 'right' : 'left'} to: ${newSelectedId}`);
      this.selectElement(newSelectedId);
    }
  }

  /**
   * Select first element
   */
  selectFirst(): void {
    if (this.visualElements.length > 0) {
      this.selectElement(this.visualElements[0].id);
    }
  }

  /**
   * Select last element
   */
  selectLast(): void {
    if (this.visualElements.length > 0) {
      this.selectElement(this.visualElements[this.visualElements.length - 1].id);
    }
  }

  /**
   * Get currently selected visual element
   */
  getSelectedVisualElement(): VisualElement | null {
    if (!this.selectedElementId) return null;
    return this.visualElements.find(ve => ve.id === this.selectedElementId) || null;
  }

  /**
   * Get currently selected original element
   */
  getSelectedOriginalElement(): MusicElement | null {
    const visualElement = this.getSelectedVisualElement();
    return visualElement ? visualElement.originalElement : null;
  }

  // ============= FOCUS MANAGEMENT =============

  /**
   * Update the focused element based on current selection
   */
  private updateFocusedElement(): void {
    if (this.selectedElementId) {
      const visualEl = this.visualElements.find(ve => ve.id === this.selectedElementId);
      this.focusedElement = visualEl ? visualEl.originalElement : null;
    } else {
      this.focusedElement = null;
    }
  }

  /**
   * Get currently focused element
   */
  getFocusedElement(): MusicElement | null {
    return this.focusedElement;
  }

  // ============= SCROLLING MANAGEMENT =============

  /**
   * Scroll to a specific element in the view
   */
  scrollToElement(elementId: string): void {
    const attemptScroll = (attempt = 1) => {
      console.log(`[MelodySelection] scrollToElement attempt ${attempt} for ID: ${elementId}`);
      
      const visualEl = this.visualElements.find(ve => ve.id === elementId);
      const componentId = visualEl?.originalElement.id;
      const visualType = visualEl?.type;

      if (componentId) {
        let targetElement: HTMLElement | null = null;

        // Find the DOM element to focus
        if (visualType === 'group-start' || visualType === 'group-end') {
          targetElement = this.elementRef.nativeElement.querySelector(`[data-element-id="${elementId}"]`);
          console.log(`[MelodySelection] Found group marker element:`, !!targetElement);
        } else {
          const allComponents = [...this.noteComponents.toArray(), ...this.groupComponents.toArray()];
          const targetComponent = allComponents.find(comp => comp.note?.id === componentId);
          if (targetComponent) {
            targetElement = targetComponent.elementRef.nativeElement;
            console.log(`[MelodySelection] Found component element:`, !!targetElement);
          }
        }

        if (targetElement) {
          targetElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest', 
            inline: 'nearest' 
          });
          
          try {
            targetElement.focus();
          } catch (e) {
            console.log(`[MelodySelection] Could not focus element (this is normal for some elements)`);
          }
          
          console.log(`[MelodySelection] Scrolled to element ${elementId} successfully`);
        } else if (attempt < 3) {
          // Retry with delay if element not found (might not be rendered yet)
          setTimeout(() => attemptScroll(attempt + 1), 50);
        } else {
          console.warn(`[MelodySelection] Could not find element ${elementId} after ${attempt} attempts`);
        }
      } else {
        console.warn(`[MelodySelection] Could not find visual element for ID: ${elementId}`);
      }
    };

    attemptScroll();
  }

  // ============= UTILITY METHODS =============

  /**
   * Check if an element is currently selected
   */
  isSelected(elementId: string): boolean {
    return this.selectedElementId === elementId;
  }

  /**
   * Get selection index in visual elements
   */
  getSelectionIndex(): number {
    if (!this.selectedElementId) return -1;
    return this.visualElements.findIndex(ve => ve.id === this.selectedElementId);
  }

  /**
   * Get total number of selectable elements
   */
  getSelectableCount(): number {
    return this.visualElements.length;
  }

  /**
   * Check if there is a next element to select
   */
  hasNext(): boolean {
    const index = this.getSelectionIndex();
    return index !== -1 && index < this.visualElements.length - 1;
  }

  /**
   * Check if there is a previous element to select
   */
  hasPrevious(): boolean {
    const index = this.getSelectionIndex();
    return index > 0;
  }

  /**
   * Get selection info for debugging
   */
  getSelectionInfo(): any {
    return {
      selectedElementId: this.selectedElementId,
      selectedIndex: this.getSelectionIndex(),
      totalElements: this.getSelectableCount(),
      focusedElement: this.focusedElement?.id,
      hasNext: this.hasNext(),
      hasPrevious: this.hasPrevious()
    };
  }
} 