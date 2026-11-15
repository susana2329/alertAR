import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet, NavController } from '@ionic/angular';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { AuthApiService } from './services/auth-api.service';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, NavBarComponent],
})
export class AppComponent {
  constructor(private authApi: AuthApiService, private navCtrl: NavController) {
    this.authApi.sesionVigente().then(vigente => {
      if (!vigente) {
        this.navCtrl.navigateRoot('/acceso');
      }


    });
  }
}

