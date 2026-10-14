import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonLabel,
  IonButton,
  IonDatetime,
  IonDatetimeButton,
  IonTextarea,
  IonItem,
  IonInput,
  IonIcon,
  IonNote,
} from '@ionic/angular';
import { Report } from '../../models/reporte';
import { ActivatedRoute } from '@angular/router';
import { IonModal } from '@ionic/angular/common';
import { ModalController } from '@ionic/angular';
import { ModalPhotosComponent } from '../../components/modal-photos/modal-photos.component'
import { ModalConfirmacionComponent } from '../../components/modal-confirmacion/modal-confirmacion.component'
import { ReportesPage } from '../reportes/reportes.page'
import { Location } from '@angular/common';
import { arrowBackOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
@Component({
  selector: 'app-reportes-form',
  templateUrl: './reportes-form.page.html',
  styleUrls: ['./reportes-form.page.scss'],
  imports: [IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonLabel,
    IonButton,
    IonDatetimeButton,
    IonModal,
    IonDatetime,
    IonTextarea,
    IonItem,
    IonInput,
    IonNote,
    IonIcon
  ]
})
export class ReportesFormPage implements OnInit {
  public tipo: string = ""
  public reporte: Report = {
    tipo: "",
    descripcion: "",
    ubicacion: "Lugano, Buenos Aires (ubicacion automatica)",
    fecha: new Date(),
    imagen: []
  }
  public previewimg: string[] = []
  public bandera!: boolean
  component = ReportesPage
  public contador = 0

  constructor(private router: ActivatedRoute, private modal: ModalController, private location: Location) {
    addIcons({
      'arrow-back-outline': arrowBackOutline
    })
  }
  ngOnInit() {
    this.tipo = this.router.snapshot.queryParams['tipoReporte']
    this.tipo = this.tipo.replaceAll("-", " ")
    if (this.tipo == "otro") {
      this.bandera = false
    }
    else {
      this.bandera = true
      this.reporte.tipo = this.tipo
    }
    console.log(this.fecha)
  }



  ingresartipo(event: Event) {
    if (this.bandera == false) {
      this.reporte.tipo = (event as CustomEvent).detail.value
      console.log(this.reporte.tipo)
    }
  }

  fecha(event: Event) {
    this.reporte.fecha = new Date((event as CustomEvent).detail.value)
    console.log(this.reporte.fecha)
  }

  async abrirmodalphotos() {
    const modalbuttons = await this.modal.create({
      component: ModalPhotosComponent,
      initialBreakpoint: 0.3,
      breakpoints: [0.25, 0.5, 0.75, 1]
    })
    const dismissal = modalbuttons.onDidDismiss<Blob[]>()
    await modalbuttons.present()
    const { data } = await dismissal
    if (data) {
      this.guardarfotos(data);
    } else {
      return
    }
  }

  guardarfotos(event: Blob[]) {
    if (event.length === 0) {
      return
    }

    if (event.length >= 3) {
      this.previewimg.forEach(url => URL.revokeObjectURL(url))
      this.reporte.imagen = event.slice(0, 3)
      this.previewimg = this.reporte.imagen.map(imagen => URL.createObjectURL(imagen))
      this.contador = 0
      return
    }

    for (const imagen of event) {
      if (this.reporte.imagen.length < 3) {
        this.reporte.imagen.push(imagen)
        this.previewimg.push(URL.createObjectURL(imagen))
      } else {
        URL.revokeObjectURL(this.previewimg[0])
        this.reporte.imagen[0] = imagen
        this.previewimg[0] = URL.createObjectURL(imagen)
      }
    }
    this.contador = 0
  }

  async confirmarreport() {
    const modalcomfirmar = await this.modal.create({
      component: ModalConfirmacionComponent,
      componentProps: {
        reporte: this.reporte
      }
    })
    await modalcomfirmar.present()
  }
  siguientefoto() {
    this.contador = this.contador + 1
 
    if (this.contador == this.reporte.imagen.length) {
      this.contador = 0
    }
  }
  atrasfoto() {
    this.contador = this.contador - 1
    if (this.contador < 0) {
      this.contador = this.reporte.imagen.length - 1
    }
  }
  volver() {
    this.location.back()
  }

}
