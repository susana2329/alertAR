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
  IonCard,
  IonCardContent,
  IonCardHeader,
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
    IonNote
  ]
})
export class ReportesFormPage implements OnInit {
  public tipo: string = ""
  public reporte: Report = {
    tipo: "",
    descripcion: "",
    ubicacion: "",
    fecha: new Date,
    imagen: new File([], '')
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
  }
  ingresartipo(event: Event) {
    if (this.bandera == false) {
      this.reporte.tipo = (event as CustomEvent).detail.value
      console.log(this.reporte.tipo)
    }
  }
  descripcion(event: Event) {
    this.reporte.descripcion = (event as CustomEvent).detail.value
  }
  ubicacion(event: Event) {
    this.reporte.ubicacion = (event as CustomEvent).detail.value
  }
  hora(event: Event) {
    console.log(event as PointerEvent)
  }
  fecha(event: Event) {
    console.log(event as PointerEvent)
  }
  async construccionmodal() {
    const modalbuttons = await this.modal.create({
      component: ModalPhotosComponent,
      initialBreakpoint: 0.3,

    })

    await modalbuttons.present()
  }
  abrirmodal() {
    this.construccionmodal()
  }
  enviar() {


  }

}
