import { Component, Input, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, ModalController } from '@ionic/angular';

export type TipoDocumentoLegal = 'terminos' | 'privacidad';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar],
  templateUrl: './legal.page.html',
  styleUrls: ['./legal.page.scss']
})
export class LegalPage {
  @Input() tipo?: TipoDocumentoLegal;
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly modalController = inject(ModalController);

  get documento(): TipoDocumentoLegal {
    return this.tipo ?? (this.route.snapshot.data['tipo'] as TipoDocumentoLegal) ?? 'privacidad';
  }

  async cerrar() {
    const modal = await this.modalController.getTop();
    if (modal) await modal.dismiss();
    else this.location.back();
  }
}
