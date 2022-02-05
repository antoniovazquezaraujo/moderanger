import { NgModule } from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatSliderModule} from '@angular/material/slider';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import {MatSelectModule} from '@angular/material/select';
import {MatInputModule} from '@angular/material/input'
import {MatGridListModule} from '@angular/material/grid-list';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatTreeModule} from '@angular/material/tree';
import {MatChipsModule} from '@angular/material/chips';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatIconModule} from '@angular/material/icon';

const MaterialComponents = [
    MatButtonModule,
    MatSliderModule,
    MatButtonToggleModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatInputModule,
    MatGridListModule,
    MatExpansionModule,
    MatTreeModule,
    FormsModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatIconModule
];
 
@NgModule({
  imports: [
    MaterialComponents
  ],
  exports: [
    MaterialComponents
  ]
})
export class MaterialModule { }
