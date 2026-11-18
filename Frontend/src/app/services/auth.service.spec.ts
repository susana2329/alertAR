import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SesionService } from './sesion.service';

describe('AuthService: verificación de sesión', () => {
  let auth: AuthService;
  let sesion: SesionService;
  let http: HttpTestingController;

  const token = (exp: number) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ exp }))}.firma`;
  const usuario = { nombre: 'Ana', email: 'ana@example.com' };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    auth = TestBed.inject(AuthService);
    sesion = TestBed.inject(SesionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('no consulta el servidor si no hay sesión', async () => {
    await expect(auth.verificarSesion()).resolves.toBe('sin-sesion');
    http.expectNone(req => req.url.endsWith('/auth/me'));
  });

  it('conserva una sesión válida confirmada por el servidor', async () => {
    const jwt = token(Math.floor(Date.now() / 1000) + 3600);
    sesion.iniciar(jwt, usuario);

    const verificacion = auth.verificarSesion();
    const request = http.expectOne(req => req.url.endsWith('/auth/me'));
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${jwt}`);
    request.flush(usuario);

    await expect(verificacion).resolves.toBe('vigente');
    expect(sesion.obtenerToken()).toBe(jwt);
  });

  it('cierra una sesión vencida sin hacer una petición', async () => {
    sesion.iniciar(token(Math.floor(Date.now() / 1000) - 60), usuario);

    await expect(auth.verificarSesion()).resolves.toBe('invalida');
    expect(sesion.obtenerToken()).toBeNull();
    http.expectNone(req => req.url.endsWith('/auth/me'));
  });

  it('conserva el token cuando no hay conexión para comprobarlo luego', async () => {
    const jwt = token(Math.floor(Date.now() / 1000) + 3600);
    sesion.iniciar(jwt, usuario);

    const verificacion = auth.verificarSesion();
    http.expectOne(req => req.url.endsWith('/auth/me')).error(new ProgressEvent('error'));

    await expect(verificacion).resolves.toBe('no-verificada');
    expect(sesion.obtenerToken()).toBe(jwt);
  });

  it('cierra la sesión cuando el servidor rechaza el token', async () => {
    sesion.iniciar(token(Math.floor(Date.now() / 1000) + 3600), usuario);

    const verificacion = auth.verificarSesion();
    http.expectOne(req => req.url.endsWith('/auth/me'))
      .flush({ mensaje: 'Sesión vencida' }, { status: 401, statusText: 'Unauthorized' });

    await expect(verificacion).resolves.toBe('invalida');
    expect(sesion.obtenerToken()).toBeNull();
  });

  it('no cierra una sesión nueva por la respuesta tardía de una anterior', async () => {
    sesion.iniciar(token(Math.floor(Date.now() / 1000) + 3600), usuario);
    const verificacion = auth.verificarSesion();
    const request = http.expectOne(req => req.url.endsWith('/auth/me'));
    const nuevoToken = token(Math.floor(Date.now() / 1000) + 7200);
    sesion.iniciar(nuevoToken, usuario);
    request.flush({ mensaje: 'Sesión vencida' }, { status: 401, statusText: 'Unauthorized' });

    await expect(verificacion).resolves.toBe('obsoleta');
    expect(sesion.obtenerToken()).toBe(nuevoToken);
  });
});
