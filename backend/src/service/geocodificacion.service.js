const URL_BASE = process.env.ALERTAR_GEOCODIFICADOR_REVERSE_URL || 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'AlertAR/1.0 (reverse geocoding)';
const TTL_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE = 1000;
const INTERVALO_MINIMO_MS = 1000;
const cache = new Map();
let ultimaSolicitud = 0;
let colaSolicitudes = Promise.resolve();

function redondear(valor) { return Math.round(valor * 1000) / 1000; }
function cacheKey({ latitud, longitud }) { return `${redondear(latitud)},${redondear(longitud)}`; }

function primeraDireccion(address, campos) {
    for (const campo of campos) {
        const valor = address?.[campo];
        if (typeof valor === 'string' && valor.trim()) return valor.trim();
    }
    return null;
}

function presentarLugar(documento) {
    const address = documento?.address ?? {};
    // Nominatim puede devolver solo algunos niveles; nunca se fabrica un nombre.
    const localidad = primeraDireccion(address, [
        'neighbourhood', 'suburb', 'quarter', 'village', 'town', 'city', 'municipality', 'city_district', 'hamlet'
    ]);
    const provincia = primeraDireccion(address, ['state', 'province', 'region']);
    const nombre = [localidad, provincia].filter((valor, indice, valores) => valor && valores.indexOf(valor) === indice).join(', ') || null;
    return {
        nombre,
        localidad,
        provincia,
        proveedor: 'OpenStreetMap',
        atribucion: '© OpenStreetMap contributors'
    };
}

function obtenerCache(key, ahora = Date.now()) {
    const entrada = cache.get(key);
    if (!entrada) return null;
    if (entrada.expira <= ahora) { cache.delete(key); return null; }
    // Tocar la entrada la mueve al final para mantener un límite LRU aproximado.
    cache.delete(key);
    cache.set(key, entrada);
    return entrada.valor;
}

function guardarCache(key, valor, ahora = Date.now()) {
    cache.delete(key);
    cache.set(key, { valor, expira: ahora + TTL_CACHE_MS });
    while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
}

function encolarSolicitud(operacion) {
    const siguiente = colaSolicitudes.then(async () => {
        const espera = Math.max(0, ultimaSolicitud + INTERVALO_MINIMO_MS - Date.now());
        if (espera) await new Promise(resolve => setTimeout(resolve, espera));
        ultimaSolicitud = Date.now();
        return operacion();
    });
    colaSolicitudes = siguiente.catch(() => {});
    return siguiente;
}

async function obtenerUbicacionLegible(ubicacion, dependencias = {}) {
    const latitud = redondear(ubicacion.latitud);
    const longitud = redondear(ubicacion.longitud);
    const key = cacheKey({ latitud, longitud });
    const hit = obtenerCache(key);
    if (hit) return hit;

    const fetchImpl = dependencias.fetch || globalThis.fetch;
    if (typeof fetchImpl !== 'function') throw new Error('El entorno no tiene fetch disponible');
    const url = new URL(URL_BASE);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '13');
    url.searchParams.set('accept-language', 'es');
    url.searchParams.set('lat', String(latitud));
    url.searchParams.set('lon', String(longitud));

    const valor = await encolarSolicitud(async () => {
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 5000);
        try {
            const response = await fetchImpl(url, {
                headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT },
                signal: abort.signal
            });
            if (!response.ok) throw new Error(`Nominatim respondió HTTP ${response.status}`);
            return presentarLugar(await response.json());
        } finally { clearTimeout(timer); }
    });
    guardarCache(key, valor);
    return valor;
}

module.exports = {
    obtenerUbicacionLegible,
    presentarLugar,
    _limpiarCache() { cache.clear(); ultimaSolicitud = 0; colaSolicitudes = Promise.resolve(); },
    _cacheSize() { return cache.size; }
};
