import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-melody-option',
  template: `
    <div class="melody-option">
      <span class="variable-name">{{name}}</span>
      <div class="notes-container">
        <div *ngFor="let note of notes" class="note-item">
          <span class="note-value">{{note}}</span>
          <span class="note-duration">1</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .melody-option {
      display: flex;
      flex-direction: column;
      padding: 4px;
    }
    .variable-name {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .notes-container {
      display: flex;
      gap: 2px;
    }
    .note-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: 1px solid #ddd;
      background-color: white;
    }
    .note-value {
      font-size: 12px;
    }
    .note-duration {
      font-size: 8px;
      color: #666;
    }
  `]
})
export class MelodyOptionComponent {
  @Input() name: string = '';
  @Input() notes: string[] = [];
} 