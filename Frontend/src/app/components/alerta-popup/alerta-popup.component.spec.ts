import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Alerta } from '../../models/alerta.model';
import { AlertaPopupComponent } from './alerta-popup.component';

describe('AlertaPopupComponent', () => {
  let fixture: ComponentFixture<AlertaPopupComponent>;
  let component: AlertaPopupComponent;

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertaPopupComponent);
    component = fixture.componentInstance;
  });

  function cargar(nivel: Alerta['nivel'], naturaleza: Alerta['naturaleza'] = 'alerta', color?: Alerta['color']): void {
    fixture.componentRef.setInput('alerta', {
      id: 'test', titulo: 'Alerta', tipo: 'observacion', nivel, naturaleza,
      origen: 'oficial', descripcion: '', fechaInicio: null, fechaFin: null,
      ubicacion: null, geometria: null, color
    });
    fixture.detectChanges();
  }

  it('aplica una insignia diferenciada para cada nivel, incluido desconocido', () => {
    const casos = [
      ['informativo', 'nivel--azul', 'INFORMATIVO', 'azul'],
      ['precaucion', 'nivel--amarillo', 'PRECAUCIÓN', 'amarillo'],
      ['advertencia', 'nivel--naranja', 'ALERTA', 'naranja'],
      ['emergencia', 'nivel--rojo', 'EMERGENCIA', 'rojo'],
      ['desconocido', 'nivel--neutro', 'DESCONOCIDO', 'neutro']
    ] as const;
    for (const [nivel, clase, etiqueta, color] of casos) {
      cargar(nivel);
      const insignia = fixture.nativeElement.querySelector('.nivel');
      expect(insignia.classList).toContain(clase);
      expect(insignia.textContent.trim()).toBe(etiqueta);
      expect(component.colorEstadoVisual).toBe(color);
    }
  });

  it('no presenta como informativo un nivel desconocido por tener naturaleza de observación', () => {
    cargar('desconocido', 'observacion', 'azul');
    expect(component.etiquetaPresentacion).toBe('DESCONOCIDO');
    expect(component.colorEstadoVisual).toBe('neutro');
  });
});
