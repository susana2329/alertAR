import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const android = resolve(dirname(fileURLToPath(import.meta.url)), '../android');
const folder = resolve(android, 'release-signing');
const key = resolve(folder, 'release-key.jks');
const properties = resolve(folder, 'signing.properties');

if (existsSync(key) || existsSync(properties)) {
  console.error('Ya existe material de firma. No se reemplazó.');
  process.exit(1);
}

mkdirSync(folder, { recursive: true, mode: 0o700 });
const password = randomBytes(32).toString('base64url');
const result = spawnSync('keytool', [
  '-genkeypair', '-keystore', key, '-storetype', 'PKCS12',
  '-alias', 'alertar', '-keyalg', 'RSA', '-keysize', '3072',
  '-validity', '10000', '-dname', 'CN=AlertAR,O=AlertAR,C=AR',
  '-storepass', password, '-keypass', password, '-noprompt'
], { stdio: 'pipe', encoding: 'utf8' });

if (result.error || result.status !== 0) {
  console.error(result.error?.message || result.stderr || 'No se pudo crear la clave.');
  process.exit(1);
}

writeFileSync(properties, `storePassword=${password}\nkeyAlias=alertar\nkeyPassword=${password}\n`, { mode: 0o600 });
chmodSync(key, 0o600);
console.log(`Clave creada en ${folder}. Hacé una copia segura de la carpeta completa: es necesaria para todas las actualizaciones futuras.`);
