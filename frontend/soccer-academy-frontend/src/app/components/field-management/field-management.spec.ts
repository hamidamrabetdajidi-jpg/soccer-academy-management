import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldManagement } from './field-management';

describe('FieldManagement', () => {
  let component: FieldManagement;
  let fixture: ComponentFixture<FieldManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FieldManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
