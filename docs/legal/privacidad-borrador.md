# Política de privacidad de AlertAR — borrador para revisión

**Antes de publicar, completar el domicilio de contacto y verificar los plazos en producción.**

Última actualización: 17 de noviembre de 2026

## Responsable y contacto

AlertAR es operada por Tobias Sanchez. Para consultas sobre datos personales y solicitudes de acceso, corrección o eliminación: contacto@alertarapp.com.ar. **Pendiente:** incorporar un domicilio de contacto autorizado por el responsable.

## Datos que tratamos y para qué

- Al crear una cuenta, recibimos nombre, apellido, correo electrónico y una contraseña que se guarda como hash, o los datos básicos que Google entrega al iniciar sesión con esa opción. Usamos estos datos para autenticar la cuenta y mostrar su perfil.
- Si la persona permite la ubicación, la app consulta su posición para mostrar información de su zona y obtener un nombre de lugar. El servicio de geocodificación recibe coordenadas aproximadas. Un reporte que la persona decide publicar guarda la ubicación y coordenadas del lugar reportado.
- Si la persona envía un reporte, guardamos su tipo, descripción, fecha, ubicación, respuestas vecinales y las fotos que adjunte. Los reportes activos pueden mostrarse a otras personas en el mapa. Las fotos pasan por moderación antes de aparecer públicamente.
- La foto de perfil que la persona elija se guarda para mostrarla en su cuenta.
- El servidor registra datos técnicos mínimos de las solicitudes y errores para operar y proteger el servicio, sin registrar los parámetros de consulta en el log HTTP de la aplicación.

## Servicios que intervienen

Usamos MongoDB Atlas para almacenar datos de la aplicación, Amazon S3 para fotos de reportes, Google para el inicio de sesión opcional, OpenStreetMap/Nominatim para geocodificación y proveedores de mapas base para mostrar el mapa. Las solicitudes a estos servicios pueden transmitir los datos necesarios para prestar cada función, incluida una ubicación aproximada al geocodificar.

## Conservación y eliminación

Los datos de cuenta se conservan mientras la cuenta esté activa. Al solicitar su eliminación desde la app, el backend borra el registro de cuenta y los reportes propios, y anonimiza las respuestas hechas en reportes ajenos. Las fotos se eliminan o quedan en una cola de reintento si falla el almacenamiento.

Los reportes activos se conservan mientras el incidente siga vigente. Los reportes cerrados con fecha de cierre registrada se eliminan a los 12 meses; los rechazados por moderación, a los 30 días. Las fotos se eliminan con el reporte o antes si se rechazan. Los reportes que elimina su autor se retiran de inmediato. Para que estos plazos se apliquen en producción hay que activar `RETENCION_AUTOMATICA=true` después de revisar el resultado del comando de consulta. Los reportes cerrados antiguos sin fecha de cierre requieren revisión manual antes de entrar en el proceso.

La eliminación automática por 24 meses de inactividad no está habilitada en esta versión porque aún no existe un servicio para enviar el aviso previo. Definir también el plazo de conservación de los registros técnicos del servidor antes de publicar.

## Derechos y permisos

La persona puede solicitar información, acceso, rectificación, actualización o supresión de sus datos a contacto@alertarapp.com.ar. Puede retirar el permiso de ubicación en la app o en la configuración del dispositivo; esto limita las funciones que dependen de la posición. Si considera que no obtuvo una respuesta adecuada, puede acudir a la Agencia de Acceso a la Información Pública.

## Cambios

Si cambia el tratamiento de datos, publicaremos una versión actualizada de esta política con su fecha de vigencia.
