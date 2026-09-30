import { Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { Report } from '../../models/reporte';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-reportes-form',
  templateUrl: './reportes-form.page.html',
  styleUrls: ['./reportes-form.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class ReportesFormPage implements OnInit {
  public tipo : string= ""
  constructor(private router : ActivatedRoute) {
   }

  ngOnInit() {
    this.tipo = this.router.snapshot.queryParams['tipoReporte']
    console.log (this.tipo)
  }


}
