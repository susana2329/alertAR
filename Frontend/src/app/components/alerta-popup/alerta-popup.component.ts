import { Component, Input } from '@angular/core';
import { Alerta } from '../../models/alerta.model';

@Component({
  selector: 'app-alerta-popup',
  standalone: true,
  imports: [],
  templateUrl: './alerta-popup.component.html',
  styleUrl: './alerta-popup.component.scss'
})
export class AlertaPopupComponent {
  @Input() alerta!: Alerta;
}