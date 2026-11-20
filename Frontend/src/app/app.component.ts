import { AfterViewInit, Component, OnDestroy, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { IonApp, IonRouterOutlet, NavController } from '@ionic/angular';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { AuthService } from './services/auth.service';
import { SesionService } from './services/sesion.service';
import { App } from '@capacitor/app';
import { BorradorReporteService, leerArchivoFoto } from './services/borrador-reporte.service';
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

  constructor(private auth: AuthService, private sesion: SesionService, private navCtrl: NavController, private borrador: BorradorReporteService) {
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appRestoredResult', async resultado => {
        if (resultado.pluginId !== 'Camera' || !this.sesion.tokenValido()) return;
        const reporte = await this.borrador.recuperar().catch(() => null);
        if (!reporte) return;
        if (resultado.success && resultado.data) {
          const fotos = resultado.methodName === 'chooseFromGallery'
            ? resultado.data.results ?? [] : [resultado.data];
          for (const foto of fotos) {
            if (reporte.imagen.length >= 3) break;
            const archivo = await leerArchivoFoto(foto).catch(() => null);
            if (archivo?.size) reporte.imagen.push(archivo);
          }
        }
        await this.borrador.guardar(reporte);
        await this.navCtrl.navigateRoot('/reportes/form?recuperarFoto=1');
      });
    }
    void this.auth.verificarSesion().then(estado => {
      if (estado === 'invalida' && !this.sesion.obtenerToken()) {
        void this.navCtrl.navigateRoot('/acceso');
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.showStartupSplash()) return;

    this.splashTimer = setTimeout(() => {
      this.splashExiting.set(true);
      this.removeSplashTimer = setTimeout(() => this.showStartupSplash.set(false), 200);
    }, 1000);
  }

  ngOnDestroy(): void {
    clearTimeout(this.splashTimer);
    clearTimeout(this.removeSplashTimer);
  }
}

