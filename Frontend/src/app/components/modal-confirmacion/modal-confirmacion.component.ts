import { Component, Input, OnInit, signal } from '@angular/core';
import { firstValueFrom, TimeoutError, timeout } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { IonButton, IonContent, IonDatetime, IonDatetimeButton, IonFooter, IonHeader, IonInput, IonLabel, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular';
import { Report } from '../../models/reporte';
import { CommonModule } from '@angular/common';
import { IonModal } from '@ionic/angular/common';
import { ModalController } from '@ionic/angular';
import { ReporteService } from '../../services/reporte.service';

@Component({
  selector: 'app-modal-confirmacion',
  templateUrl: './modal-confirmacion.component.html',
  styleUrls: ['./modal-confirmacion.component.scss'],
  imports: [IonContent, IonLabel, IonInput, CommonModule, IonButton, IonTextarea, IonDatetimeButton, IonFooter, IonDatetime, IonModal, IonHeader, IonTitle, IonToolbar],
})
export class ModalConfirmacionComponent implements OnInit {

  @Input() reporte!: Report
  public contador: number = 0
  public fotos: string[] = []
  public fechaiso: string = ""
  readonly enviando = signal(false)
  readonly errorEnvio = signal('')

  constructor(private httpReport: ReporteService, private modalController: ModalController) { }

  ngOnInit() {
    this.fotos = this.reporte.imagen.map(imagen => URL.createObjectURL(imagen))
    this.fechaiso = this.reporte.fecha.toISOString()
  }
  fotosiguiente() {
    this.contador++
    if (this.contador === this.fotos.length) {
      this.contador = 0
    }
  }
  fotoatras() {
    this.contador--
    if (this.contador < 0) {
      this.contador = this.fotos.length - 1
    }
  }
  async enviar() {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.errorEnvio.set('');
    try {
    let formdata = new FormData
    formdata.append('tipo', this.reporte.tipo)
    formdata.append('descripcion', this.reporte.descripcion)
    formdata.append('ubicacion', this.reporte.ubicacion)
    formdata.append('fecha', this.reporte.fecha.toISOString())
    formdata.append('latitud', String(this.reporte.coordenadas?.latitud ?? ''))
    formdata.append('longitud', String(this.reporte.coordenadas?.longitud ?? ''))
    formdata.append('cantidadFotos', String(this.reporte.imagen.length))
    for (let i = 0; i < this.reporte.imagen.length; i++) {
      formdata.append('fotos', this.reporte.imagen[i])
    }
    formdata.append('estado', this.reporte.estado)
      await firstValueFrom(this.httpReport.postreporte(formdata).pipe(timeout({ first: 45000 })))
      await this.modalController.dismiss({ enviado: true })
    } catch (error) {
      console.error('No se pudo enviar el reporte:', error)
      const mensajeServidor = error instanceof HttpErrorResponse
        ? error.error?.error?.mensaje || error.error?.mensaje
        : undefined
      this.errorEnvio.set(error instanceof TimeoutError
        ? 'La subida tardó demasiado. Revisá Mis reportes antes de volver a intentarlo.'
        : typeof mensajeServidor === 'string'
          ? mensajeServidor
          : 'No pudimos enviar el reporte. Revisá tu conexión e intentá nuevamente.')
    } finally {
      this.enviando.set(false)
    }
  }

  cancelar() {
    return this.modalController.dismiss({ enviado: false })
  }

}
