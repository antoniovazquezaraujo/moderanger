import { Component } from '@angular/core';
import { InstrumentFactory } from './model/instruments';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'moderanger';
 
  constructor() {
    // Preload piano samples as soon as the app starts
    InstrumentFactory.preloadPiano();
  }
}
