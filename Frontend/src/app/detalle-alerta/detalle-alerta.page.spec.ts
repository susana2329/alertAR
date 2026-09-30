import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleAlertaPage } from './detalle-alerta.page';

describe('DetalleAlertaPage', () => {
  let component: DetalleAlertaPage;
  let fixture: ComponentFixture<DetalleAlertaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetalleAlertaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
