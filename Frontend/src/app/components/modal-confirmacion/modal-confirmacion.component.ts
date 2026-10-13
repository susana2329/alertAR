import { Component, OnInit, } from '@angular/core';
import { IonButton, IonContent, IonDatetime, IonDatetimeButton, IonFooter, IonHeader, IonInput, IonLabel, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular';
import { mockReporte } from '../../mocks/reporte';
import { Report } from '../../models/reporte';
import { CommonModule } from '@angular/common';
import { barChart, options } from 'ionicons/icons';
import { IonModal } from '@ionic/angular/common';


@Component({
  selector: 'app-modal-confirmacion',
  templateUrl: './modal-confirmacion.component.html',
  styleUrls: ['./modal-confirmacion.component.scss'],
  imports: [IonContent, IonLabel, IonInput, CommonModule, IonButton, IonTextarea, IonDatetimeButton, IonFooter, IonDatetime, IonModal,IonHeader,IonTitle,IonToolbar],
})
export class ModalConfirmacionComponent implements OnInit {
  public contador: number = 0
  public reporte: Report = {
    tipo: "",
    descripcion: "",
    ubicacion: "",
    fecha: new Date(),
    imagen: []
  }
  public fotos = []
  public fechaiso: string = ""
  constructor() { }

  ngOnInit() {
    this.reporte = mockReporte
    this.fechaiso = mockReporte.fecha.toISOString();
    console.log(this.reporte)
    console.log(mockReporte.fecha)
  }
  fotosiguiente() {
    console.log(this.contador)
    this.contador ++
    if (this.contador == this.reporte.imagen.length) {
      this.contador = 0
    }
  }
  fotoatras() {
    console.log(this.contador)
    this.contador = this.contador - 1 
    if (this.contador == -1 ) {
      this.contador = this.reporte.imagen.length - 1 
    }
  }

}
