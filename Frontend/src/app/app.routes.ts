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
  path: 'acceso',
  loadComponent: () => import('./pages/acceso/antes-login/antes-login').then(m => m.AntesLoginPage)
},
];
