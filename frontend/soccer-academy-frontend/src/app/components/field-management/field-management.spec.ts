import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldManagementComponent } from './field-management';

describe('FieldManagement', () => {
  let component: FieldManagementComponent;
  let fixture: ComponentFixture<FieldManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FieldManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
