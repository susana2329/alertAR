import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonItem, IonIcon, IonInput, IonButton } from '@ionic/angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonItem, IonIcon, IonInput, IonButton, FormsModule, CommonModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {

  email = '';
  password = '';
  mostrarPassword = false;
  error = '';

  usuarios = [
    { email: 'susana@gmail.com', password: '123456' },
    { email: 'juu@gmail.com', password: 'abcdef' }
  ];

  constructor(private router: Router) { }

  cambiarVisibilidad() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  iniciarSesion() {
    this.error = '';

    let encontrado = false;
    for (let usuario of this.usuarios) {
      if (usuario.email === this.email && usuario.password === this.password) {
        encontrado = true;
      }
    }

    if (encontrado) {
      this.router.navigate(['/acceso/permisos-ubicacion']);
    } else {
      this.error = 'Correo o contraseña incorrectos';
    }
  }

  irARegistro() {
    this.router.navigate(['/acceso/registro']);
  }

}