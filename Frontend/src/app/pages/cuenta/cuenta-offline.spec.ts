import { of, throwError } from 'rxjs';
import { CuentaPage } from './cuenta';
import { PerfilPage } from './perfil/perfil';
import { SesionService } from '../../services/sesion.service';
import { PersonalService } from '../../services/usuario.service';
import { UsuarioPerfil } from '../../models/usuario.model';

describe('Datos de cuenta sin conexión', () => {
  let sesion: SesionService;
  const usuario = { id: 'usuario-1', nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.com', foto: '' };
  const cdr = { markForCheck: vi.fn() };

  beforeEach(() => {
    localStorage.clear();
    sesion = new SesionService();
    sesion.iniciar('token-de-prueba', usuario);
    cdr.markForCheck.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('Mi cuenta muestra la copia guardada aunque falle la consulta', () => {
    const personal = { obtenerDatosUsuario: () => throwError(() => new Error('Sin conexión')) } as unknown as PersonalService;
    const page = new CuentaPage({} as any, {} as any, personal, sesion, cdr as any);

    page.cargarDatosUsuario();

    expect(page.usuario?.nombre).toBe('Ana');
    expect(page.usuario?.email).toBe('ana@example.com');
    expect(page.datosSinActualizar).toBe(true);
  });

  it('Perfil muestra la copia guardada aunque falle la consulta', () => {
    const personal = { obtenerDatosUsuario: () => throwError(() => new Error('Sin conexión')) } as unknown as PersonalService;
    const page = new PerfilPage({} as any, {} as any, {} as any, cdr as any, personal, sesion);

    page.cargarDatosUsuario();

    expect(page.usuario?.nombre).toBe('Ana');
    expect(page.usuario?.email).toBe('ana@example.com');
    expect(page.datosSinActualizar).toBe(true);
  });

  it('una consulta exitosa actualiza la copia para la próxima apertura', () => {
    const actualizado: UsuarioPerfil = {
      _id: 'usuario-1', nombre: 'Ana María', apellido: 'Pérez',
      email: 'ana@example.com', foto: 'https://example.com/foto.jpg', proveedor: 'local'
    };
    const personal = { obtenerDatosUsuario: () => of(actualizado) } as unknown as PersonalService;
    const page = new CuentaPage({} as any, {} as any, personal, sesion, cdr as any);

    page.cargarDatosUsuario();

    expect(page.usuario?.nombre).toBe('Ana María');
    expect(JSON.parse(localStorage.getItem('alertar_usuario') || '{}').nombre).toBe('Ana María');
  });
});
