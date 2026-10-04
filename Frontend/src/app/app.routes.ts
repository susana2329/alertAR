import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
    {
    path: 'reportes',
    loadComponent: () => import('./pages/reportes/reportes.page').then((m) => m.ReportesPage),
  },
  {
    path: '',
    redirectTo: 'reportes',
    pathMatch: 'full',
  },
  {
    path: 'reportes/form',
    loadComponent: () => import('./pages/reportes-form/reportes-form.page').then( m => m.ReportesFormPage)
  },



];
