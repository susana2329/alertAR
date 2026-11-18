// Contadores locales al proceso, con capacidad acotada.
function crearLimitador({ maximo, ventanaMs, clave = req => req.ip, capacidad = 10000, ahora = Date.now }) {
  const clientes = new Map();
  let proximaLimpieza = 0;

  return (req, res, next) => {
    const tiempo = ahora();
    if (tiempo >= proximaLimpieza) {
      for (const [id, entrada] of clientes) {
        if (entrada.expira <= tiempo) clientes.delete(id);
      }
      proximaLimpieza = tiempo + 60000;
    }
    const id = clave(req);
    let entrada = clientes.get(id);
    if (!entrada || entrada.expira <= tiempo) {
      if (!entrada && clientes.size >= capacidad) {
        res.set('Retry-After', '60');
        return res.status(429).json({ error: { codigo: 'RATE_LIMITED', mensaje: 'Demasiadas solicitudes. Intentá nuevamente más tarde.' } });
      }
      entrada = { cantidad: 0, expira: tiempo + ventanaMs };
      clientes.set(id, entrada);
    }
    if (entrada.cantidad >= maximo) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entrada.expira - tiempo) / 1000))));
      return res.status(429).json({ error: { codigo: 'RATE_LIMITED', mensaje: 'Demasiadas solicitudes. Intentá nuevamente más tarde.' } });
    }
    entrada.cantidad++;
    next();
  };
}

module.exports = { crearLimitador };
