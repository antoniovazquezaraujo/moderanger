import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MusicElement, SingleNote, CompositeNote, GenericGroup, NoteDuration, NoteFactory } from '../../model/melody';

export interface ElementOperation {
  type: 'add' | 'remove' | 'update';
  elementId: string;
  element?: MusicElement;
  changes?: Partial<MusicElement>;
}

@Injectable({
  providedIn: 'root'
})
export class MelodyElementManagerService {
  private readonly serviceInstanceId = Math.random().toString(36).substring(2, 7);
  private readonly elementsSubject = new BehaviorSubject<MusicElement[]>([]);
  
  // Public observables
  readonly elements$ = this.elementsSubject.asObservable();

  constructor() {
    console.log(`[MelodyElementManager INSTANCE ${this.serviceInstanceId}] Created`);
  }

  // ============= PUBLIC API =============

  /**
   * Get current elements
   */
  getElements(): MusicElement[] {
    return this.elementsSubject.value;
  }

  /**
   * Load elements from external source
   */
  loadElements(elements: MusicElement[]): void {
    console.log(`[MelodyElementManager] Loading ${elements.length} elements`);
    this.elementsSubject.next([...elements]);
  }

  /**
   * Add a new note to the end of the melody
   */
  addNote(noteData: Partial<SingleNote>, duration: NoteDuration): string {
    console.log(`[MelodyElementManager] Adding note with duration: ${duration}`);
    
    const newNote = NoteFactory.createSingleNote(
      noteData?.value ?? 1,
      duration
    );
    
    const currentElements = this.elementsSubject.value;
    this.elementsSubject.next([...currentElements, newNote]);
    
    console.log(`[MelodyElementManager] Note added with ID: ${newNote.id}`);
    return newNote.id;
  }

  /**
   * Add a note after a specific element
   */
  addNoteAfter(targetId: string, noteData: Partial<SingleNote>, duration: NoteDuration): string | null {
    console.log(`[MelodyElementManager] Adding note after element: ${targetId}`);
    
    const currentElements = this.elementsSubject.value;
    const index = currentElements.findIndex(e => e.id === targetId);
    
    if (index === -1) {
      console.warn(`[MelodyElementManager] Element ${targetId} not found`);
      return null;
    }

    const newNote = NoteFactory.createSingleNote(
      noteData?.value ?? 1,
      duration
    );
    
    const newElements = [...currentElements];
    newElements.splice(index + 1, 0, newNote);
    this.elementsSubject.next(newElements);
    
    console.log(`[MelodyElementManager] Note added after ${targetId} with ID: ${newNote.id}`);
    return newNote.id;
  }

  /**
   * Add a note to a group
   */
  addNoteToGroup(groupId: string, noteData: Partial<SingleNote>, duration: NoteDuration): string | null {
    console.log(`[MelodyElementManager] Adding note to group: ${groupId}`);
    
    const { element: group } = this.findElementAndParent(groupId);

    if (!group || group.type !== 'group') {
      console.warn(`[MelodyElementManager] Group ${groupId} not found or is not a group`);
      return null;
    }

    const newNote = NoteFactory.createSingleNote(
      noteData?.value ?? 1, 
      duration
    );

    const currentChildren = (group as GenericGroup).children || [];
    const newChildren = [...currentChildren, newNote];

    this.updateElement(groupId, { children: newChildren });

    console.log(`[MelodyElementManager] Note added to group ${groupId} with ID: ${newNote.id}`);
    return newNote.id;
  }

  /**
   * Remove an element by ID
   */
  removeElement(id: string): boolean {
    console.log(`[MelodyElementManager] Removing element: ${id}`);
    
    const currentElements = this.elementsSubject.value;
    const newElements = currentElements.filter(e => e.id !== id);
    
    if (newElements.length === currentElements.length) {
      console.warn(`[MelodyElementManager] Element ${id} not found for removal`);
      return false;
    }
    
    this.elementsSubject.next(newElements);
    console.log(`[MelodyElementManager] Element ${id} removed successfully`);
    return true;
  }

  /**
   * Update an element with partial changes
   */
  updateElement(id: string, changes: Partial<MusicElement>): boolean {
    console.log(`[MelodyElementManager] Updating element ${id}:`, changes);
    
    const currentElements = this.elementsSubject.value;
    const result = this.findAndUpdateRecursively([...currentElements], id, changes);
    
    if (result.modified) {
      this.elementsSubject.next(result.newElements);
      console.log(`[MelodyElementManager] Element ${id} updated successfully`);
      return true;
    } else {
      console.log(`[MelodyElementManager] Element ${id} not found or no changes needed`);
      return false;
    }
  }

  /**
   * Find element and its parent by ID
   */
  findElementAndParent(elementId: string, elements?: MusicElement[], parent: MusicElement | null = null): { element: MusicElement | null, parent: MusicElement | null } {
    const searchElements = elements || this.elementsSubject.value;
    
    for (const element of searchElements) {
      if (element.id === elementId) {
        return { element, parent };
      }
      
      // Search in children
      let childrenToSearch: MusicElement[] | undefined;
      if (element.type === 'group') {
        childrenToSearch = (element as GenericGroup).children;
      } else if (element.type === 'arpeggio' || element.type === 'chord') {
        childrenToSearch = (element as CompositeNote).notes;
      }
      
      if (childrenToSearch) {
        const result = this.findElementAndParent(elementId, childrenToSearch, element);
        if (result.element) {
          return result;
        }
      }
    }
    
    return { element: null, parent: null };
  }

  /**
   * Count total elements including nested ones
   */
  countElements(): number {
    return this.countElementsRecursively(this.elementsSubject.value);
  }

  // ============= PRIVATE METHODS =============

  private findAndUpdateRecursively(elements: MusicElement[], id: string, changes: Partial<MusicElement>): { modified: boolean, newElements: MusicElement[] } {
    let listChanged = false;
    
    const mappedElements = elements.map((element): MusicElement => {
      if (element.id === id) {
        const updatedElement = this.applyChangesToElement(element, changes);
        if (JSON.stringify(element) !== JSON.stringify(updatedElement)) {
          listChanged = true;
          console.log(`[MelodyElementManager] Element ${id} modified`);
          return updatedElement;
        }
        return element;
      }
      
      // Check children
      const childResult = this.updateChildrenIfNeeded(element, id, changes);
      if (childResult.modified) {
        listChanged = true;
        return childResult.element;
      }
      
      return element;
    });
    
    return { modified: listChanged, newElements: mappedElements };
  }

  private applyChangesToElement(element: MusicElement, changes: Partial<MusicElement>): MusicElement {
    switch (element.type) {
      case 'note':
      case 'rest':
        return this.updateSingleNote(element as SingleNote, changes);
      case 'group':
        return this.updateGroup(element as GenericGroup, changes);
      case 'arpeggio':
      case 'chord':
        return this.updateCompositeNote(element as CompositeNote, changes);
      default:
        return element;
    }
  }

  private updateSingleNote(note: SingleNote, changes: Partial<MusicElement>): SingleNote {
    const valueChange = this.isPartialSingleNote(changes) && changes.value !== undefined ? { value: changes.value } : {};
    const durationChange = changes.hasOwnProperty('duration') ? { duration: changes.duration } : {};
    return { ...note, ...valueChange, ...durationChange };
  }

  private updateGroup(group: GenericGroup, changes: Partial<MusicElement>): GenericGroup {
    const groupChanges = changes as Partial<GenericGroup>;
    const wasDurationChanged = changes.hasOwnProperty('duration');
    const updatedChildren = groupChanges.children;
    
    let updatedGroup = { 
      ...group, 
      ...(wasDurationChanged && { duration: changes.duration }), 
      ...(updatedChildren !== undefined && { children: updatedChildren }) 
    };

    // Propagate duration changes to children if needed
    if (wasDurationChanged && updatedGroup.children) {
      updatedGroup.children = this.propagateDurationToChildren(
        updatedGroup.children, 
        group.duration, 
        changes.duration
      );
    }
    
    return updatedGroup;
  }

  private updateCompositeNote(composite: CompositeNote, changes: Partial<MusicElement>): CompositeNote {
    return { 
      ...composite, 
      ...(changes.hasOwnProperty('duration') && { duration: changes.duration }) 
    };
  }

  private updateChildrenIfNeeded(element: MusicElement, id: string, changes: Partial<MusicElement>): { modified: boolean, element: MusicElement } {
    let currentChildren: MusicElement[] | undefined;
    let updateProp: 'children' | 'notes' | null = null;
    
    if (element.type === 'group' && (element as GenericGroup).children) {
      currentChildren = (element as GenericGroup).children;
      updateProp = 'children';
    } else if ((element.type === 'arpeggio' || element.type === 'chord') && (element as CompositeNote).notes) {
      currentChildren = (element as CompositeNote).notes;
      updateProp = 'notes';
    }
    
    if (currentChildren && updateProp) {
      const result = this.findAndUpdateRecursively(currentChildren, id, changes);
      if (result.modified) {
        const updatedElement = updateProp === 'children' 
          ? { ...element, children: result.newElements } as GenericGroup
          : { ...element, notes: result.newElements as SingleNote[] } as CompositeNote;
        return { modified: true, element: updatedElement };
      }
    }
    
    return { modified: false, element };
  }

  private propagateDurationToChildren(children: MusicElement[], oldDuration: NoteDuration | undefined, newDuration: NoteDuration | undefined): MusicElement[] {
    return children.map(child => {
      if (child.duration === undefined || child.duration === oldDuration) {
        console.log(`[MelodyElementManager] Propagating duration ${newDuration} to child ${child.id}`);
        return { ...child, duration: newDuration };
      }
      return child;
    });
  }

  private isPartialSingleNote(changes: Partial<MusicElement>): changes is Partial<SingleNote> {
    return changes.hasOwnProperty('value');
  }

  private countElementsRecursively(elements: MusicElement[]): number {
    let count = elements.length;
    
    for (const element of elements) {
      if (element.type === 'group' && (element as GenericGroup).children) {
        count += this.countElementsRecursively((element as GenericGroup).children);
      } else if ((element.type === 'arpeggio' || element.type === 'chord') && (element as CompositeNote).notes) {
        count += this.countElementsRecursively((element as CompositeNote).notes);
      }
    }
    
    return count;
  }
} 