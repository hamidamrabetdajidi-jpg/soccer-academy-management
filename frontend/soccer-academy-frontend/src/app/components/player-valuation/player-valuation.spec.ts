import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerValuationComponent } from './player-valuation';

describe('PlayerValuation', () => {
  let component: PlayerValuationComponent;
  let fixture: ComponentFixture<PlayerValuationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerValuationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerValuationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
