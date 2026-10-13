import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavController, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, personOutline, mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';

addIcons({ arrowBackOutline, personOutline, mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline });

@Component({
  selector: 'app-acceso-flip',
  standalone: true,
  imports: [IonContent, IonIcon, FormsModule],
  templateUrl: './acceso-flip.page.html',
  styleUrls: ['./acceso-flip.page.scss']
})
export class AccesoFlipPage {

  
  volteada = false;


  ciudad = [1, 2, 3, 4, 5, 6, 7, 8];


  loginEmail = '';
  loginPassword = '';
  mostrarLoginPassword = false;
  errorLogin = '';

  usuarios = [
    { email: 'su@gmail.com', password: '123456' },
    { email: 'shu@gmail.com', password: 'abcdef' }
  ];


  nombre = '';
  apellido = '';
  registroEmail = '';
  registroPassword = '';
  mostrarRegistroPassword = false;
  aceptaTerminos = false;
  errorRegistro = '';

  constructor(private navCtrl: NavController) { }

  volver() {
    this.navCtrl.navigateBack('/acceso');
  }

  
  mostrarRegistro() {
    this.volteada = true;
  }


  mostrarLogin() {
    this.volteada = false;
  }

  iniciarSesion() {
    this.errorLogin = '';

    if (this.loginEmail === '' || this.loginPassword === '') {
      this.errorLogin = 'Completá tu correo y tu contraseña';
      return;
    }

    let encontrado = false;
    for (let usuario of this.usuarios) {
      if (usuario.email === this.loginEmail && usuario.password === this.loginPassword) {
        encontrado = true;
      }
    }

    if (encontrado) {
      this.navCtrl.navigateRoot('/acceso/permisos-ubicacion');
    } else {
      this.errorLogin = 'Correo o contraseña incorrectos';
    }
  }

  crearCuenta() {
    this.errorRegistro = '';

    if (this.nombre === '' || this.apellido === '' || this.registroEmail === '' || this.registroPassword === '') {
      this.errorRegistro = 'Completá todos los campos';
      return;
    }

    if (!this.registroEmail.includes('@')) {
      this.errorRegistro = 'Escribí un correo válido';
      return;
    }

    if (this.registroPassword.length < 6) {
      this.errorRegistro = 'La contraseña tiene que tener al menos 6 caracteres';
      return;
    }

    if (!this.aceptaTerminos) {
      this.errorRegistro = 'Tenés que aceptar los términos y condiciones';
      return;
    }

 
    this.navCtrl.navigateRoot('/acceso/permisos-ubicacion');
  }

  entrarConGoogle() {
    const mensaje = 'El acceso con Google todavía no está disponible';
    if (this.volteada) {
      this.errorRegistro = mensaje;
    } else {
      this.errorLogin = mensaje;
    }
  }

}