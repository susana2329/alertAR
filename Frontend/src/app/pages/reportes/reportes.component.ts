import { Component, OnInit } from '@angular/core';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonContent, IonHeader, IonTitle} from '@ionic/angular';
import { Report } from '../../models/reporte';
import { IonCardTitle } from '@ionic/angular';
@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  standalone: true, 
  styleUrls: ['./reportes.component.scss'],
  imports: [IonHeader, IonContent, IonCard,IonCardHeader, IonCardContent,IonContent,IonCardTitle,IonTitle,IonButton],
})
export class ReportesComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
