import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-permisos-ubicacion',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon],
  templateUrl: './permisos-ubicacion.page.html',
  styleUrls: ['./permisos-ubicacion.page.scss']
})
export class PermisosUbicacionPage {

  constructor(private router: Router) { }

  permitirUbicacion() {
    this.router.navigate(['/inicio']);
  }

  ahoraNo() {
    this.router.navigate(['/inicio']);
  }

}