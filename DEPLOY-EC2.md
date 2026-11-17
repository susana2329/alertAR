# Entrega del backend AlertAR para EC2

Esta rama contiene únicamente el backend 1.0.0 que consume el APK. Miguel puede clonarla con `git clone --branch deploy/backend-ec2 --single-branch git@github.com:susana2329/alertAR.git /opt/alertar/backend`. La URL pública esperada es `https://api.alertarapp.com.ar/api`. El archivo `.env` con credenciales **no está incluido**.

## Preparación

1. Apuntar el registro DNS `api.alertarapp.com.ar` a la IP pública de EC2 y permitir entrada TCP 80/443 en el security group. Mantener el puerto Node 3000 cerrado al público.
2. Instalar Node.js 24 (versión usada para preparar y probar este paquete), npm y Nginx. Configurar TLS válido para `api.alertarapp.com.ar` antes de entregar el APK.
3. Extraer el paquete en un directorio estable, por ejemplo `/opt/alertar/backend`, y ejecutar allí `npm ci --omit=dev`.
4. Copiar `.env.example` a `.env`, completar las credenciales de MongoDB, JWT y Google por un canal seguro y restringir sus permisos al usuario del servicio. MongoDB Atlas debe permitir la IP de salida de EC2. Asociar a la instancia un rol IAM con permisos `s3:GetObject`, `s3:PutObject` y `s3:DeleteObject` sobre los objetos del bucket configurado. No colocar claves AWS en `.env`; el SDK obtiene las credenciales temporales del rol de EC2.
5. Mantener `HOST=127.0.0.1`, `PORT=3000` y `TRUST_PROXY_LOOPBACK=true` si Nginx es el único proxy de la misma instancia. `CORS_ORIGINS` debe incluir `https://localhost` para el APK Android; agregar los orígenes web reales que correspondan.

## Servicio

Ejemplo de unidad systemd en `/etc/systemd/system/alertar-backend.service`; sustituir usuario y ruta por los definitivos:

```ini
[Unit]
Description=AlertAR backend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=alertar
WorkingDirectory=/opt/alertar/backend
ExecStart=/usr/bin/node /opt/alertar/backend/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Tras instalarla: `sudo systemctl daemon-reload`, `sudo systemctl enable --now alertar-backend` y `sudo journalctl -u alertar-backend -f`. Confirmar en el log `mongodb_conectado` y `servidor_iniciado`.

## Proxy HTTPS

Nginx debe conservar el prefijo `/api` al enviar las solicitudes a Node. Ejemplo del bloque de ubicación dentro del servidor HTTPS de `api.alertarapp.com.ar`:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 16m;
}
```

El certificado y el bloque `listen 443 ssl` se configuran según la instalación de Nginx. `proxy_pass` no lleva una barra final: así `/api/inicio` llega como `/api/inicio`. Nginx debe reemplazar `X-Forwarded-For` recibido del cliente porque el backend confía en el proxy local para los límites de solicitudes.

## Comprobación y retención

Probar `curl -fsS https://api.alertarapp.com.ar/api/alertas/` desde fuera de EC2 y después login, mapa, ubicación y un reporte con foto desde el APK. Si el dominio no responde, comprobar DNS, TLS, security group, Nginx, servicio y conexión Atlas, en ese orden.

Antes de activar la retención, ejecutar en el directorio del backend `node scripts/procesar-retencion.js`. Solo consulta. Tras revisar el resultado y disponer de respaldo, configurar `RETENCION_AUTOMATICA=true` y reiniciar el servicio; el proceso corre al inicio y cada 24 horas. La consulta del 17/11/2026 dio 0 candidatos y 0 limpiezas pendientes. Los reportes cerrados anteriores sin `fechaCierre` requieren revisión manual. La eliminación automática de cuentas inactivas sigue desactivada porque no existe servicio de correo para avisar antes.
