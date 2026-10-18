import { Component, signal } from '@angular/core';
import { NavController, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, location } from 'ionicons/icons';

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

  constructor(private navCtrl: NavController) { }

  volver() {
    this.navCtrl.navigateBack('/acceso');
  }

  permitirUbicacion() {
    this.mensaje.set('');

    if (!navigator.geolocation) {
      this.mensaje.set('Tu dispositivo no permite usar la ubicación');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {

        this.navCtrl.navigateRoot('/inicio');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          this.mensaje.set('No pudimos acceder a tu ubicación. Podés seguir con "Ahora no" y activarla más tarde.');
        } else {
      
          this.navCtrl.navigateRoot('/inicio');
        }
      },
      { timeout: 10000 }
    );
  }

  ahoraNo() {
    this.navCtrl.navigateRoot('/inicio');
  }

}