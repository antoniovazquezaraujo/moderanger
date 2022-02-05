import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Block } from 'src/app/model/block';
import { Command } from 'src/app/model/command';
import { Part } from 'src/app/model/part';
import { Song } from 'src/app/model/song';

@Component({
    selector: 'app-new-editor',
    templateUrl: './new-editor.component.html',
    styleUrls: ['./new-editor.component.css']
})
export class NewEditorComponent implements OnInit{

    public song:Song;
    // separatorKeysCodes: number[] = [ENTER, COMMA];
    // fruitCtrl = new FormControl();
    // filteredFruits: Observable<string[]>;
    // fruits: string[] = ['Lemon'];
    // allFruits: string[] = ['Apple', 'Lemon', 'Lime', 'Orange', 'Strawberry'];
    // foods: string[] = ['pan', 'vino', 'carne', 'pescado'];

    // @ViewChild('fruitInput') fruitInput!: ElementRef<HTMLInputElement>;

    getParts(){
        return this.song.parts;
    }
    constructor() {
        this.song = new Song(this.createParts());
        // this.filteredFruits = this.fruitCtrl.valueChanges.pipe(
        //     startWith(null),
        //     map((fruit: string | null) => (fruit ? this._filter(fruit) : this.allFruits.slice())),
        // );
    }
    ngOnInit(): void {
    }

    createParts() : Part[]{
         return [
            new Part(
                [new Block(
                    [new Command("M", "0"), 
                    new Command("I", "1")
                ], "234")
            ]),
            new Part(
                [new Block(
                    [new Command("S", "0"), 
                    new Command("P", "F")
                ], "234")
            ]),
            new Part(
                [new Block(
                    [new Command("R", "3"), 
                    new Command("W", "2")
                ], "234")
            ]),
        ];
    
    }
    // add(event: MatChipInputEvent): void {
    //     const value = (event.value || '').trim();

    //     // Add our fruit
    //     if (value) {
    //         this.fruits.push(value);
    //     }

    //     // Clear the input value
    //     event.chipInput!.clear();

    //     this.fruitCtrl.setValue(null);
    // }

    // remove(fruit: string): void {
    //     const index = this.fruits.indexOf(fruit);

    //     if (index >= 0) {
    //         this.fruits.splice(index, 1);
    //     }
    // }

    // Cuando seleccionamos un elemento de la lista
    // selected(event: MatAutocompleteSelectedEvent): void {
    //     this.fruits.push(event.option.viewValue);
    //     this.fruitInput.nativeElement.value = '';
    //     this.fruitCtrl.setValue(null);
    // }

    // private _filter(value: string): string[] {
    //     const filterValue = value.toLowerCase();
    //     return this.allFruits.filter(fruit => fruit.toLowerCase().includes(filterValue));
    // }
}