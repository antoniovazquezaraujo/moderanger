import { Component, Input, Output, EventEmitter, forwardRef, ChangeDetectorRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MelodyEditorService } from '../../services/melody-editor.service';

@Component({
    selector: 'app-melody-editor-wrapper',
    template: `
        <app-melody-editor 
            [notes]="notes" 
            (notesChange)="onNotesChange($event)"
            [showVariableIcon]="showVariableIcon">
        </app-melody-editor>
    `,
    providers: [
        MelodyEditorService,
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => MelodyEditorWrapperComponent),
            multi: true
        }
    ]
})
export class MelodyEditorWrapperComponent implements ControlValueAccessor {
    @Input() notes: string = '';
    @Input() showVariableIcon: boolean = true;

    private onChange = (_: any) => {};
    private onTouched = () => {};

    constructor(private cdr: ChangeDetectorRef) {}

    writeValue(value: any): void {
        const newValue = value || '';
        if (newValue !== this.notes) {
            this.notes = newValue;
            this.cdr.detectChanges();
        }
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    onNotesChange(newNotesValue: string): void {
        if (newNotesValue !== this.notes) {
            this.notes = newNotesValue;
            this.onChange(this.notes);
        }
        this.onTouched();
    }
} 