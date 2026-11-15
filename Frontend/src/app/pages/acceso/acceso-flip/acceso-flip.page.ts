import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavController, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personOutline, mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { GoogleAuthService } from '../../../services/google-auth.service';
import { AuthApiService } from '../../../services/auth-api.service';

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
  cargando = false;


  loginEmail = '';
  loginPassword = '';
  mostrarLoginPassword = false;
  errorLogin = '';


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
    private authApi: AuthApiService,
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

  async iniciarSesion() {
    this.errorLogin = '';

    if (this.loginEmail === '' || this.loginPassword === '') {
      this.errorLogin = 'Completá tu correo y tu contraseña';
      return;
    }

    this.cargando = true;

    try {
      await this.authApi.iniciarSesion(this.loginEmail, this.loginPassword);
      this.navCtrl.navigateRoot('/acceso/permisos-ubicacion');
    } catch (error: any) {
      this.errorLogin = error.message;
    }

    this.cargando = false;
    this.cdr.markForCheck();
  }

  async crearCuenta() {
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

    this.cargando = true;

    try {
      await this.authApi.registrar(this.nombre, this.apellido, this.registroEmail, this.registroPassword);
      this.navCtrl.navigateRoot('/acceso/permisos-ubicacion');
    } catch (error: any) {
      this.errorRegistro = error.message;
    }

    this.cargando = false;
    this.cdr.markForCheck();
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