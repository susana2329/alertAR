import { Component, Input, OnInit } from '@angular/core';
import { IonButton, IonContent, IonDatetime, IonDatetimeButton, IonFooter, IonHeader, IonInput, IonLabel, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular';
import { Report } from '../../models/reporte';
import { CommonModule } from '@angular/common';
import { IonModal } from '@ionic/angular/common';
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
  constructor(private httpReport: ReporteService) { }

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
    const result = await this.post(formdata, '6aeb9998b4b1a9fa66040179')
  
  }
  async post(form: FormData, id: string) {
    const respuesta = await this.httpReport.postreporte(form, id).subscribe({
      next: (data: any) => {
        console.log(data)
        return data
      },
      error: (error) => {
        return error
      }
    })
    return respuesta
  }

}
