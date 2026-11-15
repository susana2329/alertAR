import { Component, Input, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IonButton, IonContent, IonDatetime, IonDatetimeButton, IonFooter, IonHeader, IonInput, IonLabel, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular';
import { Report } from '../../models/reporte';
import { CommonModule } from '@angular/common';
import { IonModal } from '@ionic/angular/common';
import { ModalController } from '@ionic/angular';
import { ReporteService } from '../../services/reporte.service';
import { SesionService } from '../../services/sesion.service';

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
  enviando = false
  errorEnvio = ''

  constructor(private httpReport: ReporteService, private modalController: ModalController, private sesionService: SesionService) { }

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
    let formdata = new FormData
    formdata.append('tipo', this.reporte.tipo)
    formdata.append('descripcion', this.reporte.descripcion)
    formdata.append('ubicacion', this.reporte.ubicacion)
    formdata.append('fecha', this.reporte.fecha.toISOString())
    for (let i = 0; i < this.reporte.imagen.length; i++) {
      formdata.append('fotos', this.reporte.imagen[i])
    }
    formdata.append('estado', this.reporte.estado)
    const sesion: any = this.sesionService.usuario();
    const idUsuarioActual = sesion?._id || sesion?.id;

    if (!idUsuarioActual) {
      this.errorEnvio = 'No se encontró la sesión del usuario.';
      return;
    }
    this.enviando = true
    this.errorEnvio = ''
    try {
      await firstValueFrom(this.httpReport.postreporte(formdata, idUsuarioActual))
      await this.modalController.dismiss({ enviado: true })
    } catch (error) {
      console.error('No se pudo enviar el reporte:', error)
      this.errorEnvio = 'No pudimos enviar el reporte. Revisá tu conexión e intentá nuevamente.'
    } finally {
      this.enviando = false
    }
  }

  cancelar() {
    return this.modalController.dismiss({ enviado: false })
  }

}
