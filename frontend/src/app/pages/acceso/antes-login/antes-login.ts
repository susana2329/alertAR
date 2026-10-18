import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personOutline } from 'ionicons/icons';
import { SesionService } from '../../../services/sesion.service';

addIcons({ personOutline });

@Component({
  selector: 'app-antes-login',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon],
  templateUrl: './antes-login.html',
  styleUrls: ['./antes-login.scss']
})
export class AntesLoginPage {

  constructor(private router: Router, private sesion: SesionService) { }

  irALogin() {
    this.router.navigate(['/acceso/flip']);
  }

  irARegistro() {
    this.router.navigate(['/acceso/flip'], { queryParams: { modo: 'registro' } });
  }

  continuarSinCuenta() {
    this.sesion.cerrarSesion();
    this.router.navigate(['/acceso/permisos-ubicacion']);
  }

}