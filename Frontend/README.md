# Desarrollo local con Android

## Direcciones de la API

- Navegador en la computadora: `http://localhost:3000/api` (configuración Angular `development`).
- Emulador Android: `http://10.0.2.2:3000/api` (`development-android-emulator`).
- Celular físico en la misma Wi-Fi: `http://192.168.1.39:3000/api` (`development-android-device`).
- Producción conserva `environment.prod.ts` y su URL relativa `/api`.

El perfil del celular apunta a una IP privada de desarrollo; no se usa en producción. Si cambia la IP de Fedora, actualizar `src/environments/environment.android-device.ts` y reconstruir.

## Iniciar y compilar

Desde `Frontend/`:

```sh
npm start
```

Esto sirve Angular localmente para el navegador. Para preparar los recursos que se instalarán en Android, ejecutar el perfil deseado y luego sincronizar Capacitor:

```sh
npm run build:android:device
npx cap sync android
```

Para un emulador, usar `npm run build:android:emulator` en lugar del primer comando. Luego abrir Android Studio (`npx cap open android`) y ejecutar la variante **debug** en el dispositivo/emulador. El manifest de `debug` habilita HTTP solo para builds de desarrollo; la variante `release` lo deshabilita explícitamente.

Desde `../backend/`:

```sh
npm run dev
```

El backend usa el puerto `3000` (verificado en `../backend/.env`). `npm run dev` lo inicia en `0.0.0.0`; el valor por defecto del listener se mantiene igual que antes para los demás entornos. No cambiar variables ni recursos de AWS para esta prueba local.

## Firewall Fedora

Si `firewalld` está activo, averiguar la zona Wi-Fi y abrir el puerto temporalmente (no desactivar el firewall):

```sh
sudo firewall-cmd --get-active-zones
sudo firewall-cmd --zone=<zona-wifi> --add-port=3000/tcp
```

Para cerrar el acceso al terminar:

```sh
sudo firewall-cmd --zone=<zona-wifi> --remove-port=3000/tcp
```

La regla anterior es de ejecución y no sobrevive un reinicio. Si `firewalld` no está activo o la regla ya existe, no hace falta agregarla.

## Comprobar desde el celular

1. Verificar que Fedora y el celular estén conectados a la misma red y que el backend siga ejecutándose.
2. En el navegador del celular abrir `http://192.168.1.39:3000/api/inicio`. Una respuesta HTTP (incluso un error JSON de aplicación) confirma que hay conectividad con el servidor; un error de conexión apunta a la IP, el listener, la Wi-Fi o el firewall.
3. Abrir la app Android instalada como debug, con los recursos construidos mediante `build:android:device`. Para depurar solicitudes se puede inspeccionar Logcat/Chrome DevTools.

La API mantiene sus endpoints y contratos actuales. CORS admite únicamente los orígenes de desarrollo declarados en el backend y el origen local de Capacitor; CORS no reemplaza la regla de firewall ni es un mecanismo de autenticación.
