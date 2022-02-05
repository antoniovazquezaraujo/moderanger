import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockCommandComponent } from './block-command.component';

describe('BlockCommandComponent', () => {
  let component: BlockCommandComponent;
  let fixture: ComponentFixture<BlockCommandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BlockCommandComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BlockCommandComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
