# Reportes vecinales en el mapa

Para instalar este backend en EC2, ver [DEPLOY-EC2.md](DEPLOY-EC2.md).

## Retención de reportes y eliminación de cuentas

Los reportes activos no vencen por edad. Al cerrarse por consenso se registra `fechaCierre`; al rechazarse por moderación se registran `fechaCierre` y `fechaModeracion`. El proceso de retención elimina reportes cerrados tras 12 meses y rechazados tras 30 días, usando el flujo existente que deja una tarea persistente para limpiar sus fotos de S3. También reintenta trabajos de fotos pendientes. Un reporte eliminado por su autor se retira inmediatamente; la limpieza de fotos puede quedar pendiente si S3 falla.

La eliminación de cuenta retira primero sus reportes, anonimiza sus votos en reportes ajenos, desvincula las moderaciones que realizó y después borra el usuario. Si falla un paso, la cuenta permanece para permitir el reintento. El borrado de cuentas por 24 meses de inactividad **no está activo**: falta un servicio de correo para dar aviso previo.

Antes de activar la retención, ejecutar `node scripts/procesar-retencion.js` para ver conteos sin modificar datos. `node scripts/procesar-retencion.js --ejecutar` procesa reportes vencidos y reintenta fotos; no ejecutarlo sin revisar el resultado de consulta y una copia de seguridad. En producción, `RETENCION_AUTOMATICA=true` ejecuta el proceso al iniciar el backend y luego cada 24 horas. Sin esa variable, no hay borrado periódico. Se requieren región, bucket y un rol IAM de EC2 con permisos S3 para completar la limpieza de fotos.

Los reportes cerrados antes de esta versión pueden no tener `fechaCierre`; se omiten automáticamente para evitar un borrado prematuro. Deben revisarse y fecharse con evidencia antes de incorporarlos al plazo. La política visible en la app describe esta excepción.

## Limpieza de fotos tras eliminar reportes

Antes de borrar un reporte con fotos se guardan sus claves en `limpiezas_fotos_pendientes` con confirmación mayoritaria. Tras el borrado se intenta limpiar S3; si falla, el trabajo se conserva. No hay scheduler: un operador con la configuración de MongoDB y S3 debe ejecutar `node scripts/procesar-limpiezas-fotos.js` para consultar el total y `node scripts/procesar-limpiezas-fotos.js --ejecutar` para reintentar. El comando omite trabajos cuyo reporte aún exista, imprime solo conteos y puede repetirse; S3 admite borrar objetos ya ausentes. Si se interrumpió antes del borrado MongoDB, el dueño puede reintentar la eliminación del reporte. El mecanismo también conserva las referencias de fotos de rechazos cuando posteriormente se elimina el reporte, pero no procesa automáticamente rechazos cuyos reportes siguen existiendo.

## Límites de solicitudes

Ventanas fijas en memoria por proceso: login 10/15 min por IP, registro 5/h por IP, Google 20/15 min por IP, creación de reportes (incluidas fotos) 30/h por IP y 10/h por usuario, votos 120/h por IP y 60/h por usuario. Superar el límite devuelve 429 y `Retry-After` en segundos. Los contadores se reinician al reiniciar el proceso y no se comparten entre instancias; se admiten hasta 10.000 claves por limitador. En redes compartidas, los límites por IP se comparten entre usuarios.

Por defecto no se confía en `X-Forwarded-For`. Si Nginx corre en la misma máquina, es el único proxy delante de Node y el puerto de Node no es accesible directamente desde redes no confiables, configurar `TRUST_PROXY_LOOPBACK=true` y hacer que Nginx reemplace `X-Forwarded-For` con `$remote_addr` (no conservar cabeceras recibidas del cliente). Para otras topologías se necesita configurar explícitamente direcciones de proxies confiables; no habilitar confianza global.

Los reportes geolocalizados se muestran como marcadores vecinales en `GET /api/alertas/mapa`. Se publican inmediatamente con estado `sin_confirmar`; el mapa vuelve a consultar cada 30 segundos y los reportes cerrados dejan de aparecer. No vencen por tiempo: permanecen hasta alcanzar consenso para cerrarlos.

## Enviar un reporte

`POST /reportes/reporte` requiere `Authorization: Bearer <token>` y un formulario `multipart/form-data` con `tipo`, `descripcion`, `ubicacion`, `fecha`, `latitud` y `longitud`. Se aceptan hasta tres imágenes de un máximo de 5 MB cada una. La identidad del autor se obtiene de la sesión, no de un ID enviado por el cliente.

## Responder a un reporte

`POST /reportes/reporte/:id/voto` requiere sesión y un JSON con `respuesta: "sigue"` o `respuesta: "no_esta"`. Cada usuario puede responder una sola vez por reporte y no puede responder a su propio reporte.

`GET /reportes/reporte/:id/imagenes` entrega URLs firmadas temporales de las fotos de un reporte vecinal que siga activo. El endpoint se usa al abrir el popup, no al cargar el mapa; las claves internas de S3 nunca se envían al cliente.

`GET /reportes/mis-reportes` requiere sesión y solo devuelve los reportes del usuario autenticado, con URLs firmadas para la galería del detalle. No se ofrece un listado público por ID de usuario.

- Se confirma al recibir tres respuestas distintas de vecinos que indican que sigue ahí.
- Se cierra con al menos tres respuestas “ya no está” si representan al menos dos tercios de todas las respuestas.
- El marcador muestra ambos conteos y el estado. Un reporte cerrado se excluye del mapa.

Los tipos se normalizan al vocabulario de alertas que consume el mapa. Las coordenadas se guardan como GeoJSON `Point`; la ubicación legible se conserva para las pantallas de reportes.
