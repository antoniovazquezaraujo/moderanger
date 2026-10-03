import { Injectable } from '@angular/core';
import { MusicElement, GenericGroup, NoteDuration, NoteFactory } from '../../model/melody';
import { MelodyElementManagerService } from './melody-element-manager.service';

export interface GroupOperation {
  type: 'start' | 'end' | 'remove' | 'move';
  groupId: string;
  direction?: 'left' | 'right';
  targetElementId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MelodyGroupManagerService {

  constructor(private elementManager: MelodyElementManagerService) {
    console.log('[MelodyGroupManager] Service initialized');
  }

  // ============= PUBLIC API =============

  /**
   * Start a new group at the end or after a specific element
   */
  startGroup(duration: NoteDuration, afterVisualElementId?: string | null): string {
    console.log(`[MelodyGroupManager] Starting group with duration: ${duration}`);
    
    const newGroup = NoteFactory.createGenericGroup([], duration);
    const currentElements = this.elementManager.getElements();

    if (afterVisualElementId) {
      const targetIndex = this.findOriginalIndex(afterVisualElementId, currentElements);
      if (targetIndex !== -1) {
        const newElements = [...currentElements];
        newElements.splice(targetIndex + 1, 0, newGroup);
        this.elementManager.loadElements(newElements);
        console.log(`[MelodyGroupManager] Group ${newGroup.id} inserted after ${afterVisualElementId}`);
        return newGroup.id;
      }
    }

    // Add to end if no specific position
    const newElements = [...currentElements, newGroup];
    this.elementManager.loadElements(newElements);
    console.log(`[MelodyGroupManager] Group ${newGroup.id} added to end`);
    return newGroup.id;
  }

  /**
   * Move group start position left
   */
  moveGroupStartLeft(groupId: string): boolean {
    console.log(`[MelodyGroupManager] Moving group start left: ${groupId}`);
    
    const { element: group, parent } = this.elementManager.findElementAndParent(groupId);
    if (!group || group.type !== 'group') {
      console.warn(`[MelodyGroupManager] Group ${groupId} not found`);
      return false;
    }

    const typedGroup = group as GenericGroup;
    if (!typedGroup.children || typedGroup.children.length === 0) {
      console.log(`[MelodyGroupManager] Group ${groupId} has no children to move`);
      return false;
    }

    return this.performGroupStartMove(groupId, typedGroup, parent, 'left');
  }

  /**
   * Move group start position right
   */
  moveGroupStartRight(groupId: string): boolean {
    console.log(`[MelodyGroupManager] Moving group start right: ${groupId}`);
    
    const { element: group, parent } = this.elementManager.findElementAndParent(groupId);
    if (!group || group.type !== 'group') {
      console.warn(`[MelodyGroupManager] Group ${groupId} not found`);
      return false;
    }

    const typedGroup = group as GenericGroup;
    if (!typedGroup.children || typedGroup.children.length === 0) {
      console.log(`[MelodyGroupManager] Group ${groupId} has no children to move`);
      return false;
    }

    return this.performGroupStartMove(groupId, typedGroup, parent, 'right');
  }

  /**
   * Move group end position left
   */
  moveGroupEndLeft(groupId: string): boolean {
    console.log(`[MelodyGroupManager] Moving group end left: ${groupId}`);
    
    const { element: group, parent } = this.elementManager.findElementAndParent(groupId);
    if (!group || group.type !== 'group') {
      console.warn(`[MelodyGroupManager] Group ${groupId} not found`);
      return false;
    }

    const typedGroup = group as GenericGroup;
    if (!typedGroup.children || typedGroup.children.length === 0) {
      console.log(`[MelodyGroupManager] Group ${groupId} has no children to move`);
      return false;
    }

    return this.performGroupEndMove(groupId, typedGroup, parent, 'left');
  }

  /**
   * Move group end position right
   */
  moveGroupEndRight(groupId: string): boolean {
    console.log(`[MelodyGroupManager] Moving group end right: ${groupId}`);
    
    const { element: group, parent } = this.elementManager.findElementAndParent(groupId);
    if (!group || group.type !== 'group') {
      console.warn(`[MelodyGroupManager] Group ${groupId} not found`);
      return false;
    }

    const typedGroup = group as GenericGroup;
    if (!typedGroup.children || typedGroup.children.length === 0) {
      console.log(`[MelodyGroupManager] Group ${groupId} has no children to move`);
      return false;
    }

    return this.performGroupEndMove(groupId, typedGroup, parent, 'right');
  }

  /**
   * Remove group and promote its children to parent level
   */
  removeGroupAndPromoteChildren(groupId: string): boolean {
    console.log(`[MelodyGroupManager] Removing group and promoting children: ${groupId}`);
    
    const { element: group, parent } = this.elementManager.findElementAndParent(groupId);
    if (!group || group.type !== 'group') {
      console.warn(`[MelodyGroupManager] Group ${groupId} not found`);
      return false;
    }

    const typedGroup = group as GenericGroup;
    const childrenToPromote = typedGroup.children || [];

    if (parent) {
      // Group is nested - promote children to parent's level
      return this.promoteChildrenInNestedGroup(groupId, childrenToPromote, parent);
    } else {
      // Group is at top level - promote children to root level
      return this.promoteChildrenToRootLevel(groupId, childrenToPromote);
    }
  }

  /**
   * Move element left in its container
   */
  moveElementLeft(id: string): boolean {
    console.log(`[MelodyGroupManager] Moving element left: ${id}`);
    
    const currentElements = this.elementManager.getElements();
    const result = this.findAndReorderRecursively(currentElements, id, -1);
    
    if (result.modified) {
      this.elementManager.loadElements(result.newElements);
      console.log(`[MelodyGroupManager] Element ${id} moved left successfully`);
      return true;
    }
    
    console.log(`[MelodyGroupManager] Could not move element ${id} left`);
    return false;
  }

  /**
   * Move element right in its container
   */
  moveElementRight(id: string): boolean {
    console.log(`[MelodyGroupManager] Moving element right: ${id}`);
    
    const currentElements = this.elementManager.getElements();
    const result = this.findAndReorderRecursively(currentElements, id, 1);
    
    if (result.modified) {
      this.elementManager.loadElements(result.newElements);
      console.log(`[MelodyGroupManager] Element ${id} moved right successfully`);
      return true;
    }
    
    console.log(`[MelodyGroupManager] Could not move element ${id} right`);
    return false;
  }

  // ============= PRIVATE METHODS =============

  private findOriginalIndex(targetId: string, elements: MusicElement[]): number {
    return elements.findIndex(el => el.id === targetId);
  }

  private performGroupStartMove(groupId: string, group: GenericGroup, parent: MusicElement | null, direction: 'left' | 'right'): boolean {
    const isLeft = direction === 'left';
    const targetChild = isLeft ? group.children![0] : group.children![group.children!.length - 1];

    if (parent) {
      // Nested group - move within parent's children
      return this.moveGroupBoundaryInParent(groupId, group, parent, targetChild, isLeft);
    } else {
      // Top-level group - move in root elements
      return this.moveGroupBoundaryAtRoot(groupId, group, targetChild, isLeft);
    }
  }

  private performGroupEndMove(groupId: string, group: GenericGroup, parent: MusicElement | null, direction: 'left' | 'right'): boolean {
    const isLeft = direction === 'left';
    const targetChild = isLeft ? group.children![group.children!.length - 1] : group.children![0];

    if (parent) {
      return this.moveGroupBoundaryInParent(groupId, group, parent, targetChild, !isLeft);
    } else {
      return this.moveGroupBoundaryAtRoot(groupId, group, targetChild, !isLeft);
    }
  }

  private moveGroupBoundaryInParent(groupId: string, group: GenericGroup, parent: MusicElement, targetChild: MusicElement, moveOut: boolean): boolean {
    // Complex logic for moving group boundaries within nested structures
    // This would implement the specific logic based on parent type (group vs composite note)
    console.log(`[MelodyGroupManager] Moving group boundary in parent (moveOut: ${moveOut})`);
    
    // For now, return false to indicate operation not supported
    // Real implementation would handle GenericGroup and CompositeNote parent types
    return false;
  }

  private moveGroupBoundaryAtRoot(groupId: string, group: GenericGroup, targetChild: MusicElement, moveOut: boolean): boolean {
    const currentElements = this.elementManager.getElements();
    const groupIndex = currentElements.findIndex(el => el.id === groupId);
    
    if (groupIndex === -1) {
      return false;
    }

    const newElements = [...currentElements];
    const updatedGroup = { ...group };

    if (moveOut) {
      // Move child out of group
      updatedGroup.children = updatedGroup.children!.filter(child => child.id !== targetChild.id);
      newElements[groupIndex] = updatedGroup;
      
      // Insert the child next to the group
      const insertIndex = groupIndex + 1;
      newElements.splice(insertIndex, 0, targetChild);
    } else {
      // Move adjacent element into group
      const adjacentIndex = groupIndex + 1;
      if (adjacentIndex < newElements.length) {
        const adjacentElement = newElements[adjacentIndex];
        updatedGroup.children = [...updatedGroup.children!, adjacentElement];
        newElements[groupIndex] = updatedGroup;
        newElements.splice(adjacentIndex, 1);
      } else {
        return false;
      }
    }

    this.elementManager.loadElements(newElements);
    return true;
  }

  private promoteChildrenInNestedGroup(groupId: string, children: MusicElement[], parent: MusicElement): boolean {
    // Handle promotion in nested structures
    console.log(`[MelodyGroupManager] Promoting children in nested group`);
    
    if (parent.type === 'group') {
      const parentGroup = parent as GenericGroup;
      const groupIndex = parentGroup.children?.findIndex(child => child.id === groupId) ?? -1;
      
      if (groupIndex !== -1 && parentGroup.children) {
        const newChildren = [...parentGroup.children];
        newChildren.splice(groupIndex, 1, ...children); // Replace group with its children
        
        return this.elementManager.updateElement(parent.id, { children: newChildren });
      }
    }
    
    return false;
  }

  private promoteChildrenToRootLevel(groupId: string, children: MusicElement[]): boolean {
    const currentElements = this.elementManager.getElements();
    const groupIndex = currentElements.findIndex(el => el.id === groupId);
    
    if (groupIndex !== -1) {
      const newElements = [...currentElements];
      newElements.splice(groupIndex, 1, ...children); // Replace group with its children
      
      this.elementManager.loadElements(newElements);
      console.log(`[MelodyGroupManager] Promoted ${children.length} children to root level`);
      return true;
    }
    
    return false;
  }

  private findAndReorderRecursively(elements: MusicElement[], id: string, direction: number): { modified: boolean, newElements: MusicElement[] } {
    // Try to reorder at current level
    const targetIndex = elements.findIndex(el => el.id === id);
    if (targetIndex !== -1) {
      const newIndex = targetIndex + direction;
      if (newIndex >= 0 && newIndex < elements.length) {
        const newElements = [...elements];
        [newElements[targetIndex], newElements[newIndex]] = [newElements[newIndex], newElements[targetIndex]];
        return { modified: true, newElements };
      }
    }

    // Try to reorder in children
    let modified = false;
    const newElements = elements.map(element => {
      if (modified) return element; // Already found and modified

      let childElements: MusicElement[] | undefined;
      let updateProperty: 'children' | 'notes' | null = null;

      if (element.type === 'group' && (element as GenericGroup).children) {
        childElements = (element as GenericGroup).children;
        updateProperty = 'children';
      }

      if (childElements && updateProperty) {
        const result = this.findAndReorderRecursively(childElements, id, direction);
        if (result.modified) {
          modified = true;
          return { ...element, [updateProperty]: result.newElements };
        }
      }

      return element;
    });

    return { modified, newElements };
  }
} 