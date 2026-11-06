import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonSpinner
} from '@ionic/angular';
import { firstValueFrom, timeout } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  notificationsOutline,
  locationOutline,
  rainyOutline,
  rainy,
  waterOutline,
  warningOutline,
  pulseOutline,
  carOutline,
  thunderstormOutline,
  leafOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { SesionService } from '../../services/sesion.service';
import { InicioService, EventoInicio, RespuestaInicio } from '../../services/inicio.service';
import { GeocodificacionService } from '../../services/geocodificacion.service';
import { CoordenadasUsuario } from '../../services/sesion.service';

addIcons({
  'menu-outline': menuOutline,
  'notifications-outline': notificationsOutline,
  'location-outline': locationOutline,
  'rainy-outline': rainyOutline,
  rainy,
  'water-outline': waterOutline,
  'warning-outline': warningOutline,
  'pulse-outline': pulseOutline,
  'car-outline': carOutline,
  'thunderstorm-outline': thunderstormOutline,
  'leaf-outline': leafOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
});

function conLimite<T>(operacion: Promise<T>, milisegundos: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    operacion,
    new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), milisegundos); })
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonSpinner,
    CommonModule,
    RouterLink
  ],
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss']
})
export class InicioPage implements OnInit {
  respuesta: RespuestaInicio | null = null;
  destacada: EventoInicio | null = null;
  alertasCercanas: EventoInicio[] = [];
  cargando = true;
  errorCarga: string | null = null;
  ubicacion: string | null = null;
  ubicacionAtribucion: string | null = null;
  mensajeSinUbicacion = '';
  mensajeUbicacion = signal('');

  private secuenciaCarga = 0;

  constructor(
    private router: Router,
    public sesion: SesionService,
    private inicioService: InicioService,
    private geocodificacion: GeocodificacionService,
    private changeDetector: ChangeDetectorRef
  ) { }

  ngOnInit(): void { void this.cargarInicio(); }

  async cargarInicio(): Promise<void> {
    const secuencia = ++this.secuenciaCarga;
    this.cargando = true;
    this.errorCarga = null;
    this.mensajeSinUbicacion = '';
    this.ubicacionAtribucion = null;
    this.respuesta = null;
    this.destacada = null;
    this.alertasCercanas = [];
    let coordenadas: CoordenadasUsuario | null = null;
    try {
      if (this.sesion.ubicacionPermitida()) {
        // Protege además contra WebViews que no resuelvan getCurrentPosition aun con timeout.
        coordenadas = await conLimite(
          Promise.resolve().then(() => this.sesion.obtenerCoordenadas()).catch(() => null),
          5000
        );
        if (!coordenadas) this.mensajeSinUbicacion = 'No pudimos obtener tu ubicación. Mostramos alertas oficiales sin personalizar.';
      } else {
        this.mensajeSinUbicacion = 'Activá tu ubicación para ver qué situaciones pueden afectarte.';
      }
      if (secuencia !== this.secuenciaCarga) return;

      this.ubicacion = coordenadas ? `${coordenadas.latitud.toFixed(4)}, ${coordenadas.longitud.toFixed(4)}` : null;
      if (coordenadas) {
        try {
          this.geocodificacion.resolver(coordenadas).subscribe(nombre => {
            if (secuencia === this.secuenciaCarga && nombre) {
              if (nombre.nombre) this.ubicacion = nombre.nombre;
              this.ubicacionAtribucion = nombre.atribucion;
              this.changeDetector.markForCheck();
            }
          });
        } catch { /* La geocodificación no es condición para consultar eventos. */ }
      }

      const respuesta = await firstValueFrom(this.inicioService.obtener(coordenadas ?? undefined).pipe(timeout({ first: 12000 })));
      if (secuencia !== this.secuenciaCarga) return;
      this.respuesta = respuesta;
      this.destacada = respuesta.destacada ?? null;
      this.alertasCercanas = Array.isArray(respuesta.eventos) ? respuesta.eventos : [];
    } catch (error) {
      if (secuencia !== this.secuenciaCarga) return;
      this.errorCarga = error instanceof HttpErrorResponse && error.status === 0
        ? 'No se pudo conectar con el servicio de alertas. Revisá tu conexión e intentá nuevamente.'
        : 'No se pudo cargar la información de alertas. Intentá nuevamente.';
      this.respuesta = null;
      this.destacada = null;
      this.alertasCercanas = [];
    } finally {
      if (secuencia === this.secuenciaCarga) {
        this.cargando = false;
        this.changeDetector.markForCheck();
      }
    }
  }

  verAlerta(alerta: EventoInicio): void { this.router.navigate(['/detalle-alerta', alerta.id]); }

  icono(alerta: EventoInicio): string {
    if (alerta.tipo === 'sismo') return 'pulse-outline';
    if (alerta.tipo === 'crecida' || alerta.tipo === 'inundacion') return 'water-outline';
    if (alerta.tipo === 'tormenta' || alerta.tipo === 'meteorologica' || alerta.tipo === 'nevada') return 'thunderstorm-outline';
    return 'warning-outline';
  }

  distancia(alerta: EventoInicio): string {
    if (alerta.dentroDelArea) return 'En tu zona';
    if (alerta.distanciaKm == null) return 'Distancia no disponible';
    return alerta.distanciaKm < 1 ? `${Math.round(alerta.distanciaKm * 1000)} m` : `${alerta.distanciaKm.toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
  }

  fecha(valor: string | null): string {
    return valor ? new Date(valor).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha no disponible';
  }

  nivel(valor: string): string {
    return ({ emergencia: 'Emergencia', advertencia: 'Alerta', precaucion: 'Precaución', informativo: 'Informativo', desconocido: 'Nivel no informado' } as Record<string, string>)[valor] ?? 'Nivel no informado';
  }

  async activarUbicacion() {
    this.mensajeUbicacion.set('');
    const permitida = await this.sesion.pedirUbicacion();

    if (!permitida) {
      this.mensajeUbicacion.set('No pudimos acceder a tu ubicación. Activala desde los ajustes del navegador o del celular.');
    } else {
      await this.cargarInicio();
    }
  }
}
