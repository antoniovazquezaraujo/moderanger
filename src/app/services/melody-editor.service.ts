import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MusicElement, SingleNote, CompositeNote, GenericGroup, NoteDuration, NoteFactory, NoteConverter } from '../model/melody';
import { NoteData } from '../model/note';

@Injectable({
    providedIn: 'root'
})
export class MelodyEditorService {
    private elementsSubject = new BehaviorSubject<MusicElement[]>([]);
    elements$ = this.elementsSubject.asObservable();
    
    // New subject for selected element ID
    private selectedElementIdSubject = new BehaviorSubject<string | null>(null);
    selectedElementId$ = this.selectedElementIdSubject.asObservable();

    constructor() {}
    
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
    
    addNote(noteData?: Partial<SingleNote>): string | null {
        const newNote = NoteFactory.createSingleNote(
            noteData?.value ?? 1,
            noteData?.duration ?? '4n'
        );
        const currentElements = this.elementsSubject.value;
        this.elementsSubject.next([...currentElements, newNote]);
        this.selectNote(newNote.id);
        return newNote.id;
    }
    
    addNoteAfter(id: string, noteData?: Partial<SingleNote>): string | null {
        const currentElements = this.elementsSubject.value;
        const index = currentElements.findIndex(e => e.id === id);
        if (index === -1) return null;

        const newNote = NoteFactory.createSingleNote(
            noteData?.value ?? 1,
            noteData?.duration ?? '4n'
        );
        const newElements = [...currentElements];
        newElements.splice(index + 1, 0, newNote);
        this.elementsSubject.next(newElements);
        this.selectNote(newNote.id);
        return newNote.id;
    }
    
    addNoteToGroup(groupId: string, noteData?: Partial<SingleNote>): string | null {
        const { element: group } = this.findElementAndParent(groupId);

        if (!group || group.type !== 'group') {
            console.warn(`addNoteToGroup: Element ${groupId} not found or is not a GenericGroup.`);
            return null;
        }

        const newNote = NoteFactory.createSingleNote(
            noteData?.value ?? 1, 
            noteData?.duration ?? '4n' 
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
        // DO NOT modify elements or call elementsSubject.next() here anymore
        /*
        const currentElements = this.elementsSubject.value;
        const newElements = currentElements.map(e => ({
            ...e,
            isSelected: e.id === id
        }));
        this.elementsSubject.next(newElements);
        */
    }
    
    // <<< Type Guard >>>
    private isPartialSingleNote(changes: Partial<MusicElement>): changes is Partial<SingleNote> {
        // Check only if the 'value' property exists
        return changes.hasOwnProperty('value');
    }

    // <<< FUNCIÓN AUXILIAR RECURSIVA PARA ACTUALIZAR >>>
    private findAndUpdateRecursively(elements: MusicElement[], id: string, changes: Partial<MusicElement>): { modified: boolean, newElements: MusicElement[] } {
        let listChanged = false; // Flag to track if the list itself was changed
        const mappedElements = elements.map((element): MusicElement => {
            if (element.id === id) {
                // Elemento encontrado, aplicar cambios de forma segura según el tipo
                let updatedElement: MusicElement;

                switch (element.type) {
                    case 'note':
                    case 'rest':
                        const valueChange = this.isPartialSingleNote(changes) ? { value: changes.value } : {};
                        const durationChange = changes.hasOwnProperty('duration') ? { duration: changes.duration } : {};
                        updatedElement = { ...element, ...valueChange, ...durationChange } as SingleNote;
                        break;
                    case 'group':
                        const updatedChildrenFromChanges = (changes as Partial<GenericGroup>).children;
                        updatedElement = { ...element, ...(changes.hasOwnProperty('duration') && { duration: changes.duration }), ...(updatedChildrenFromChanges !== undefined && { children: updatedChildrenFromChanges }) } as GenericGroup;
                        break;
                    case 'arpeggio':
                    case 'chord':
                        updatedElement = { ...element, ...(changes.hasOwnProperty('duration') && { duration: changes.duration }) } as CompositeNote;
                        break;
                    default:
                        updatedElement = element;
                }
                
                // Check if the update actually changed the element before returning
                if (JSON.stringify(element) !== JSON.stringify(updatedElement)) {
                    listChanged = true; // Mark list as changed because this element was modified
                    console.log('[MelodyEditorService] findAndUpdateRecursively: Target found & modified. Returning updated:', JSON.parse(JSON.stringify(updatedElement)));
                    return updatedElement;
                } else {
                    // Element found, but changes resulted in the same object (e.g., setting same duration)
                    return element; // Return original if no effective change
                }
            }

            // --- RECURSION PARA CONTENEDORES --- 
            let currentChildren: MusicElement[] | undefined;
            let updateProp: 'children' | 'notes' | null = null;

            if (element.type === 'group' && (element as GenericGroup).children) {
                currentChildren = (element as GenericGroup).children;
                updateProp = 'children';
            } else if ((element.type === 'arpeggio' || element.type === 'chord') && (element as CompositeNote).notes) {
                currentChildren = (element as CompositeNote).notes; // Use notes for CompositeNote
                updateProp = 'notes';
            }

            if (currentChildren && updateProp) {
                const result = this.findAndUpdateRecursively(currentChildren, id, changes);
                if (result.modified) { // Check if the recursive call modified its list
                    listChanged = true; // Mark this list as changed because a child list was modified
                    console.log(`[MelodyEditorService] findAndUpdateRecursively: Child of ${element.id} (${element.type}) was modified. Updating parent.`);
                    if (updateProp === 'children') {
                        return { ...element, children: result.newElements } as GenericGroup;
                    } else { // updateProp === 'notes'
                        return { ...element, notes: result.newElements as SingleNote[] } as CompositeNote; // Ensure cast for notes
                    }
                }
            }
            
            // Si no es el elemento y no hubo cambios en hijos (o no es contenedor), devolver original
            return element;
        });
        // Return the potentially modified array and whether it was changed
        return { modified: listChanged, newElements: mappedElements };
    }

    updateNote(id: string, changes: Partial<MusicElement>): void {
        const currentElements = this.elementsSubject.value;
        // --- RESTORED ORIGINAL CODE --- 
        const result = this.findAndUpdateRecursively([...currentElements], id, changes);

        // Use the 'modified' flag returned by the recursive function
        if (result.modified) {
            console.log(`[MelodyEditorService] updateNote: Update detected for element ${id} or its children. Emitting new elements. Changes:`, changes);
            this.elementsSubject.next(result.newElements);
        } else {
            console.log(`[MelodyEditorService] updateNote: Element ${id} not found or no effective changes needed.`);
        }
        // --- END RESTORED ORIGINAL CODE --- 
    }
    
    loadFromNoteData(noteData: NoteData[]): void {
        const elements = noteData.map(note => NoteConverter.fromNoteData(note));
        this.elementsSubject.next(elements);
        // Reset selection when loading new data
        this.selectedElementIdSubject.next(null);
    }
    
    toNoteData(): NoteData[] {
        return this.elementsSubject.value.map(element => NoteConverter.toNoteData(element));
    }

    startGroup(duration: NoteDuration, afterVisualElementId?: string | null): string {
        console.log(`Service: startGroup called with duration=${duration}, afterVisualElementId=${afterVisualElementId}`);
        const newGroup = NoteFactory.createGenericGroup([], duration);
        console.log('Service: Created new group:', newGroup);
        const currentElements = this.elementsSubject.value;
        let newElements = [...currentElements];
        let insertIndex = newElements.length; // Por defecto, al final

        if (afterVisualElementId) {
            // Encontrar el ÍNDICE del elemento original correspondiente al ID visual en la lista RAÍZ
            const findOriginalIndex = (targetId: string, elements: MusicElement[]): number => {
                let index = -1;
                elements.some((el, i) => {
                    if (el.id === targetId || `${el.id}_start` === targetId || `${el.id}_end` === targetId) {
                        index = i;
                        return true; // Encontrado en el nivel raíz
                    } 
                    // No necesitamos buscar anidado para el índice de inserción
                    return false;
                });
                return index;
            };

            const targetIndex = findOriginalIndex(afterVisualElementId, currentElements);

            if (targetIndex !== -1) {
                insertIndex = targetIndex + 1; // Insertar después del elemento encontrado
            }
        }
        
        newElements.splice(insertIndex, 0, newGroup);

        console.log('Service: Emitting new elements:', newElements);
        this.elementsSubject.next(newElements);
        // this.selectNote(newGroup.id); // <<< QUITAR: La selección la hará el componente
        return newGroup.id; // <<< DEVOLVER ID
    }

    // <<< FUNCIÓN AUXILIAR RECURSIVA PARA ENCONTRAR Y MOVER >>>
    private findAndReorderRecursively(elements: MusicElement[], id: string, direction: number): { modified: boolean, newElements: MusicElement[] } {
        const index = elements.findIndex(e => e.id === id);
        
        if (index !== -1) { // Elemento encontrado en esta lista
            const newElements = [...elements];
            const targetIndex = index + direction;
            
            // Comprobar límites
            if (targetIndex >= 0 && targetIndex < newElements.length) {
                // Realizar intercambio
                [newElements[index], newElements[targetIndex]] = [newElements[targetIndex], newElements[index]];
                return { modified: true, newElements: newElements };
            } else {
                return { modified: false, newElements: elements }; // No se puede mover fuera de límites
            }
        } else { // No encontrado en esta lista, buscar en hijos
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
                        // Devolver el elemento padre con los hijos modificados y CAST explícito
                        if (updateProp === 'children') {
                            return { ...element, children: result.newElements } as GenericGroup;
                        } else { // updateProp === 'notes'
                            return { ...element, notes: result.newElements as SingleNote[] } as CompositeNote;
                        }
                    }
                }
                // Si no se encontró en hijos o no tiene hijos, devolver original
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
            this.selectNote(id); // Mantener foco?
        }
    }

    moveElementRight(id: string): void {
        const currentElements = this.elementsSubject.value;
        const result = this.findAndReorderRecursively([...currentElements], id, 1);
        if (result.modified) {
            this.elementsSubject.next(result.newElements);
            this.selectNote(id); // Mantener foco?
        }
    }

    // <<< HACER PÚBLICO >>>
    public findElementAndParent(elementId: string, elements: MusicElement[] = this.elementsSubject.value, parent: MusicElement | null = null): { element: MusicElement | null, parent: MusicElement | null } {
        for (const element of elements) {
            if (element.id === elementId) {
                return { element, parent };
            }
            // Buscar recursivamente en hijos de grupos genéricos o compuestos
            let children: MusicElement[] | undefined = undefined;
            if (element.type === 'group' && (element as GenericGroup).children) {
                children = (element as GenericGroup).children;
            } else if ((element.type === 'arpeggio' || element.type === 'chord') && (element as CompositeNote).notes) {
                // Nota: CompositeNote tiene 'notes', no 'children'
                children = (element as CompositeNote).notes;
            }
            
            if (children) {
                const found = this.findElementAndParent(elementId, children, element); // Pasar elemento actual como padre
                if (found.element) {
                    return found;
                }
            }
        }
        return { element: null, parent: null };
    }

    // --- Modificar Funciones para mover los bordes de un grupo ---
    
    moveGroupStartLeft(groupId: string): void {
        const { element: group, parent } = this.findElementAndParent(groupId);

        if (!group || group.type !== 'group') {
            console.log('Move prevented: Target is not a valid group.');
            return;
        }

        // Determine the list where the group resides (parent's children or root)
        const sourceList = parent ? (parent as GenericGroup).children : this.elementsSubject.value;
        const groupIndex = sourceList.findIndex(e => e.id === groupId);

        // Check if the group can be moved left (i.e., it's not the first element)
        if (groupIndex <= 0) {
             console.log('Move prevented: Group is already at the start or not found in the expected list.');
            return; 
        }

        // Get the element immediately preceding the group in the source list
        const elementBefore = sourceList[groupIndex - 1];
        const currentGroup = group as GenericGroup;

        // --- Create the updated children list for the target group ---
        const newGroupChildren = [elementBefore, ...(currentGroup.children || [])];

        // --- Apply the changes based on whether the group is nested or at root ---
        if (parent && parent.type === 'group') {
            // --- Nested group: Modify parent's children array ---
            const parentChildrenCopy = [...parent.children]; // Work on a copy
            
            // Remove elementBefore from its original position in the parent's list
            parentChildrenCopy.splice(groupIndex - 1, 1);
            
            // Find the index of the group *in the modified parent copy* and update it
            const groupIndexInParentCopy = parentChildrenCopy.findIndex(e => e.id === groupId);
            if (groupIndexInParentCopy !== -1) {
                 parentChildrenCopy[groupIndexInParentCopy] = { 
                    ...currentGroup, 
                    children: newGroupChildren 
                }; // Update the group with its new children
            } else {
                console.error("Error moving nested group start: group vanished from parent copy?");
                return;
            }
            
            // Apply the updated children array to the parent group via updateNote
            this.updateNote(parent.id, { children: parentChildrenCopy }); 

        } else {
            // --- Root level group: Modify the root elements array ---
            const rootElementsCopy = [...this.elementsSubject.value]; // Work on a copy
            const updatedGroupRoot = { ...currentGroup, children: newGroupChildren };
            
            // Construct the new root elements array by removing elementBefore and updating the group
            const newRootElements = [
                ...rootElementsCopy.slice(0, groupIndex - 1), // Elements before the elementBefore
                updatedGroupRoot,                            // The updated group
                ...rootElementsCopy.slice(groupIndex + 1)    // Elements after the group
            ];
            this.elementsSubject.next(newRootElements); // Emit the new root array
        }

        this.selectNote(groupId); // Maintain selection on the moved group
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
            return; // Cannot move start right if group is empty
        }

        // Get the first child to be moved out
        const firstChild = currentGroup.children[0];
        // Create the new children list for the group (excluding the first child)
        const newGroupChildren = currentGroup.children.slice(1);
        
        // Determine the list where the group resides
        const sourceList = parent ? (parent as GenericGroup).children : this.elementsSubject.value;
        const groupIndex = sourceList.findIndex(e => e.id === groupId);

        if (groupIndex === -1) {
            console.error("Error moving group start right: group not found in expected list.");
            return;
        }

        // --- Apply the changes based on whether the group is nested or at root ---
        if (parent && parent.type === 'group') {
            // --- Nested group: Modify parent's children array ---
            const parentChildrenCopy = [...parent.children]; // Work on a copy
            
            // Update the group within the parent's list (with fewer children)
            const updatedGroupInParent = { ...currentGroup, children: newGroupChildren };
            parentChildrenCopy[groupIndex] = updatedGroupInParent;
            
            // Insert the firstChild *before* the updated group in the parent's list
            parentChildrenCopy.splice(groupIndex, 0, firstChild); 
            
            // Apply the updated children array to the parent group via updateNote
            this.updateNote(parent.id, { children: parentChildrenCopy });

        } else {
            // --- Root level group: Modify the root elements array ---
            const rootElementsCopy = [...this.elementsSubject.value]; // Work on a copy
            const updatedGroupRoot = { ...currentGroup, children: newGroupChildren };

            // Construct the new root elements array
            const newRootElements = [
                ...rootElementsCopy.slice(0, groupIndex), // Elements before the group
                firstChild,                           // The child that was moved out
                updatedGroupRoot,                     // The updated group (now with fewer children)
                ...rootElementsCopy.slice(groupIndex + 1)   // Elements after the group
            ];
            this.elementsSubject.next(newRootElements); // Emit the new root array
        }

        this.selectNote(groupId); // Maintain selection on the modified group
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
            return; // Cannot move end left if group is empty
        }

        // Get the last child to be moved out
        const lastChild = currentGroup.children[currentGroup.children.length - 1];
        // Create the new children list for the group (excluding the last child)
        const newGroupChildren = currentGroup.children.slice(0, -1);

        // Determine the list where the group resides
        const sourceList = parent ? (parent as GenericGroup).children : this.elementsSubject.value;
        const groupIndex = sourceList.findIndex(e => e.id === groupId);

        if (groupIndex === -1) {
            console.error("Error moving group end left: group not found in expected list.");
            return;
        }

        // --- Apply the changes based on whether the group is nested or at root ---
        if (parent && parent.type === 'group') {
            // --- Nested group: Modify parent's children array ---
            const parentChildrenCopy = [...parent.children]; // Work on a copy

            // Update the group within the parent's list (with fewer children)
            const updatedGroupInParent = { ...currentGroup, children: newGroupChildren };
            parentChildrenCopy[groupIndex] = updatedGroupInParent;

            // Insert the lastChild *after* the updated group in the parent's list
            parentChildrenCopy.splice(groupIndex + 1, 0, lastChild);

            // Apply the updated children array to the parent group via updateNote
            this.updateNote(parent.id, { children: parentChildrenCopy });

        } else {
            // --- Root level group: Modify the root elements array ---
            const rootElementsCopy = [...this.elementsSubject.value]; // Work on a copy
            const updatedGroupRoot = { ...currentGroup, children: newGroupChildren };

            // Construct the new root elements array
            const newRootElements = [
                ...rootElementsCopy.slice(0, groupIndex), // Elements before the group
                updatedGroupRoot,                     // The updated group (now with fewer children)
                lastChild,                            // The child that was moved out
                ...rootElementsCopy.slice(groupIndex + 1)   // Elements after the group
            ];
            this.elementsSubject.next(newRootElements); // Emit the new root array
        }

        this.selectNote(groupId); // Maintain selection on the modified group
    }

    moveGroupEndRight(groupId: string): void {
        const { element: group, parent } = this.findElementAndParent(groupId);

        if (!group || group.type !== 'group') {
            console.log('Move prevented: Target is not a valid group.');
            return;
        }

        // Determine the list where the group resides
        const sourceList = parent ? (parent as GenericGroup).children : this.elementsSubject.value;
        const groupIndex = sourceList.findIndex(e => e.id === groupId);

        // Check if the group can be moved right (i.e., it's not the last element)
        if (groupIndex === -1 || groupIndex >= sourceList.length - 1) {
            console.log('Move prevented: Group is already at the end or not found in expected list.');
            return;
        }

        // Get the element immediately following the group in the source list
        const elementAfter = sourceList[groupIndex + 1];
        const currentGroup = group as GenericGroup;

        // --- Create the updated children list for the target group ---
        const newGroupChildren = [...(currentGroup.children || []), elementAfter];

        // --- Apply the changes based on whether the group is nested or at root ---
        if (parent && parent.type === 'group') {
            // --- Nested group: Modify parent's children array ---
            const parentChildrenCopy = [...parent.children]; // Work on a copy
            
            // Update the group within the parent's list (with new child)
            const updatedGroupInParent = { ...currentGroup, children: newGroupChildren };
            parentChildrenCopy[groupIndex] = updatedGroupInParent;

            // Remove elementAfter from its original position in the parent's list
            parentChildrenCopy.splice(groupIndex + 1, 1);

            // Apply the updated children array to the parent group via updateNote
            this.updateNote(parent.id, { children: parentChildrenCopy });

        } else {
            // --- Root level group: Modify the root elements array ---
            const rootElementsCopy = [...this.elementsSubject.value]; // Work on a copy
            const updatedGroupRoot = { ...currentGroup, children: newGroupChildren };
            
            // Construct the new root elements array
            const newRootElements = [
                ...rootElementsCopy.slice(0, groupIndex), // Elements before the group
                updatedGroupRoot,                     // The updated group (with new child)
                ...rootElementsCopy.slice(groupIndex + 2)   // Elements after the elementAfter
            ];
            this.elementsSubject.next(newRootElements); // Emit the new root array
        }

        this.selectNote(groupId); // Maintain selection on the modified group
    }
} 