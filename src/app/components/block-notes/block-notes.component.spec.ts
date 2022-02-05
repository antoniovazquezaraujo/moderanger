import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockNotesComponent } from './block-notes.component';

describe('BlockNotesComponent', () => {
  let component: BlockNotesComponent;
  let fixture: ComponentFixture<BlockNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BlockNotesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BlockNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
