import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonFooter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  notificationsOutline,
  locationOutline,
  rainyOutline,
  rainy,
  waterOutline,
  warningOutline,
  pulseOutline,
  home,
  mapOutline,
  documentTextOutline,
  shieldCheckmarkOutline,
  personOutline,
} from 'ionicons/icons';

addIcons({
  'menu-outline': menuOutline,
  'notifications-outline': notificationsOutline,
  'location-outline': locationOutline,
  'rainy-outline': rainyOutline,
  rainy,
  'water-outline': waterOutline,
  'warning-outline': warningOutline,
  'pulse-outline': pulseOutline,
  home,
  'map-outline': mapOutline,
  'document-text-outline': documentTextOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'person-outline': personOutline,
});

interface AlertaCercana {
  titulo: string;
  distancia: string;
  subtextoIzquierda: string;
  subtextoDerecha: string;
  rightHighlighted?: boolean;
  icon: string;
  iconColor: string;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonFooter,
    CommonModule,
    RouterLink
  ],
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss']
})
export class InicioPage {

  ubicacion = 'Lugano, Buenos Aires';
  ultimaActualizacion = '00:30';

  alertaPrincipal = {
    nivel: 'Precaución',
    titulo: 'Lluvias intensas',
    fuente: 'SMN'
  };

  alertasCercanas: AlertaCercana[] = [
    {
      titulo: 'Reporte de inundación',
      distancia: '1,7km',
      subtextoIzquierda: 'Fuente: vecino',
      subtextoDerecha: 'No verificado',
      icon: 'water-outline',
      iconColor: '#0E7490'
    },
    {
      titulo: 'Situación hidrológica',
      distancia: '3,1km',
      subtextoIzquierda: 'Fuente: INA',
      subtextoDerecha: 'Información',
      rightHighlighted: true,
      icon: 'warning-outline',
      iconColor: '#0E7490'
    },
    {
      titulo: 'Sismo detectado',
      distancia: '82km',
      subtextoIzquierda: 'Magnitud 2.8',
      subtextoDerecha: 'Fuente: INPRES',
      icon: 'pulse-outline',
      iconColor: '#EE4129'
    }
  ];

  constructor(private router: Router) { }

  verRecomendaciones() {
    // TODO: this.router.navigate(['/inicio/recomendaciones']); cuando exista la página
  }

  verAlerta(alerta: AlertaCercana) {
    // TODO: this.router.navigate(['/inicio/detalle-alerta']); cuando exista la página
  }
}