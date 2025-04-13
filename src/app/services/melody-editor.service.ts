import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MusicElement, SingleNote, NoteGroup, NoteDuration, NoteFactory, NoteConverter } from '../model/melody';
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
    
    addNote(): void {
        const newNote = NoteFactory.createSingleNote(1, '4n');
        const currentElements = this.elementsSubject.value;
        this.elementsSubject.next([...currentElements, newNote]);
        // Optionally select the new note
        // this.selectNote(newNote.id);
    }
    
    addNoteAfter(id: string): void {
        const currentElements = this.elementsSubject.value;
        const index = currentElements.findIndex(e => e.id === id);
        if (index === -1) return;

        const newNote = NoteFactory.createSingleNote(1, '4n');
        const newElements = [...currentElements];
        newElements.splice(index + 1, 0, newNote);
        this.elementsSubject.next(newElements);
        // Optionally select the new note
        this.selectNote(newNote.id);
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
    
    updateNote(id: string, changes: Partial<SingleNote>): void {
        const elements = this.elementsSubject.value;
        const index = elements.findIndex(e => e.id === id);
        if (index === -1) return;

        const e = elements[index];
        // Allow updating rests as well, maybe?
        // if (e.type !== 'note') return;

        const updatedNote = { ...e, ...changes } as MusicElement; // Use MusicElement for broader type
        const newElements = [...elements];
        newElements[index] = updatedNote;
        this.elementsSubject.next(newElements);
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
} 