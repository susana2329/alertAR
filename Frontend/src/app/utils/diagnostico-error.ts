import { HttpErrorResponse } from '@angular/common/http';

export interface DiagnosticoError {
  tipo: string;
  mensaje: string;
  codigoHttp?: number;
  url?: string;
  detalle?: unknown;
}

const CLAVE_SENSIBLE = /token|password|secret|authorization|cookie|credential|api.?key|client.?secret|(^|_)code($|_)/i;
const MAX_CARACTERES = 2000;

function sanearTexto(valor: string): string {
  return valor
    .replace(/(bearer\s+)[a-z0-9._~+/-]+=*/gi, '$1[redacted]')
    .replace(/((?:access|refresh|id)[_-]?token|password|secret|authorization|api[_-]?key|client[_-]?secret)(\s*[:=]\s*)([^\s,;"']+)/gi, '$1$2[redacted]')
    .slice(0, MAX_CARACTERES);
}

function sanearUrl(url: string): string {
  try {
    const base = typeof location === 'undefined' ? 'http://localhost' : location.origin;
    const parsed = new URL(url, base);
    for (const clave of parsed.searchParams.keys()) {
      if (CLAVE_SENSIBLE.test(clave)) parsed.searchParams.set(clave, '[redacted]');
    }
    return parsed.href.slice(0, MAX_CARACTERES);
  } catch {
    return sanearTexto(url);
  }
}

function sanearDetalle(valor: unknown, profundidad = 0): unknown {
  if (valor == null || typeof valor === 'boolean' || typeof valor === 'number') return valor;
  if (typeof valor === 'string') return sanearTexto(valor);
  if (profundidad >= 5) return '[depth limit]';
  if (Array.isArray(valor)) return valor.slice(0, 20).map(item => sanearDetalle(item, profundidad + 1));
  if (typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).slice(0, 40).map(([clave, item]) => [
      clave,
      CLAVE_SENSIBLE.test(clave) ? '[redacted]' : sanearDetalle(item, profundidad + 1)
    ]));
  }
  return sanearTexto(String(valor));
}

export function diagnosticarError(error: unknown, urlSolicitada?: string): DiagnosticoError {
  if (error instanceof HttpErrorResponse) {
    return {
      tipo: 'HttpErrorResponse',
      mensaje: sanearTexto(error.statusText || (error.status ? `HTTP ${error.status}` : 'Network error')),
      codigoHttp: error.status,
      url: sanearUrl(urlSolicitada || error.url || ''),
      detalle: sanearDetalle(error.error)
    };
  }

  if (error instanceof Error) {
    const datos = error as Error & { status?: unknown; url?: unknown; detail?: unknown; response?: unknown };
    const posibleUrl = typeof datos.url === 'string' ? datos.url : urlSolicitada;
    return {
      tipo: error.name || 'Error',
      mensaje: sanearTexto(error.message || error.name),
      ...(typeof datos.status === 'number' ? { codigoHttp: datos.status } : {}),
      ...(posibleUrl ? { url: sanearUrl(posibleUrl) } : {}),
      ...(datos.detail !== undefined ? { detalle: sanearDetalle(datos.detail) } : {}),
      ...(datos.response !== undefined ? { detalle: sanearDetalle(datos.response) } : {})
    };
  }

  if (error && typeof error === 'object') {
    const objeto = error as Record<string, unknown>;
    const mensaje = typeof objeto['message'] === 'string'
      ? objeto['message']
      : JSON.stringify(sanearDetalle(objeto)) || 'Error object';
    const url = typeof objeto['url'] === 'string' ? objeto['url'] : urlSolicitada;
    return {
      tipo: error.constructor?.name || 'Object',
      mensaje: sanearTexto(mensaje),
      ...(typeof objeto['status'] === 'number' ? { codigoHttp: objeto['status'] } : {}),
      ...(url ? { url: sanearUrl(url) } : {}),
      detalle: sanearDetalle(objeto)
    };
  }

  return {
    tipo: typeof error,
    mensaje: sanearTexto(String(error)),
    ...(urlSolicitada ? { url: sanearUrl(urlSolicitada) } : {})
  };
}
