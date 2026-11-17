import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  AlertController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  imageOutline,
  calendarOutline,
  locationOutline,
  personOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { ModeracionService } from '../../services/moderacion.service';
import type { ReportePendienteModeracion } from '../../services/moderacion.service';
import { SesionService } from '../../services/sesion.service';

@Component({
  selector: 'app-moderacion',
  templateUrl: './moderacion.page.html',
  styleUrls: ['./moderacion.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class ModeracionPage implements OnInit {
  reportes: ReportePendienteModeracion[] = [];
  cargando = true;
  errorCarga: string | null = null;
  procesandoId: string | null = null;

  constructor(
    private moderacionService: ModeracionService,
    private sesionService: SesionService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      chevronBackOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      imageOutline,
      calendarOutline,
      locationOutline,
      personOutline,
      shieldCheckmarkOutline
    });
  }

  ngOnInit() {
    if (!this.sesionService.esModerador()) {
      void this.router.navigate(['/cuenta']);
      return;
    }
    this.cargarPendientes();
  }

  cargarPendientes() {
    this.cargando = true;
    this.errorCarga = null;
    this.moderacionService.listarPendientes().subscribe({
      next: (data) => {
        this.reportes = data;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar reportes pendientes:', err);
        this.errorCarga = 'No se pudieron cargar los reportes pendientes de moderación.';
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  async confirmarAprobacion(reporte: ReportePendienteModeracion) {
    const alerta = await this.alertController.create({
      header: 'Aprobar fotos del reporte',
      message: `¿Confirmás que las fotos del reporte de "${reporte.tipo}" son válidas y apropiadas para publicarse en el mapa?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aprobar',
          handler: () => {
            this.ejecutarModeracion(reporte._id, 'aprobar');
          }
        }
      ]
    });
    await alerta.present();
  }

  async confirmarRechazo(reporte: ReportePendienteModeracion) {
    const alerta = await this.alertController.create({
      header: 'Rechazar reporte / fotos',
      message: 'Las fotos serán eliminadas del servidor y el reporte se retirará del mapa.',
      inputs: [
        {
          name: 'motivo',
          type: 'text',
          placeholder: 'Motivo (ej: Foto no relacionada, spam...)'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Rechazar y borrar fotos',
          role: 'destructive',
          handler: (data) => {
            this.ejecutarModeracion(reporte._id, 'rechazar', data?.motivo);
          }
        }
      ]
    });
    await alerta.present();
  }

  private ejecutarModeracion(id: string, accion: 'aprobar' | 'rechazar', motivo?: string) {
    this.procesandoId = id;
    this.moderacionService.moderarReporte(id, accion, motivo).subscribe({
      next: async (res) => {
        this.reportes = this.reportes.filter(r => r._id !== id);
        this.procesandoId = null;
        this.cdr.markForCheck();
        const toast = await this.toastController.create({
          message: res.mensaje || (accion === 'aprobar' ? 'Fotos aprobadas con éxito' : 'Reporte rechazado'),
          duration: 3000,
          color: accion === 'aprobar' ? 'success' : 'medium',
          position: 'bottom'
        });
        await toast.present();
      },
      error: async (err) => {
        this.procesandoId = null;
        this.cdr.markForCheck();
        const toast = await this.toastController.create({
          message: err?.error?.mensaje || 'Error al procesar la moderación',
          duration: 4000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }
}
