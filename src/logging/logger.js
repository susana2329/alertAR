function sanear(valor) {
    if (typeof valor === 'string') return valor.replace(/mongodb(?:\+srv)?:\/\/[^@\s]+@/gi, 'mongodb://[credenciales-redactadas]@');
    if (Array.isArray(valor)) return valor.map(sanear);
    if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, sanear(v)]));
    return valor;
}

function registrar(nivel, evento, campos = {}) {
    const registro = sanear({ timestamp: new Date().toISOString(), nivel, evento, ...campos });
    const destino = nivel === 'error' ? console.error : nivel === 'warn' ? console.warn : console.log;
    destino(JSON.stringify(registro));
}

module.exports = {
    info: (evento, campos) => registrar('info', evento, campos),
    warn: (evento, campos) => registrar('warn', evento, campos),
    error: (evento, campos) => registrar('error', evento, campos)
};
