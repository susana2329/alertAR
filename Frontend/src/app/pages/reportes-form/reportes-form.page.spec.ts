import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportesFormPage } from './reportes-form.page';

describe('ReportesFormPage', () => {
  let component: ReportesFormPage;
  let fixture: ComponentFixture<ReportesFormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportesFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
