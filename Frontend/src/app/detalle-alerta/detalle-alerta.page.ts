import { Component, OnInit } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { ALERTAS_MOCK } from '../mocks/alertas.mock';
import { Alerta } from '../models/alerta.model';


import {
  arrowBackOutline,
  cloudOutline,
  timeOutline,
  locationOutline,
  documentTextOutline,
  waterOutline,
  rainyOutline,
  thermometerOutline,
  leafOutline,
  carOutline,
  warningOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-detalle-alerta',
  templateUrl: './detalle-alerta.page.html',
  styleUrls: ['./detalle-alerta.page.scss'],
  imports: [IonContent, IonIcon]
})
export class DetalleAlertaPage implements OnInit {

  alerta?: Alerta;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
   addIcons({
  'arrow-back-outline': arrowBackOutline,
  'cloud-outline': cloudOutline,
  'time-outline': timeOutline,
  'location-outline': locationOutline,
  'document-text-outline': documentTextOutline,
  'water-outline': waterOutline,
  'rainy-outline': rainyOutline,
  'thermometer-outline': thermometerOutline,
  'leaf-outline': leafOutline,
  'car-outline': carOutline,
  'warning-outline': warningOutline
});
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.alerta = ALERTAS_MOCK.find(
      (alerta) => alerta.id === id
    );
  }

  volverAlMapa(): void {
    this.router.navigate(['/mapa-test']);
  }


  iconoPorTipo(): string {
  switch (this.alerta?.tipo) {
    case 'inundacion':
    case 'crecida':
      return 'water-outline';

    case 'tormenta':
      return 'rainy-outline';

    case 'temperaturas':
      return 'thermometer-outline';

    case 'arbol':
      return 'leaf-outline';

    case 'transito':
      return 'car-outline';

    case 'incidente':
      return 'warning-outline';

    case 'meteorologica':
      return 'cloud-outline';

    default:
      return 'warning-outline';
  }
}
formatearFecha(fecha?: string): string {
  if (!fecha) {
    return 'Sin determinar';
  }

  const fechaFormateada = new Date(fecha);

  return fechaFormateada.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) + ' hs.';
}
}