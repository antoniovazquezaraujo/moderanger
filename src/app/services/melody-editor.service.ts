import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MusicElement, SingleNote, CompositeNote, GenericGroup, NoteDuration, NoteFactory, NoteConverter } from '../model/melody';
import { NoteData } from '../model/note';

@Injectable()
export class MelodyEditorService {
    private readonly serviceInstanceId = Math.random().toString(36).substring(2, 7);
    private readonly elementsSubject = new BehaviorSubject<MusicElement[]>([]);
    elements$ = this.elementsSubject.asObservable();
    
    // New subject for selected element ID
    private readonly selectedElementIdSubject = new BehaviorSubject<string | null>(null);
    selectedElementId$ = this.selectedElementIdSubject.asObservable();

    constructor() {
        console.log(`[MelodyEditorService INSTANCE ${this.serviceInstanceId}] Created`);
    }
    
    get selectedElementId(): string | null {
        return this.selectedElementIdSubject.value;
    }

    private generateId(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    addNote(noteData: Partial<SingleNote>, duration: NoteDuration): string | null {
        console.log(`[MelodyEditorService INSTANCE ${this.serviceInstanceId}] addNote called. Input noteData:`, noteData, `Duration: ${duration}`);
        console.log(`[MelodyEditorService INSTANCE ${this.serviceInstanceId}] addNote - Using provided duration: ${duration}`);
        const newNote = NoteFactory.createSingleNote(
            noteData?.value ?? 1,
            duration
        );
        const currentElements = this.elementsSubject.value;
        this.elementsSubject.next([...currentElements, newNote]);
        this.selectNote(newNote.id);
        return newNote.id;
    }
    
    addNoteAfter(id: string, noteData: Partial<SingleNote>, duration: NoteDuration): string | null {
        console.log(`[MelodyEditorService INSTANCE ${this.serviceInstanceId}] addNoteAfter called for id ${id}. Input noteData:`, noteData, `Duration: ${duration}`);
        const currentElements = this.elementsSubject.value;
        const index = currentElements.findIndex(e => e.id === id);
        if (index === -1) return null;

        console.log(`[MelodyEditorService INSTANCE ${this.serviceInstanceId}] addNoteAfter - Using provided duration: ${duration}`);
        const newNote = NoteFactory.createSingleNote(
            noteData?.value ?? 1,
            duration
        );
        const newElements = [...currentElements];
        newElements.splice(index + 1, 0, newNote);
        this.elementsSubject.next(newElements);
        this.selectNote(newNote.id);
        return newNote.id;
    }
    
    addNoteToGroup(groupId: string, noteData: Partial<SingleNote>, duration: NoteDuration): string | null {
        console.log(`[MelodyEditorService INSTANCE ${this.serviceInstanceId}] addNoteToGroup called for groupId ${groupId}. Input noteData:`, noteData, `Duration: ${duration}`);
        const { element: group } = this.findElementAndParent(groupId);

        if (!group || group.type !== 'group') {
            console.warn(`addNoteToGroup: Element ${groupId} not found or is not a GenericGroup.`);
            return null;
        }

        console.log(`[MelodyEditorService INSTANCE ${this.serviceInstanceId}] addNoteToGroup - Using provided duration: ${duration}`);
        const newNote = NoteFactory.createSingleNote(
            noteData?.value ?? 1, 
            duration
        );

        const currentChildren = (group as GenericGroup).children || [];
        const newChildren = [...currentChildren, newNote];

        this.updateNote(groupId, { children: newChildren });

        this.selectNote(newNote.id);

        return newNote.id;
    }
    
    removeNote(id: string): void {
        const currentElements = this.elementsSubject.value;
        const newElements = currentElements.filter(e => e.id !== id);
        this.elementsSubject.next(newElements);
        // If the removed note was selected, deselect
        if (this.selectedElementId === id) {
            this.selectedElementIdSubject.next(null);
        }
    }
    
    selectNote(id: string | null): void {
        // Only emit if the selection actually changes
        if (id !== this.selectedElementIdSubject.value) {
            this.selectedElementIdSubject.next(id);
        }
    }
    
    private isPartialSingleNote(changes: Partial<MusicElement>): changes is Partial<SingleNote> {
        return changes.hasOwnProperty('value');
    }

    private findAndUpdateRecursively(elements: MusicElement[], id: string, changes: Partial<MusicElement>): { modified: boolean, newElements: MusicElement[] } {
        let listChanged = false; 
        const mappedElements = elements.map((element): MusicElement => {
            if (element.id === id) {
                let updatedElement: MusicElement;
                switch (element.type) {
                    case 'note':
                    case 'rest':
                        const valueChange = this.isPartialSingleNote(changes) ? { value: changes.value } : {};
                        const durationChange = changes.hasOwnProperty('duration') ? { duration: changes.duration } : {};
                        updatedElement = { ...element, ...valueChange, ...durationChange } as SingleNote;
                        break;
                    case 'group':
                        const originalGroup = element as GenericGroup; // Cast original element
                        const oldGroupDuration = originalGroup.duration;
                        const wasDurationChanged = changes.hasOwnProperty('duration');
                        const newGroupDuration = wasDurationChanged ? changes.duration : undefined;
                        const updatedChildrenFromChanges = (changes as Partial<GenericGroup>).children;
                        
                        // Apply direct changes to the group first
                        let initialUpdatedGroup = { 
                            ...element, 
                            ...(wasDurationChanged && { duration: newGroupDuration }), 
                            ...(updatedChildrenFromChanges !== undefined && { children: updatedChildrenFromChanges }) 
                        } as GenericGroup;

                        // If the group's duration was changed, update children based on the new rule
                        if (wasDurationChanged && initialUpdatedGroup.children) {
                            console.log(`[MelodyEditorService] Propagating group duration change (${oldGroupDuration} -> ${newGroupDuration}) to children of ${element.id}`);
                            initialUpdatedGroup.children = initialUpdatedGroup.children.map(child => {
                                // Apply if child duration is undefined OR matches the OLD group duration
                                if (child.duration === undefined || child.duration === oldGroupDuration) {
                                    console.log(` - Applying duration ${newGroupDuration} to child ${child.id} (was ${child.duration})`);
                                    return { ...child, duration: newGroupDuration }; // Apply the NEW duration
                                } else {
                                    console.log(` - Child ${child.id} keeps its own duration ${child.duration}`);
                                    return child;
                                }
                            });
                        }
                        updatedElement = initialUpdatedGroup; // Assign the potentially modified group
                        break;
                    case 'arpeggio':
                    case 'chord':
                        updatedElement = { ...element, ...(changes.hasOwnProperty('duration') && { duration: changes.duration }) } as CompositeNote;
                        break;
                    default:
                        updatedElement = element;
                }
                if (JSON.stringify(element) !== JSON.stringify(updatedElement)) {
                    listChanged = true; 
                    console.log('[MelodyEditorService] findAndUpdateRecursively: Target found & modified. Returning updated:', JSON.parse(JSON.stringify(updatedElement)));
                    return updatedElement;
                } else {
                    return element; 
                }
            }
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
                    listChanged = true;
                    console.log(`[MelodyEditorService] findAndUpdateRecursively: Child of ${element.id} (${element.type}) was modified. Updating parent.`);
                    if (updateProp === 'children') {
                        return { ...element, children: result.newElements } as GenericGroup;
                    } else {
                        return { ...element, notes: result.newElements as SingleNote[] } as CompositeNote;
                    }
                }
            }
            return element;
        });
        return { modified: listChanged, newElements: mappedElements };
    }

    updateNote(id: string, changes: Partial<MusicElement>): void {
        const currentElements = this.elementsSubject.value;
        const result = this.findAndUpdateRecursively([...currentElements], id, changes);
        if (result.modified) {
            console.log(`[MelodyEditorService] updateNote: Update detected for element ${id} or its children. Emitting new elements. Changes:`, changes);
            this.elementsSubject.next(result.newElements);
        } else {
            console.log(`[MelodyEditorService] updateNote: Element ${id} not found or no effective changes needed.`);
        }
    }
    
    loadFromNoteData(noteData: NoteData[]): void {
        const elements = noteData.map(note => NoteConverter.fromNoteData(note));
        this.elementsSubject.next(elements);
        this.selectedElementIdSubject.next(null);
    }
    
    toNoteData(): NoteData[] {
        return this.elementsSubject.value.map(element => 
            NoteConverter.toNoteData(element)
        );
    }

    startGroup(duration: NoteDuration, afterVisualElementId?: string | null): string {
        console.log(`[MelodyEditorService INSTANCE ${this.serviceInstanceId}] startGroup - Using provided duration: ${duration}`);
        const newGroup = NoteFactory.createGenericGroup([], duration);
        console.log('Service: Created new group:', newGroup);
        const currentElements = this.elementsSubject.value;
        let newElements = [...currentElements];
        let insertIndex = newElements.length;
        if (afterVisualElementId) {
            const findOriginalIndex = (targetId: string, elements: MusicElement[]): number => {
                let index = -1;
                elements.some((el, i) => {
                    if (el.id === targetId || `${el.id}_start` === targetId || `${el.id}_end` === targetId) {
                        index = targetId.endsWith('_end') ? i : i + 1;
                        return true; 
                    }
                    return false;
                });
                return index;
            };
            const targetIndex = findOriginalIndex(afterVisualElementId, currentElements);
            if (targetIndex !== -1) {
                insertIndex = targetIndex;
            }
        }
        newElements.splice(insertIndex, 0, newGroup);
        console.log('Service: Emitting new elements:', newElements);
        this.elementsSubject.next(newElements);
        return newGroup.id;
    }

    private findAndReorderRecursively(elements: MusicElement[], id: string, direction: number): { modified: boolean, newElements: MusicElement[] } {
        const index = elements.findIndex(e => e.id === id);
        if (index !== -1) {
            const newElements = [...elements];
            const targetIndex = index + direction;
            if (targetIndex >= 0 && targetIndex < newElements.length) {
                [newElements[index], newElements[targetIndex]] = [newElements[targetIndex], newElements[index]];
                return { modified: true, newElements: newElements };
            } else {
                return { modified: false, newElements: elements };
            }
        } else {
            let listChanged = false;
            const mappedElements = elements.map(element => {
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
                    const result = this.findAndReorderRecursively(currentChildren, id, direction);
                    if (result.modified) {
                        listChanged = true;
                        if (updateProp === 'children') {
                            return { ...element, children: result.newElements } as GenericGroup;
                        } else {
                            return { ...element, notes: result.newElements as SingleNote[] } as CompositeNote;
                        }
                    }
                }
                return element;
            });
            return { modified: listChanged, newElements: mappedElements };
        }
    }

    moveElementLeft(id: string): void {
        const currentElements = this.elementsSubject.value;
        const result = this.findAndReorderRecursively([...currentElements], id, -1);
        if (result.modified) {
            this.elementsSubject.next(result.newElements);
            this.selectNote(id);
        }
    }

    moveElementRight(id: string): void {
        const currentElements = this.elementsSubject.value;
        const result = this.findAndReorderRecursively([...currentElements], id, 1);
        if (result.modified) {
            this.elementsSubject.next(result.newElements);
            this.selectNote(id);
        }
    }

    public findElementAndParent(elementId: string, elements: MusicElement[] = this.elementsSubject.value, parent: MusicElement | null = null): { element: MusicElement | null, parent: MusicElement | null } {
        for (const element of elements) {
            if (element.id === elementId) {
                return { element, parent };
            }
            let children: MusicElement[] | undefined = undefined;
            if (element.type === 'group' && (element as GenericGroup).children) {
                children = (element as GenericGroup).children;
            } else if ((element.type === 'arpeggio' || element.type === 'chord') && (element as CompositeNote).notes) {
                children = (element as CompositeNote).notes;
            }
            if (children) {
                const found = this.findElementAndParent(elementId, children, element);
                if (found.element) {
                    return found;
                }
            }
        }
        return { element: null, parent: null };
    }

    moveGroupStartLeft(groupId: string): void {
        const { element: group, parent } = this.findElementAndParent(groupId);
        if (!group || group.type !== 'group') {
            console.log('Move prevented: Target is not a valid group.');
            return;
        }
        const sourceList = parent ? (parent as GenericGroup).children : this.elementsSubject.value;
        const groupIndex = sourceList.findIndex(e => e.id === groupId);
        if (groupIndex <= 0) {
             console.log('Move prevented: Group is already at the start or not found in the expected list.');
            return; 
        }
        const elementBefore = sourceList[groupIndex - 1];
        const currentGroup = group as GenericGroup;
        const groupDuration = currentGroup.duration;
        
        // Apply group duration to the element being included if it has no duration
        let elementToInclude = { ...elementBefore };
        if (elementToInclude.duration === undefined && groupDuration !== undefined) {
            console.log(`[MelodyEditorService] Applying group duration ${groupDuration} to element ${elementToInclude.id} being included by moveGroupStartLeft.`);
            elementToInclude.duration = groupDuration;
        }

        const newGroupChildren = [elementToInclude, ...(currentGroup.children || [])];
        if (parent && parent.type === 'group') {
            const parentChildrenCopy = [...parent.children];
            parentChildrenCopy.splice(groupIndex - 1, 1);
            const groupIndexInParentCopy = parentChildrenCopy.findIndex(e => e.id === groupId);
            if (groupIndexInParentCopy !== -1) {
                 parentChildrenCopy[groupIndexInParentCopy] = { 
                    ...currentGroup, 
                    children: newGroupChildren 
                };
            } else {
                console.error("Error moving nested group start: group vanished from parent copy?");
                return;
            }
            this.updateNote(parent.id, { children: parentChildrenCopy }); 
        } else {
            const rootElementsCopy = [...this.elementsSubject.value];
            const updatedGroupRoot = { ...currentGroup, children: newGroupChildren };
            const newRootElements = [
                ...rootElementsCopy.slice(0, groupIndex - 1),
                updatedGroupRoot,
                ...rootElementsCopy.slice(groupIndex + 1)
            ];
            this.elementsSubject.next(newRootElements);
        }
        this.selectNote(groupId);
    }

    moveGroupStartRight(groupId: string): void {
        const { element: group, parent } = this.findElementAndParent(groupId);
        if (!group || group.type !== 'group') {
            console.log('Move prevented: Target is not a valid group.');
            return;
        }
        const currentGroup = group as GenericGroup;
        if (!currentGroup.children || currentGroup.children.length === 0) {
            console.log('Move prevented: Group has no children to move out.');
            return;
        }
        const firstChild = currentGroup.children[0];
        const newGroupChildren = currentGroup.children.slice(1);
        const sourceList = parent ? (parent as GenericGroup).children : this.elementsSubject.value;
        const groupIndex = sourceList.findIndex(e => e.id === groupId);
        if (groupIndex === -1) {
            console.error("Error moving group start right: group not found in expected list.");
            return;
        }
        if (parent && parent.type === 'group') {
            const parentChildrenCopy = [...parent.children];
            const updatedGroupInParent = { ...currentGroup, children: newGroupChildren };
            parentChildrenCopy[groupIndex] = updatedGroupInParent;
            parentChildrenCopy.splice(groupIndex, 0, firstChild); 
            this.updateNote(parent.id, { children: parentChildrenCopy });
        } else {
            const rootElementsCopy = [...this.elementsSubject.value];
            const updatedGroupRoot = { ...currentGroup, children: newGroupChildren };
            const newRootElements = [
                ...rootElementsCopy.slice(0, groupIndex),
                firstChild,
                updatedGroupRoot,
                ...rootElementsCopy.slice(groupIndex + 1)
            ];
            this.elementsSubject.next(newRootElements);
        }
        this.selectNote(groupId);
    }
    
    moveGroupEndLeft(groupId: string): void {
        const { element: group, parent } = this.findElementAndParent(groupId);
        if (!group || group.type !== 'group') {
            console.log('Move prevented: Target is not a valid group.');
            return;
        }
        const currentGroup = group as GenericGroup;
        if (!currentGroup.children || currentGroup.children.length === 0) {
            console.log('Move prevented: Group has no children to move out.');
            return;
        }
        const lastChild = currentGroup.children[currentGroup.children.length - 1];
        const newGroupChildren = currentGroup.children.slice(0, -1);
        const sourceList = parent ? (parent as GenericGroup).children : this.elementsSubject.value;
        const groupIndex = sourceList.findIndex(e => e.id === groupId);
        if (groupIndex === -1) {
            console.error("Error moving group end left: group not found in expected list.");
            return;
        }
        if (parent && parent.type === 'group') {
            const parentChildrenCopy = [...parent.children];
            const updatedGroupInParent = { ...currentGroup, children: newGroupChildren };
            parentChildrenCopy[groupIndex] = updatedGroupInParent;
            parentChildrenCopy.splice(groupIndex + 1, 0, lastChild);
            this.updateNote(parent.id, { children: parentChildrenCopy });
        } else {
            const rootElementsCopy = [...this.elementsSubject.value];
            const updatedGroupRoot = { ...currentGroup, children: newGroupChildren };
            const newRootElements = [
                ...rootElementsCopy.slice(0, groupIndex),
                updatedGroupRoot,
                lastChild,
                ...rootElementsCopy.slice(groupIndex + 1)
            ];
            this.elementsSubject.next(newRootElements);
        }
        this.selectNote(groupId);
    }

    moveGroupEndRight(groupId: string): void {
        const { element: group, parent } = this.findElementAndParent(groupId);
        if (!group || group.type !== 'group') {
            console.log('Move prevented: Target is not a valid group.');
            return;
        }
        const sourceList = parent ? (parent as GenericGroup).children : this.elementsSubject.value;
        const groupIndex = sourceList.findIndex(e => e.id === groupId);
        if (groupIndex === -1 || groupIndex >= sourceList.length - 1) {
            console.log('Move prevented: Group is already at the end or not found in expected list.');
            return;
        }
        const elementAfter = sourceList[groupIndex + 1];
        const currentGroup = group as GenericGroup;
        const groupDuration = currentGroup.duration;

        // Apply group duration to the element being included if it has no duration
        let elementToInclude = { ...elementAfter };
        if (elementToInclude.duration === undefined && groupDuration !== undefined) {
            console.log(`[MelodyEditorService] Applying group duration ${groupDuration} to element ${elementToInclude.id} being included by moveGroupEndRight.`);
            elementToInclude.duration = groupDuration;
        }

        const newGroupChildren = [...(currentGroup.children || []), elementToInclude];
        if (parent && parent.type === 'group') {
            const parentChildrenCopy = [...parent.children];
            const updatedGroupInParent = { ...currentGroup, children: newGroupChildren };
            parentChildrenCopy[groupIndex] = updatedGroupInParent;
            parentChildrenCopy.splice(groupIndex + 1, 1);
            this.updateNote(parent.id, { children: parentChildrenCopy });
        } else {
            const rootElementsCopy = [...this.elementsSubject.value];
            const updatedGroupRoot = { ...currentGroup, children: newGroupChildren };
            const newRootElements = [
                ...rootElementsCopy.slice(0, groupIndex),
                updatedGroupRoot,
                ...rootElementsCopy.slice(groupIndex + 2)
            ];
            this.elementsSubject.next(newRootElements);
        }
        this.selectNote(groupId);
    }

    // <<< NEW METHOD for removing group >>>
    removeGroupAndPromoteChildren(groupId: string): void {
        const { element: group, parent } = this.findElementAndParent(groupId);

        if (!group || group.type !== 'group') {
            console.warn(`[MelodyEditorService] Cannot remove group: Element ${groupId} not found or is not a group.`);
            return;
        }

        const groupToRemove = group as GenericGroup;
        const childrenToPromote = groupToRemove.children || [];
        const groupDuration = groupToRemove.duration; // Get the group's duration BEFORE removing it

        // Prepare children: Assign group duration if child duration is undefined
        const preparedChildren = childrenToPromote.map(child => {
            // Create a new object for the child to avoid modifying the original potentially shared reference
            const childCopy = { ...child }; 
            if (childCopy.duration === undefined && groupDuration !== undefined) {
                childCopy.duration = groupDuration;
                console.log(`[MelodyEditorService] Promoting child ${childCopy.id}, assigning group duration ${groupDuration}`);
            }
            return childCopy;
        });

        // Get the list where the group resides (either root or parent's children)
        const sourceList = parent ? (parent as GenericGroup).children : this.elementsSubject.value;
        const groupIndex = sourceList.findIndex(e => e.id === groupId);

        if (groupIndex === -1) {
             console.error(`[MelodyEditorService] Cannot find group ${groupId} in its expected list during removal.`);
             return;
        }

        // Create the new list by replacing the group with its prepared children
        const updatedList = [
            ...sourceList.slice(0, groupIndex),
            ...preparedChildren, // Insert children
            ...sourceList.slice(groupIndex + 1)
        ];

        let firstChildIdToSelect: string | null = preparedChildren.length > 0 ? preparedChildren[0].id : null;
        let nextElementIdFallback: string | null = null;

        // Determine fallback selection (element before or after the removed group)
        if (sourceList.length > preparedChildren.length) { // Check if there were elements other than the group
             if (groupIndex > 0) {
                 nextElementIdFallback = sourceList[groupIndex - 1].id;
             } else if (groupIndex + 1 < sourceList.length) {
                 // Element after the inserted children (original index + children length)
                 const originalIndexAfterGroup = groupIndex + 1;
                 if (originalIndexAfterGroup < updatedList.length) {
                     nextElementIdFallback = updatedList[originalIndexAfterGroup].id;
                 }
             }
        }
        
        // Update the list (either parent's children or root)
        if (parent && (parent.type === 'group' || parent.type === 'arpeggio' || parent.type === 'chord')) {
            // We need to handle different parent types if necessary, assuming GenericGroup for now
            console.log(`[MelodyEditorService] Updating parent ${parent.id} children after removing group ${groupId}`);
            this.updateNote(parent.id, { children: updatedList }); 
        } else {
            console.log(`[MelodyEditorService] Updating root elements after removing group ${groupId}`);
            this.elementsSubject.next(updatedList);
        }

        // Select the first promoted child, or fallback to adjacent element
        const finalIdToSelect = firstChildIdToSelect ?? nextElementIdFallback;
        console.log(`[MelodyEditorService] Selecting element after group removal: ${finalIdToSelect}`);
        this.selectNote(finalIdToSelect); 
    }
    // <<< ----------------------------- >>>

    // <<< NEW HELPER METHODS for direct element manipulation >>>
    public loadElements(elements: MusicElement[]): void {
        console.log(`[MelodyEditorService INSTANCE ${this.serviceInstanceId}] loadElements called with ${elements.length} elements.`);
        // Clear selection and set new elements
        this.elementsSubject.next(elements);
        this.selectedElementIdSubject.next(elements.length > 0 ? elements[0].id : null); // Select first or null
    }

    public getElements(): MusicElement[] {
        return this.elementsSubject.value;
    }
    // <<< ------------------------------------------------ >>>
} 