import { AfterViewInit, Component, OnDestroy, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { IonApp, IonRouterOutlet, NavController } from '@ionic/angular';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { AuthService } from './services/auth.service';
import { SesionService } from './services/sesion.service';
import { App } from '@capacitor/app';
import { BorradorReporteService, leerArchivoFoto, ReportCameraRecovery } from './services/borrador-reporte.service';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  imports: [IonApp, IonRouterOutlet, NavBarComponent],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  readonly showStartupSplash = signal(Capacitor.isNativePlatform());
  readonly splashExiting = signal(false);
  private splashTimer?: ReturnType<typeof setTimeout>;
  private removeSplashTimer?: ReturnType<typeof setTimeout>;
  private recuperando = false;
  private recuperado = false;
  private permitirRecuperacion = false;
  private fotoRestaurada?: Parameters<typeof leerArchivoFoto>[0];

  constructor(private auth: AuthService, private sesion: SesionService, private navCtrl: NavController, private borrador: BorradorReporteService) {
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        void ReportCameraRecovery.pending().then(pendiente => {
          if (pendiente.pending) {
            this.permitirRecuperacion = true;
            this.showStartupSplash.set(false);
          }
        }).catch(() => {});
      }
      void App.addListener('appRestoredResult', async resultado => {
        if (resultado.pluginId !== 'Camera') return;
        this.permitirRecuperacion = true;
        if (resultado.success) {
          this.fotoRestaurada = resultado.methodName === 'chooseFromGallery'
            ? resultado.data?.results?.[0] : resultado.data;
        }
        await this.recuperarReporte();
      });
      void App.addListener('resume', () => { setTimeout(() => void this.recuperarReporte(), 400); });
    }
    void this.auth.verificarSesion().then(estado => {
      if (estado === 'invalida' && !this.sesion.obtenerToken()) {
        void this.navCtrl.navigateRoot('/acceso');
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.showStartupSplash()) return;
    setTimeout(() => void this.recuperarReporte(), 400);

    this.splashTimer = setTimeout(() => {
      this.splashExiting.set(true);
      this.removeSplashTimer = setTimeout(() => this.showStartupSplash.set(false), 200);
    }, 1000);
  }

  private async recuperarReporte(): Promise<void> {
    if (!this.permitirRecuperacion || this.recuperando || this.recuperado || !this.sesion.tokenValido()) return;
    this.recuperando = true;
    try {
      if (!(await App.getState()).isActive) return;
      const pendiente = Capacitor.getPlatform() === 'android'
        ? await ReportCameraRecovery.pending() : { pending: false, uri: undefined };
      if (!pendiente.pending && !this.fotoRestaurada) return;
      const reporte = await this.borrador.recuperar();
      if (!reporte) return;
      const foto = this.fotoRestaurada ?? (pendiente.uri ? { uri: pendiente.uri } : undefined);
      if (foto && reporte.imagen.length < 3) {
        const archivo = await leerArchivoFoto(foto);
        if (archivo?.size) reporte.imagen.push(archivo);
      }
      await this.borrador.guardar(reporte);
      this.recuperado = true;
      await this.navCtrl.navigateRoot('/reportes/form?recuperarFoto=1');
    } catch (error) {
      console.error('[Recuperación de cámara]', error);
    } finally {
      this.recuperando = false;
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.splashTimer);
    clearTimeout(this.removeSplashTimer);
  }
}

