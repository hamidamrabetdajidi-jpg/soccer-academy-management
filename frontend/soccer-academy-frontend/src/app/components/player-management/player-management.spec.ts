import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerManagement } from './player-management';

describe('PlayerManagement', () => {
  let component: PlayerManagement;
  let fixture: ComponentFixture<PlayerManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
