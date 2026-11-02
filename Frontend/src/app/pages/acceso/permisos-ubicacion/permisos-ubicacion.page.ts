import { Component, signal } from '@angular/core';
import { NavController, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, location } from 'ionicons/icons';
import { SesionService } from '../../../services/sesion.service';

addIcons({ arrowBackOutline, location });

@Component({
  selector: 'app-permisos-ubicacion',
  standalone: true,
  imports: [IonContent, IonIcon],
  templateUrl: './permisos-ubicacion.page.html',
  styleUrls: ['./permisos-ubicacion.page.scss']
})
export class PermisosUbicacionPage {

  mensaje = signal('');

  constructor(private navCtrl: NavController, private sesion: SesionService) { }

  volver() {
    this.navCtrl.navigateBack('/acceso');
  }

  async permitirUbicacion() {
    this.mensaje.set('');

    const permitida = await this.sesion.pedirUbicacion();

    if (permitida) {
      this.navCtrl.navigateRoot('/inicio');
    } else {
      this.mensaje.set('No pudimos acceder a tu ubicación. Podés seguir con "Ahora no" y activarla más tarde.');
    }
  }

  ahoraNo() {
    this.sesion.guardarUbicacion(false);
    this.navCtrl.navigateRoot('/inicio');
  }

}