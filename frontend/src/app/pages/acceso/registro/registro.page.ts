import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonItem, IonIcon, IonInput, IonButton, IonCheckbox, IonLabel } from '@ionic/angular';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonItem, IonIcon, IonInput, IonButton, IonCheckbox, IonLabel, FormsModule, CommonModule],
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss']
})
export class RegistroPage {

  nombre = '';
  apellido = '';
  email = '';
  password = '';
  confirmarPassword = '';
  aceptaTerminos = false;
  mostrarPassword = false;
  mostrarConfirmar = false;
  error = '';

  constructor(private router: Router) { }

  cambiarVisibilidadPassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  cambiarVisibilidadConfirmar() {
    this.mostrarConfirmar = !this.mostrarConfirmar;
  }

  crearCuenta() {
    this.error = '';

    if (this.password !== this.confirmarPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    if (!this.aceptaTerminos) {
      this.error = 'Tenes que aceptar los terminos y condiciones';
      return;
    }

    this.router.navigate(['/acceso/permisos-ubicacion']);
  }

}