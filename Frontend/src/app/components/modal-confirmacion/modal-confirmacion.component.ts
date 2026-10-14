import { Component, Input, OnInit } from '@angular/core';
import { IonButton, IonContent, IonDatetime, IonDatetimeButton, IonFooter, IonHeader, IonInput, IonLabel, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular';
import { Report } from '../../models/reporte';
import { CommonModule } from '@angular/common';
import { IonModal } from '@ionic/angular/common';

@Component({
  selector: 'app-modal-confirmacion',
  templateUrl: './modal-confirmacion.component.html',
  styleUrls: ['./modal-confirmacion.component.scss'],
  imports: [IonContent, IonLabel, IonInput, CommonModule, IonButton, IonTextarea, IonDatetimeButton, IonFooter, IonDatetime, IonModal,IonHeader,IonTitle,IonToolbar],
})
export class ModalConfirmacionComponent implements OnInit {
 
  @Input() reporte!: Report
  public contador: number = 0
  public fotos: string[] = []
  public fechaiso: string = ""
  constructor() { }

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

}
