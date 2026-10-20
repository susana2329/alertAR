import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavController, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personOutline, mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { GoogleAuthService } from '../../../services/google-auth.service';
import { SesionService } from '../../../services/sesion.service';

addIcons({ personOutline, mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline });

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
    { email: 'susana@gmail.com', password: '123456' },
    { email: 'juan@gmail.com', password: 'abcdef' }
  ];

  nombre = '';
  apellido = '';
  registroEmail = '';
  registroPassword = '';
  mostrarRegistroPassword = false;
  aceptaTerminos = false;
  errorRegistro = '';

  constructor(
    private navCtrl: NavController,
    private googleAuth: GoogleAuthService,
    private sesion: SesionService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {
    this.volteada = this.route.snapshot.queryParamMap.get('modo') === 'registro';
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
      this.sesion.iniciar('token-de-prueba', { nombre: 'Usuario', email: this.loginEmail });
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

    this.sesion.iniciar('token-de-prueba', { nombre: this.nombre, apellido: this.apellido, email: this.registroEmail });
    this.navCtrl.navigateRoot('/acceso/permisos-ubicacion');
  }

  async entrarConGoogle() {
    if (this.volteada && !this.aceptaTerminos) {
      this.errorRegistro = 'Tenés que aceptar los términos y condiciones';
      return;
    }

    try {
      await this.googleAuth.entrar();
      this.navCtrl.navigateRoot('/acceso/permisos-ubicacion');
    } catch (error: any) {
      const mensaje = error.message || 'No se pudo entrar con Google';
      if (this.volteada) {
        this.errorRegistro = mensaje;
      } else {
        this.errorLogin = mensaje;
      }
      this.cdr.markForCheck();
    }
  }

}