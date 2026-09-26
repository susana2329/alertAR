import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular';
@Component({
  selector: 'app-antes-login',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon],
  templateUrl: './antes-login.html',
  styleUrls: ['./antes-login.css']
})
export class AntesLoginPage {
  constructor(private router: Router) {}

  irALogin() { this.router.navigate(['/acceso/login']); }
  irARegistro() { this.router.navigate(['/acceso/registro']); }
  continuarSinCuenta() { this.router.navigate(['/inicio']); }
}
