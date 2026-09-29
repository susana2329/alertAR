import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  {
    path: 'cuenta',
    loadComponent: () => import('./pages/cuenta/cuenta').then((m) => m.CuentaPage),
  },

  {
    path: 'fuentes',
    loadComponent: () => import('./pages/cuenta/fuentes/fuentes').then(m => m.FuentesPage)
  },

{
  path: 'configuracion',
  loadComponent: () => import('./pages/cuenta/configuracion/configuracion').then(m => m.ConfiguracionPage)
}


];
