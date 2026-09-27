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
  {
    path: 'acceso/login',
    loadComponent: () => import('./pages/acceso/login/login.page').then(m => m.LoginPage)
  },
  {
  path: 'acceso/registro',
  loadComponent: () => import('./pages/acceso/registro/registro.page').then(m => m.RegistroPage)
},
{
  path: 'acceso/permisos-ubicacion',
  loadComponent: () => import('./pages/acceso/permisos-ubicacion/permisos-ubicacion.page').then(m => m.PermisosUbicacionPage)
},
];
