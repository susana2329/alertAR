import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Alerta, colorPresentacionAlerta, etiquetaNivelAlerta } from '../../models/alerta.model';

@Component({
  selector: 'app-alerta-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alerta-popup.component.html',
  styleUrl: './alerta-popup.component.scss'
})
export class AlertaPopupComponent {
  @Input() alerta!: Alerta;

  get colorEstadoVisual(): string {
    return colorPresentacionAlerta(this.alerta.nivel, this.alerta.color, this.alerta.naturaleza);
  }

  get etiquetaPresentacion(): string {
    if (this.alerta.nivel === 'desconocido') return 'DESCONOCIDO';
    if (this.alerta.etiqueta) return this.alerta.etiqueta;
    if (this.alerta.naturaleza === 'contexto') return 'INFORMATIVO';
    return etiquetaNivelAlerta(this.alerta.nivel);
  }
}
