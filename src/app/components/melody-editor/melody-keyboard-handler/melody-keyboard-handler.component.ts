import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { MusicElement, NoteDuration, GenericGroup } from '../../../model/melody';
import { VisualElement } from '../melody-display/melody-display.component';

export interface KeyboardAction {
  type: 'move-focus' | 'increase-note' | 'decrease-note' | 'increase-duration' | 'decrease-duration' | 
        'delete-note' | 'toggle-silence' | 'insert-note' | 'start-group' | 'move-group-boundary' |
        'move-element' | 'assign-parent-duration';
  direction?: number;
  elementId?: string;
  groupId?: string;
  boundaryType?: 'start' | 'end';
  boundaryDirection?: 'left' | 'right';
}

/**
 * ⌨️ MelodyKeyboardHandlerComponent
 * 
 * SINGLE RESPONSIBILITY: Keyboard event handling and shortcuts
 * - Captures and processes all keyboard events
 * - Translates keyboard combinations to semantic actions
 * - Manages keyboard shortcuts and their logic
 * - Provides throttling for repeated events
 */
@Component({
  selector: 'app-melody-keyboard-handler',
  template: `
    <!-- This component has no visual template - it only handles keyboard events -->
    <div class="keyboard-handler-container" tabindex="0" #keyboardHandler>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .keyboard-handler-container {
      width: 100%;
      outline: none;
    }

    .keyboard-handler-container:focus {
      outline: 2px solid #2196F3;
      outline-offset: 2px;
    }
  `]
})
export class MelodyKeyboardHandlerComponent {
  @Input() selectedElementId: string | null = null;
  @Input() visualElements: VisualElement[] = [];
  @Input() elements: MusicElement[] = [];
  @Input() defaultDuration: NoteDuration = '4n';

  @Output() keyboardAction = new EventEmitter<KeyboardAction>();

  private lastWheelTime: number = 0;
  private readonly wheelThrottleDelay: number = 150;
  readonly durations: NoteDuration[] = ['1n', '2n', '4n', '8n', '16n', '4t', '8t'];

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit(): void {
    // Auto-focus the keyboard handler
    this.elementRef.nativeElement.querySelector('.keyboard-handler-container')?.focus();
  }

  @HostListener('keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    console.log('[MelodyKeyboard] RAW Keydown Event:', { 
      key: event.key, 
      code: event.code, 
      shiftKey: event.shiftKey 
    });

    if (event.repeat) return;

    // Prevent default for handled keys
    if (['Insert', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', ' ', '(', ')'].includes(event.key)) {
      event.preventDefault();
    }

    // Process keyboard shortcuts
    const action = this.translateKeyboardEvent(event);
    if (action) {
      console.log('[MelodyKeyboard] Emitting action:', action);
      this.keyboardAction.emit(action);
    }
  }

  // ============= KEYBOARD TRANSLATION =============

  private translateKeyboardEvent(event: KeyboardEvent): KeyboardAction | null {
    const { key, shiftKey } = event;

    // Special keys
    if (key === '(') {
      return { type: 'start-group' };
    }

    if (key === ')') {
      console.log('[MelodyKeyboard] Close group (pending implementation)');
      return null; // TODO: Implement group closing
    }

    // Handle Insert key (works with or without selection)
    if (key === 'Insert') {
      return { type: 'insert-note' };
    }

    // All other operations require a selection
    if (!this.selectedElementId) {
      return null;
    }

    const selectedVisualElement = this.visualElements.find(ve => ve.id === this.selectedElementId);
    if (!selectedVisualElement) {
      return null;
    }

    const originalElement = selectedVisualElement.originalElement;
    if (!originalElement) {
      return null;
    }

    // Handle Shift + Key combinations
    if (shiftKey) {
      return this.handleShiftKeyboardEvent(event, selectedVisualElement, originalElement);
    }

    // Handle regular key combinations
    return this.handleRegularKeyboardEvent(event, selectedVisualElement, originalElement);
  }

  private handleShiftKeyboardEvent(
    event: KeyboardEvent, 
    selectedVisualElement: VisualElement, 
    originalElement: MusicElement
  ): KeyboardAction | null {
    const { key } = event;

    // Duration changes
    if (key === 'ArrowUp') {
      return { type: 'increase-duration', elementId: originalElement.id };
    }
    if (key === 'ArrowDown') {
      return { type: 'decrease-duration', elementId: originalElement.id };
    }

    // Group boundary movements
    if ((selectedVisualElement.type === 'group-start' || selectedVisualElement.type === 'group-end') && 
        (key === 'ArrowLeft' || key === 'ArrowRight')) {
      return {
        type: 'move-group-boundary',
        groupId: originalElement.id,
        boundaryType: selectedVisualElement.type === 'group-start' ? 'start' : 'end',
        boundaryDirection: key === 'ArrowLeft' ? 'left' : 'right'
      };
    }

    // Element movements
    if (key === 'ArrowLeft') {
      return { type: 'move-element', elementId: originalElement.id, direction: -1 };
    }
    if (key === 'ArrowRight') {
      return { type: 'move-element', elementId: originalElement.id, direction: 1 };
    }

    // Assign parent group duration
    if (key === ' ') {
      if (originalElement.type === 'note' || originalElement.type === 'rest') {
        return { type: 'assign-parent-duration', elementId: originalElement.id };
      }
    }

    return null;
  }

  private handleRegularKeyboardEvent(
    event: KeyboardEvent, 
    selectedVisualElement: VisualElement, 
    originalElement: MusicElement
  ): KeyboardAction | null {
    const { key } = event;

    switch (key) {
      case 'ArrowLeft':
        return { type: 'move-focus', direction: -1 };
        
      case 'ArrowRight':
        return { type: 'move-focus', direction: 1 };
        
      case 'ArrowUp':
        if (originalElement.type === 'note' || originalElement.type === 'rest') {
          return { type: 'increase-note', elementId: originalElement.id };
        }
        break;
        
      case 'ArrowDown':
        if (originalElement.type === 'note' || originalElement.type === 'rest') {
          return { type: 'decrease-note', elementId: originalElement.id };
        }
        break;
        
      case 'Delete':
        return { type: 'delete-note', elementId: originalElement.id };
        
      case ' ':
        if (originalElement.type === 'note' || originalElement.type === 'rest') {
          return { type: 'toggle-silence', elementId: originalElement.id };
        }
        break;
    }

    return null;
  }

  // ============= UTILITY METHODS =============

  /**
   * Focus the keyboard handler element
   */
  focus(): void {
    const container = this.elementRef.nativeElement.querySelector('.keyboard-handler-container');
    if (container) {
      container.focus();
    }
  }

  /**
   * Check if a key combination is handled by this component
   */
  isHandledKey(key: string, shiftKey: boolean = false): boolean {
    const handledKeys = ['Insert', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', ' ', '(', ')'];
    return handledKeys.includes(key);
  }

  /**
   * Get available keyboard shortcuts for documentation
   */
  getKeyboardShortcuts(): Array<{ keys: string; description: string }> {
    return [
      { keys: '←/→', description: 'Move selection left/right' },
      { keys: '↑/↓', description: 'Increase/decrease note value' },
      { keys: 'Shift + ↑/↓', description: 'Increase/decrease duration' },
      { keys: 'Shift + ←/→', description: 'Move element or group boundary' },
      { keys: 'Space', description: 'Toggle note silence' },
      { keys: 'Shift + Space', description: 'Assign parent group duration' },
      { keys: 'Delete', description: 'Delete selected element' },
      { keys: 'Insert', description: 'Insert new note' },
      { keys: '(', description: 'Start new group' },
      { keys: ')', description: 'Close group (pending)' }
    ];
  }
} 