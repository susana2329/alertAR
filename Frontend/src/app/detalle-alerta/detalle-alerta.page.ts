import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, carOutline, checkmarkCircleOutline, cloudOutline,
  informationCircleOutline, leafOutline, openOutline, pulseOutline,
  rainyOutline, snowOutline, thermometerOutline, timeOutline, waterOutline
} from 'ionicons/icons';
import { catchError, map, of, switchMap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Alerta, colorPresentacionAlerta, etiquetaNivelAlerta } from '../models/alerta.model';
import { AlertaService } from '../services/alerta.service';

type Registro = Record<string, unknown>;
type UmbralVista = { etiqueta: string; valor: number; unidad: string };

function registro(valor: unknown): Registro | null {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    ? valor as Registro : null;
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

function numero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

@Component({
  selector: 'app-detalle-alerta',
  templateUrl: './detalle-alerta.page.html',
  styleUrls: ['./detalle-alerta.page.scss'],
  imports: [CommonModule, IonContent, IonIcon]
})
export class DetalleAlertaPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  alerta?: Alerta;
  cargando = true;
  errorCarga = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertaService: AlertaService
  ) {
    addIcons({
      'arrow-back-outline': arrowBackOutline,
      'car-outline': carOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'cloud-outline': cloudOutline,
      'information-circle-outline': informationCircleOutline,
      'leaf-outline': leafOutline,
      'open-outline': openOutline,
      'pulse-outline': pulseOutline,
      'rainy-outline': rainyOutline,
      'snow-outline': snowOutline,
      'thermometer-outline': thermometerOutline,
      'time-outline': timeOutline,
      'water-outline': waterOutline
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        this.alerta = undefined;
        this.errorCarga = false;
        this.cargando = Boolean(id);
        if (!id) return of({ alerta: undefined, error: false });
        return this.alertaService.obtenerPorId(id).pipe(
          map(alerta => ({ alerta, error: false })),
          catchError((error: unknown) => {
            console.error('No se pudo cargar el detalle de la alerta:', error);
            return of({ alerta: undefined, error: true });
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ alerta, error }) => {
      this.alerta = alerta;
      this.errorCarga = error;
      this.cargando = false;
    });
  }

  get esINA(): boolean { return this.alerta?.fuente === 'INA'; }
  get esINPRES(): boolean { return this.alerta?.fuente === 'INPRES' || this.alerta?.tipo === 'sismo'; }
  get esSMN(): boolean { return this.alerta?.fuente === 'SMN'; }

  get colorEstadoVisual(): 'rojo' | 'naranja' | 'amarillo' | 'azul' | 'neutro' {
    return colorPresentacionAlerta(this.alerta?.nivel ?? 'desconocido', this.alerta?.color, this.alerta?.naturaleza);
  }

  get colorClasificacionINA(): 'rojo' | 'naranja' | 'amarillo' | 'azul' | 'neutro' {
    return this.colorEstadoVisual;
  }

  get etiquetaPresentacion(): string {
    if (this.alerta?.nivel === 'desconocido') return 'DESCONOCIDO';
    if (this.alerta?.etiqueta) return this.alerta.etiqueta;
    if (this.alerta?.naturaleza === 'contexto') return 'INFORMATIVO';
    return etiquetaNivelAlerta(this.alerta?.nivel ?? 'desconocido');
  }

  get contextoTipo(): string {
    if (this.esINA) return 'Observación hidrológica por estación';
    if (this.esINPRES) return 'Evento sísmico registrado por INPRES';
    if (this.esSMN) return 'Alerta y pronóstico del Servicio Meteorológico Nacional';
    return this.alerta?.tipo ? this.alerta.tipo.replaceAll('_', ' ') : 'Información del evento';
  }

  get descripcionVisible(): string {
    const descripcion = (this.alerta?.descripcionCompleta ?? this.alerta?.descripcion ?? '').trim();
    return this.esINA ? descripcion.replace(/\s*Medición:\s*.*$/i, '').trim() : descripcion;
  }

  get medicionINA(): { fecha: string | null; valor: number | null; unidad: string | null; valorPrecedente: number | null; tendencia: string | null } | null {
    const medicion = registro(registro(this.alerta?.detalle)?.['medicion']);
    if (!medicion) return null;
    return {
      fecha: texto(medicion['fecha']), valor: numero(medicion['valor']),
      unidad: texto(medicion['unidad']), valorPrecedente: numero(medicion['valorPrecedente']),
      tendencia: texto(medicion['tendencia'])
    };
  }

  get estacionINA(): string | null {
    const estacion = registro(registro(this.alerta?.detalle)?.['estacion']);
    const nombre = texto(estacion?.['nombre']);
    const rio = texto(estacion?.['rio']);
    if (nombre && rio && nombre !== rio) return `${nombre} · ${rio}`;
    return nombre || rio;
  }

  get umbralesINA(): UmbralVista[] {
    const umbrales = registro(registro(this.alerta?.detalle)?.['umbrales']);
    if (!umbrales) return [];
    const unidad = texto(umbrales['unidad']) ?? 'm';
    return [
      ['alerta', 'Referencia de alerta'],
      ['evacuacion', 'Referencia de evacuación'],
      ['aguasBajas', 'Referencia de aguas bajas']
    ].flatMap(([clave, etiqueta]) => {
      const valor = numero(umbrales[clave]);
      return valor === null ? [] : [{ etiqueta, valor, unidad }];
    });
  }

  get magnitudSismo(): number | null {
    return numero(registro(this.alerta?.detalle)?.['magnitud']);
  }

  get profundidadSismo(): number | null {
    const valor = numero(registro(this.alerta?.detalle)?.['profundidad']);
    return valor !== null && valor >= 0 ? valor : null;
  }

  get fechaOcurrencia(): string | null {
    return this.alerta?.fechaInicio ?? texto(registro(this.alerta?.detalle)?.['fechaHoraIdentificador']);
  }

  get provinciaINPRES(): string | null {
    return texto(registro(this.alerta?.detalle)?.['provincia']);
  }

  get urlFuenteINPRES(): string | null {
    const url = texto(registro(this.alerta?.detalle)?.['urlFuente']);
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' ? parsed.href : null;
    } catch { return null; }
  }

  private get informacionesSMN(): Registro[] {
    const datos = registro(registro(this.alerta?.detalle)?.['datosFuente']);
    const informaciones = datos?.['informaciones'];
    return Array.isArray(informaciones) ? informaciones.map(registro).filter((item): item is Registro => item !== null) : [];
  }

  get estadoSMN(): string | null {
    return texto(registro(this.alerta?.detalle)?.['estadoFuente']);
  }

  get tipoMensajeSMN(): string | null {
    return texto(registro(this.alerta?.detalle)?.['tipoMensaje']);
  }

  get instruccionSMN(): string | null {
    return texto(this.informacionesSMN[0]?.['instruccion']);
  }

  get areasSMN(): string[] {
    const datos = registro(registro(this.alerta?.detalle)?.['datosFuente']);
    const areas = datos?.['areas'];
    if (!Array.isArray(areas)) return [];
    return areas.flatMap(area => {
      const descripcion = texto(registro(area)?.['descripcion']);
      return descripcion ? [descripcion] : [];
    });
  }

  volverAlMapa(): void { void this.router.navigate(['/mapa-test']); }
  verRecomendaciones(): void { void this.router.navigate(['/inicio/recomendaciones']); }

  iconoPorTipo(): string {
    switch (this.alerta?.tipo) {
      case 'sismo': return 'pulse-outline';
      case 'inundacion': case 'crecida': case 'observacion': return 'water-outline';
      case 'tormenta': return 'rainy-outline';
      case 'temperaturas': return 'thermometer-outline';
      case 'arbol': return 'leaf-outline';
      case 'transito': return 'car-outline';
      case 'meteorologica': case 'nevada': return this.alerta.tipo === 'nevada' ? 'snow-outline' : 'cloud-outline';
      default: return 'information-circle-outline';
    }
  }

  textoTendencia(tendencia?: string | null): string {
    const etiquetas: Record<string, string> = { crece: 'En aumento', baja: 'En descenso', permanece: 'Estable' };
    return tendencia ? etiquetas[tendencia.toLowerCase()] ?? tendencia : '';
  }

  formatearMetrica(valor: number): string {
    return valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  }

  formatearFecha(fecha?: string | null): string {
    if (!fecha) return 'No informada';
    const fechaFormateada = new Date(fecha);
    if (Number.isNaN(fechaFormateada.getTime())) return 'Fecha no válida';
    return fechaFormateada.toLocaleString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
    });
  }

  formatearUbicacion(ubicacion?: Alerta['ubicacion'] | null): string {
    if (!ubicacion || !Number.isFinite(ubicacion.latitud) || !Number.isFinite(ubicacion.longitud)) return 'Sin coordenadas';
    const latitud = ubicacion.latitud.toLocaleString('es-AR', { maximumFractionDigits: 5 });
    const longitud = ubicacion.longitud.toLocaleString('es-AR', { maximumFractionDigits: 5 });
    return `${latitud}, ${longitud}`;
  }
}
