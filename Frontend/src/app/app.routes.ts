import { Routes } from '@angular/router';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'acceso',
    pathMatch: 'full',
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
    path: 'reportes/form',
    loadComponent: () => import('./pages/reportes-form/reportes-form.page').then( m => m.ReportesFormPage)
  }, {
    path: 'reportes',
    loadComponent: () => import('./pages/reportes/reportes.page').then((m) => m.ReportesPage),
  },

// cuando vayan subiendo las demas pages
  {
    path: 'mapa-test',
    loadComponent: () => import('./mapa-test/mapa-test.page').then(m => m.MapaTestPage),
  },
  {
  path: 'detalle-alerta/:id',
  loadComponent: () =>
    import('./detalle-alerta/detalle-alerta.page').then(
      m => m.DetalleAlertaPage
    )
},
{
    path: 'prevencion/mochila',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },
  {
    path: 'prevencion/recomendaciones',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
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
},
{
  path: 'informacion',
  loadComponent: () => import('./pages/cuenta/informacion/informacion').then(m => m.InformacionPage)
},
{
  path: 'perfil',
  loadComponent: () => import('./pages/cuenta/perfil/perfil').then(m => m.PerfilPage)
},

  {
    path: '**',
    redirectTo: 'acceso',
  },
];
