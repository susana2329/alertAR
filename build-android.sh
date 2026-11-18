#!/bin/bash
# build-android.sh — Compila e instala AlertAR en dispositivo físico
set -e

FRONTEND="$(cd "$(dirname "$0")/Frontend" && pwd)"
ADB="${ANDROID_HOME:-$HOME/Android/Sdk}/platform-tools/adb"
APK="$FRONTEND/android/app/build/outputs/apk/debug/app-debug.apk"

echo "▶ 1/3  Build Angular (android-device)..."
cd "$FRONTEND"
npm run build:android:device

echo "▶ 2/3  Capacitor sync..."
npx cap sync android

echo "▶ 3/3  Gradle assembleDebug..."
cd "$FRONTEND/android"
./gradlew assembleDebug

echo ""
echo "✅ APK generada: $APK"
echo ""

# Instalar si hay dispositivo conectado
if "$ADB" devices 2>/dev/null | grep -q "device$"; then
  echo "📱 Dispositivo detectado — instalando..."
  "$ADB" install -r "$APK"
  echo "✅ Instalación completada."
else
  echo "⚠️  No se detectó dispositivo vía ADB."
  echo "   Instalá la APK manualmente desde:"
  echo "   $APK"
fi
