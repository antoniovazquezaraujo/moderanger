import { Injectable } from '@angular/core';
import { fromEvent, Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface KeyboardEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardService {
  private keydownSubject = new Subject<KeyboardEvent>();
  private keyupSubject = new Subject<KeyboardEvent>();

  constructor() {
    this.initializeKeyboardListeners();
  }

  onKeyDown(): Observable<KeyboardEvent> {
    return this.keydownSubject.asObservable();
  }

  onKeyUp(): Observable<KeyboardEvent> {
    return this.keyupSubject.asObservable();
  }

  onKey(key: string): Observable<KeyboardEvent> {
    return this.onKeyDown().pipe(
      filter(event => event.key === key)
    );
  }

  onKeys(keys: string[]): Observable<KeyboardEvent> {
    return this.onKeyDown().pipe(
      filter(event => keys.includes(event.key))
    );
  }

  onKeyCombo(key: string, modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }): Observable<KeyboardEvent> {
    return this.onKeyDown().pipe(
      filter(event => 
        event.key === key &&
        (modifiers.ctrl === undefined || event.ctrlKey === modifiers.ctrl) &&
        (modifiers.shift === undefined || event.shiftKey === modifiers.shift) &&
        (modifiers.alt === undefined || event.altKey === modifiers.alt) &&
        (modifiers.meta === undefined || event.metaKey === modifiers.meta)
      )
    );
  }

  private initializeKeyboardListeners(): void {
    fromEvent<KeyboardEvent>(document, 'keydown').pipe(
      map(event => this.mapKeyboardEvent(event))
    ).subscribe(event => this.keydownSubject.next(event));

    fromEvent<KeyboardEvent>(document, 'keyup').pipe(
      map(event => this.mapKeyboardEvent(event))
    ).subscribe(event => this.keyupSubject.next(event));
  }

  private mapKeyboardEvent(event: KeyboardEvent): KeyboardEvent {
    return {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey
    };
  }
} 