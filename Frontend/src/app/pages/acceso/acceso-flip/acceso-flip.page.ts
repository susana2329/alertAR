import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ModalController, NavController, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personOutline, mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { GoogleAuthService } from '../../../services/google-auth.service';
import { AuthService } from '../../../services/auth.service';

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
  cargandoLogin = false;

  nombre = '';
  apellido = '';
  registroEmail = '';
  registroPassword = '';
  mostrarRegistroPassword = false;
  aceptaTerminos = false;
  errorRegistro = '';
  cargandoRegistro = false;

  constructor(
    private navCtrl: NavController,
    private googleAuth: GoogleAuthService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private modalController: ModalController
  ) {
    this.volteada = this.route.snapshot.queryParamMap.get('modo') === 'registro';
  }
  mostrarRegistro() {
    this.volteada = true;
  }

  mostrarLogin() {
    this.volteada = false;
  }

  async abrirDocumento(tipo: 'terminos' | 'privacidad') {
    const { LegalPage } = await import('../../legal/legal.page');
    const modal = await this.modalController.create({ component: LegalPage, componentProps: { tipo } });
    await modal.present();
  }

  iniciarSesion() {
    this.errorLogin = '';

    if (this.loginEmail === '' || this.loginPassword === '') {
      this.errorLogin = 'Completá tu correo y tu contraseña';
      return;
    }

    this.cargandoLogin = true;
    this.authService.login({ email: this.loginEmail.trim(), password: this.loginPassword }).subscribe({
      next: () => {
        this.cargandoLogin = false;
        this.navCtrl.navigateRoot('/acceso/permisos-ubicacion');
      },
      error: (error) => {
        this.cargandoLogin = false;
        this.errorLogin = error?.error?.mensaje || error?.message || 'Correo o contraseña incorrectos';
        this.cdr.markForCheck();
      }
    });
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

    this.cargandoRegistro = true;
    this.authService.registro({
      nombre: this.nombre.trim(),
      apellido: this.apellido.trim(),
      email: this.registroEmail.trim(),
      password: this.registroPassword
    }).subscribe({
      next: () => {
        this.cargandoRegistro = false;
        this.navCtrl.navigateRoot('/acceso/permisos-ubicacion');
      },
      error: (error) => {
        this.cargandoRegistro = false;
        this.errorRegistro = error?.error?.mensaje || error?.message || 'No se pudo crear la cuenta';
        this.cdr.markForCheck();
      }
    });
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
