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
  IonNote
} from '@ionic/angular';
import { Report } from '../../models/reporte';
import { ActivatedRoute } from '@angular/router';
import { IonModal } from '@ionic/angular/common';
import { ModalController } from '@ionic/angular';
import { ModalPhotosComponent } from '../../components/modal-photos/modal-photos.component'
import { ModalConfirmacionComponent } from '../../components/modal-confirmacion/modal-confirmacion.component'
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
    ModalPhotosComponent
  ]
})
export class ReportesFormPage implements OnInit {
  public tipo: string = ""
  public reporte: Report = {
    tipo: "",
    descripcion: "",
    ubicacion: "",
    fecha: new Date(),
    imagen: []
  }
  public bandera!: boolean

  constructor(private router: ActivatedRoute, private modal: ModalController) {
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




  ubicacion(event: Event) {
    this.reporte.ubicacion = (event as CustomEvent).detail.value
  }



  fecha(event: Event) {
    this.reporte.fecha = new Date((event as CustomEvent).detail.value)
    console.log(this.reporte.fecha)
  }



  async abrirmodalphotos() {
    const modalbuttons = await this.modal.create({
      component: ModalPhotosComponent,
      initialBreakpoint: 0.3,
      breakpoints : [0.25, 0.5, 0.75, 1]
    })
    await modalbuttons.present()
  }
  guardarfotos(event: object[]) {
    console.log("vino de hijo", event)
  }



  async confirmarreport() {
    const modalcomfirmar = await this.modal.create({
      component: ModalConfirmacionComponent,
    })
    await modalcomfirmar.present()
  }

}
