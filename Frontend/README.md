# Desarrollo local con Android

## APK de producción para la landing

El backend de producción debe estar accesible por HTTPS en una URL pública terminada en `/api`. El APK se construye con esa URL, no con la IP privada de desarrollo. La API debe permitir `https://localhost` en `CORS_ORIGINS`, que es el origen de la WebView Android configurada en Capacitor.

La primera vez, generar la firma con `node scripts/create-android-signing.mjs` desde `Frontend/`. Guardar una copia segura de **toda** la carpeta `android/release-signing/` fuera de esta computadora. Está excluida de Git. Todas las actualizaciones del APK deben usar la misma firma.

Con la URL definitiva disponible:

```sh
cd Frontend
ALERTAR_API_URL=https://api.alertar.example/api npm run package:android:release
```

Reemplazar el dominio de ejemplo por el real. El comando valida HTTPS, compila Angular, sincroniza Capacitor y crea `android/app/build/outputs/apk/release/app-release.apk` firmado. También imprime su SHA-256 para verificar el archivo publicado. Subir ese APK a la landing y probar la descarga e instalación en un teléfono real, seguido de login, mapa, permisos de ubicación y reportes contra la API de EC2. No publicar APKs creados con las configuraciones `development-android-*`.

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

Esto sirve Angular localmente para el navegador.

Para ver el mapa con reportes vecinales y fotos de muestra, sin backend ni AWS:

```sh
npm run start:mock
```

Abrir la dirección local que muestra Angular y navegar al mapa. El modo mock está aislado de producción y de los perfiles Android; las respuestas vecinales se muestran como no persistentes. Los tiles del mapa base siguen necesitando conexión a internet.

Para preparar los recursos que se instalarán en Android, ejecutar el perfil deseado y luego sincronizar Capacitor:

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
