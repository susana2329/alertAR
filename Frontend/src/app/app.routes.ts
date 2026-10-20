import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { SesionService } from './services/sesion.service';
import { soloConSesion } from './guards/sesion.guard';

const arranque = () => (inject(SesionService).logueado() ? '/inicio' : '/acceso');

export const routes: Routes = [

  {
    path: '',
    pathMatch: 'full',
    redirectTo: arranque,
  },

  {
    path: 'acceso',
    loadComponent: () => import('./pages/acceso/antes-login/antes-login').then(m => m.AntesLoginPage),
  },
  {
    path: 'acceso/flip',
    loadComponent: () => import('./pages/acceso/acceso-flip/acceso-flip.page').then(m => m.AccesoFlipPage),
  },
  {
    path: 'acceso/permisos-ubicacion',
    loadComponent: () => import('./pages/acceso/permisos-ubicacion/permisos-ubicacion.page').then(m => m.PermisosUbicacionPage),
  },

  {
    path: 'inicio',
    loadComponent: () => import('./pages/inicio/inicio.page').then((m) => m.InicioPage),
  },
  {
    
    path: 'inicio/recomendaciones',
    loadComponent: () => import('./pages/inicio/recomendaciones/recomendaciones.page').then((m) => m.RecomendacionesPage),
  },
  {
    path: 'inicio/recomendaciones/:id',
    loadComponent: () => import('./pages/inicio/recomendaciones/detalle/detalle-recomendacion.page').then((m) => m.DetalleRecomendacionPage),
  },

  {
    path: 'reportes',
    canActivate: [soloConSesion],
    data: { aviso: 'Para hacer un reporte' },
    loadComponent: () => import('./pages/reportes/reportes.page').then((m) => m.ReportesPage),
  },
  {
    path: 'reportes/form',
    canActivate: [soloConSesion],
    data: { aviso: 'Para hacer un reporte' },
    loadComponent: () => import('./pages/reportes-form/reportes-form.page').then((m) => m.ReportesFormPage),
  },
  {
    path: 'mapa',
    canActivate: [soloConSesion],
    data: { aviso: 'Para usar el mapa interactivo' },
    loadComponent: () => import('./mapa-test/mapa-test.page').then(m => m.MapaTestPage),
  },
  {
    path: 'prevencion',
    redirectTo: 'prevencion/mochila',
    pathMatch: 'full',
  },
  {
    path: 'prevencion/mochila',
    canActivate: [soloConSesion],
    data: { aviso: 'Para ver tu mochila de emergencia' },
    loadComponent: () => import('./pages/proximamente/proximamente.page').then(m => m.ProximamentePage),
  },
  {
    path: 'prevencion/recomendaciones',
    canActivate: [soloConSesion],
    data: { aviso: 'Para ver tus recomendaciones' },
    loadComponent: () => import('./pages/proximamente/proximamente.page').then(m => m.ProximamentePage),
  },
  {
    path: 'cuenta',
    canActivate: [soloConSesion],
    data: { aviso: 'Para ver tu cuenta' },
    loadComponent: () => import('./pages/proximamente/proximamente.page').then(m => m.ProximamentePage),
  },

  {
    path: '**',
    redirectTo: arranque,
  },
];