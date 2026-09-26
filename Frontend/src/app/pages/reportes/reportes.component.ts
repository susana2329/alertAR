import { Component, OnInit } from '@angular/core';
import { IonCard, IonCardContent, IonContent, IonHeader, IonNote, IonTitle } from '@ionic/angular';
import { Report } from '../../models/reporte';
@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  standalone: true,
  styleUrls: ['./reportes.component.scss'],
  imports: [IonHeader, IonContent, IonCard, IonCardContent, IonContent, IonTitle, IonNote],
})
export class ReportesComponent implements OnInit {
  public reporte: Report = {
    tipo: "",
    descripcion: "",
    ubicacion: "",
    fecha: new Date(),
    imagen: new File([], '')
  }
  constructor() {
  }

  ngOnInit() { }

  creandoReporte(event: Event) {
    this.reporte.tipo = (event.target as HTMLElement).id
    console.log(this.reporte.tipo)
  }
}
