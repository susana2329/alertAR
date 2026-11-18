const UMBRAL_CONFIRMACION_VECINAL = 3
const UMBRAL_CIERRE_VECINAL = 3

function evaluarEstadoVecinal(votos, estadoActual = 'sin_confirmar') {
    const votosSigue = votos.filter(voto => voto.respuesta === 'sigue').length
    const votosNoEsta = votos.filter(voto => voto.respuesta === 'no_esta').length
    if (votosNoEsta >= UMBRAL_CIERRE_VECINAL && votosNoEsta * 3 >= votos.length * 2) return 'cerrado'
    if (votosSigue >= UMBRAL_CONFIRMACION_VECINAL) return 'confirmado'
    return estadoActual
}

module.exports = {
    UMBRAL_CONFIRMACION_VECINAL,
    UMBRAL_CIERRE_VECINAL,
    evaluarEstadoVecinal
}
