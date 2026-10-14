import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonCard, IonNote, IonCardContent, IonButton, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { arrowBackOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  imports: [IonIcon, IonButton, IonContent, IonHeader, IonTitle, CommonModule, FormsModule, IonNote, IonCardContent, IonCard]
})
export class ReportesPage implements OnInit {
  public tiporeportes: string = ""


  constructor(private router: Router) {
    addIcons({
      'arrow-back-outline': arrowBackOutline
    })
  }

  ngOnInit() {
  }
  creandoReporte(event: Event) {
    this.tiporeportes = (event.target as HTMLElement).id
    this.router.navigate(['/reportes/form'], {
      queryParams: {
        tipoReporte: this.tiporeportes
      }
    })
  }

}
