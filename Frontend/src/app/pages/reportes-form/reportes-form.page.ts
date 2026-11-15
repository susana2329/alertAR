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
import { ActivatedRoute, Router } from '@angular/router';
import { IonModal } from '@ionic/angular/common';
import { ToastController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { ModalPhotosComponent } from '../../components/modal-photos/modal-photos.component'
import { ModalConfirmacionComponent } from '../../components/modal-confirmacion/modal-confirmacion.component'
import { ReportesPage } from '../reportes/reportes.page'
import { Location } from '@angular/common';
import { arrowBackOutline, checkmarkCircle } from 'ionicons/icons';
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
    IonIcon]
})
export class ReportesFormPage implements OnInit {
  public tipo: string = ""
  public reporte: Report = {
    tipo: "",
    descripcion: "",
    ubicacion: "Lugano, Buenos Aires (ubicacion automatica)",
    fecha: new Date(),
    imagen: [],
    fotos:[], 
    estado: "En revicion"
  }
  public previewimg: string[] = []
  public bandera!: boolean
  component = ReportesPage
  public contador = 0

  public reporteEnviado: boolean = false; 

  constructor(private route: ActivatedRoute, private router: Router, private modal: ModalController, private location: Location, private toastcontrol: ToastController) {
    addIcons({
      'arrow-back-outline': arrowBackOutline,
      'checkmark-circle': checkmarkCircle // Importación añadida para el ícono de éxito del botón
    })
  }
  ngOnInit() {
    this.tipo = this.route.snapshot.queryParams['tipoReporte'] ?? 'otro'
    this.tipo = this.tipo.replaceAll("-", " ")
    if (this.tipo == "otro") {
      this.bandera = false
    }
    else {
      this.bandera = true
      this.reporte.tipo = this.tipo
    }
    console.log(this.reporte.fecha)
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
      initialBreakpoint: 0.25,
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

  async crearModal() {
    const modalcomfirmar = await this.modal.create({
      component: ModalConfirmacionComponent,
      componentProps: {
        reporte: this.reporte
      }
    })
    const dismissal = modalcomfirmar.onDidDismiss<{ enviado?: boolean }>()
    await modalcomfirmar.present()
    const { data } = await dismissal
    if (data?.enviado) {
      await this.router.navigate(['/reportes'])
      await this.toast('¡Reporte enviado correctamente!', 'success')
    } else {
      this.reporteEnviado = false
    }
  }

  async confirmarreport() {
    if (this.reporte.descripcion) {
      this.reporteEnviado = true;

      await this.crearModal()
    }
    else {
      await this.toast()
    }
  }

  siguientefoto() {
    this.contador = this.contador + 1

    if (this.contador == this.reporte.imagen.length) {
      this.contador = 0
    }
  }

  async toast(message = '¡Error! Tenés que completar la descripción.', color: 'danger' | 'success' = 'danger') {
    const toast = await this.toastcontrol.create({
      message,
      duration: 3000,
      position: 'top',
      color
    })
    await toast.present()
  }

  atrasfoto() {
    this.contador = this.contador
    if (this.contador < 0) {
      this.contador = this.reporte.imagen.length - 1
    }
  }

  volver() {
    this.location.back()
  }
 
}
