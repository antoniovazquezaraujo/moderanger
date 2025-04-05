import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MusicElement, SingleNote, NoteGroup, NoteDuration, NoteFactory, NoteConverter } from '../model/melody';
import { NoteData } from '../model/note';

@Injectable({
    providedIn: 'root'
})
export class MelodyEditorService {
    private elementsSubject = new BehaviorSubject<MusicElement[]>([]);
    elements$: Observable<MusicElement[]> = this.elementsSubject.asObservable();
    
    constructor() {}
    
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
    }
    
    addNoteAfter(id: string): void {
        const currentElements = this.elementsSubject.value;
        const index = currentElements.findIndex(e => e.id === id);
        if (index === -1) return;

        const newNote = NoteFactory.createSingleNote(1, '4n');
        const newElements = [...currentElements];
        newElements.splice(index + 1, 0, newNote);
        this.elementsSubject.next(newElements);
    }
    
    removeNote(id: string): void {
        const currentElements = this.elementsSubject.value;
        const newElements = currentElements.filter(e => e.id !== id);
        this.elementsSubject.next(newElements);
    }
    
    selectNote(id: string): void {
        const currentElements = this.elementsSubject.value;
        const newElements = currentElements.map(e => ({
            ...e,
            isSelected: e.id === id
        }));
        this.elementsSubject.next(newElements);
    }
    
    updateNote(id: string, changes: Partial<SingleNote>): void {
        const currentElements = this.elementsSubject.value;
        const newElements = currentElements.map(e => {
            if (e.id === id) {
                if (e.type === 'note' || e.type === 'rest') {
                    return { ...e, ...changes } as SingleNote;
                }
            }
            return e;
        });
        this.elementsSubject.next(newElements);
    }
    
    loadFromNoteData(noteData: NoteData[]): void {
        const elements = noteData.map(note => NoteConverter.fromNoteData(note));
        this.elementsSubject.next(elements);
    }
    
    toNoteData(): NoteData[] {
        return this.elementsSubject.value.map(element => NoteConverter.toNoteData(element));
    }
} 