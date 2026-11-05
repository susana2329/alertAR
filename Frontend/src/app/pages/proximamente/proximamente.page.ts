import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-proximamente',
  standalone: true,
  imports: [IonContent],
  template: `
    <ion-content class="ion-padding">
      <div class="mensaje">
        <h2>Próximamente</h2>
        <p>Esta sección todavía se está armando.</p>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: #F8FAFC;
    }

    .mensaje {
      padding-top: 120px;
      text-align: center;
    }

    h2 {
      margin: 0 0 8px 0;
      font-size: 22px;
      font-weight: 700;
      color: #03294F;
    }

    p {
      margin: 0;
      font-size: 15px;
      color: #4A5560;
    }
  `]
})
export class ProximamentePage {}