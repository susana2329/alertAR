import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
import { SesionService } from '../services/sesion.service';


export const soloConSesion: CanActivateFn = async () => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  const alertCtrl = inject(AlertController);
  const navCtrl = inject(NavController);

  if (sesion.logueado()) {
    return true;
  }

  const aviso = await alertCtrl.create({
    header: 'Iniciá sesión',
    message: 'Para usar esta sección tenés que iniciar sesión.',
    buttons: [
      { text: 'Ahora no', role: 'cancel' },
      {
        text: 'Iniciar sesión',
        handler: () => {
          navCtrl.navigateForward('/acceso/flip');
        }
      }
    ]
  });
  await aviso.present();

  return router.url === '/' ? router.parseUrl('/inicio') : false;
};