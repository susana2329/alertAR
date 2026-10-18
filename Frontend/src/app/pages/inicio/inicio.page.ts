import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent
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
  carOutline,
  thunderstormOutline,
  leafOutline,
} from 'ionicons/icons';
import { SesionService } from '../../services/sesion.service';

addIcons({
  'menu-outline': menuOutline,
  'notifications-outline': notificationsOutline,
  'location-outline': locationOutline,
  'rainy-outline': rainyOutline,
  rainy,
  'water-outline': waterOutline,
  'warning-outline': warningOutline,
  'pulse-outline': pulseOutline,
  'car-outline': carOutline,
  'thunderstorm-outline': thunderstormOutline,
  'leaf-outline': leafOutline,
});

interface AlertaCercana {
  tipo: string;
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
    tipo: 'lluvia',
    nivel: 'Precaución',
    titulo: 'Lluvias intensas',
    fuente: 'SMN'
  };

  recomendacionPorTipo: { [tipo: string]: string } = {
    lluvia: 'lluvias-intensas',
    inundacion: 'inundacion',
    hidrologica: 'inundacion',
    tormenta: 'tormenta',
    sismo: 'sismo'
  };

  alertasCercanas: AlertaCercana[] = [
    {
      tipo: 'inundacion',
      titulo: 'Reporte de inundación',
      distancia: '1,7km',
      subtextoIzquierda: 'Fuente: vecino',
      subtextoDerecha: 'No verificado',
      icon: 'water-outline',
      iconColor: '#0E7490'
    },
    {
      tipo: 'inundacion',
      titulo: 'Calle anegada',
      distancia: '2,4km',
      subtextoIzquierda: 'Fuente: vecino',
      subtextoDerecha: 'No verificado',
      icon: 'car-outline',
      iconColor: '#0E7490'
    },
    {
      tipo: 'hidrologica',
      titulo: 'Situación hidrológica',
      distancia: '3,1km',
      subtextoIzquierda: 'Fuente: INA',
      subtextoDerecha: 'Información',
      rightHighlighted: true,
      icon: 'warning-outline',
      iconColor: '#0E7490'
    },
    {
      tipo: 'tormenta',
      titulo: 'Tormenta eléctrica',
      distancia: '5,2km',
      subtextoIzquierda: 'Fuente: SMN',
      subtextoDerecha: 'Información',
      rightHighlighted: true,
      icon: 'thunderstorm-outline',
      iconColor: '#0E7490'
    },
    {
      tipo: 'inundacion',
      titulo: 'Árbol caído',
      distancia: '3,8km',
      subtextoIzquierda: 'Fuente: vecino',
      subtextoDerecha: 'No verificado',
      icon: 'leaf-outline',
      iconColor: '#0E7490'
    },
    {
      tipo: 'sismo',
      titulo: 'Sismo detectado',
      distancia: '82km',
      subtextoIzquierda: 'Magnitud 2.8',
      subtextoDerecha: 'Fuente: INPRES',
      icon: 'pulse-outline',
      iconColor: '#EE4129'
    }
  ];


  mensajeUbicacion = signal('');


  constructor(private router: Router, public sesion: SesionService) { }

  verRecomendaciones(tipo: string): void {
    const id = this.recomendacionPorTipo[tipo];

    if (id) {
      this.router.navigate(['/inicio/recomendaciones', id]);
    } else {
      this.router.navigate(['/inicio/recomendaciones']);
    }
  }

  verAlerta(alerta: AlertaCercana) {
    // TODO: this.router.navigate(['/inicio/detalle-alerta']); cuando exista la página
  }

  async activarUbicacion() {
    this.mensajeUbicacion.set('');
    const permitida = await this.sesion.pedirUbicacion();

    if (!permitida) {
      this.mensajeUbicacion.set('No pudimos acceder a tu ubicación. Activala desde los ajustes del navegador o del celular.');
    }
  }
}