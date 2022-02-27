import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockCommandsComponent } from './block-commands.component';

describe('BlockCommandsComponent', () => {
  let component: BlockCommandsComponent;
  let fixture: ComponentFixture<BlockCommandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BlockCommandsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BlockCommandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
