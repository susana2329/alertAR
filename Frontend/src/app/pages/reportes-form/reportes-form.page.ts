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
  IonIcon
} from '@ionic/angular';
import { Report } from '../../models/reporte';
import { ActivatedRoute } from '@angular/router';
import { IonModal } from '@ionic/angular/common';
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
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonTextarea,
    IonItem,
    IonInput,
    IonIcon,
  ]
})
export class ReportesFormPage implements OnInit {
  public tipo: string = ""
  constructor(private router: ActivatedRoute) {
  }

  ngOnInit() {
    this.tipo = this.router.snapshot.queryParams['tipoReporte']
    console.log(this.tipo)
  }


}
