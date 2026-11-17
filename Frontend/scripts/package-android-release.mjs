import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const android = resolve(frontend, 'android');
const signing = resolve(android, 'release-signing/signing.properties');
const key = resolve(android, 'release-signing/release-key.jks');

if (!existsSync(signing) || !existsSync(key)) {
  console.error('Falta la firma de Android. Ejecutá node scripts/create-android-signing.mjs una sola vez y guardá una copia segura.');
  process.exit(1);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('node', ['scripts/build-android-release.mjs'], frontend);
run(resolve(frontend, 'node_modules/.bin/cap'), ['sync', 'android'], frontend);
run(resolve(android, 'gradlew'), ['assembleRelease'], android);
const apk = resolve(android, 'app/build/outputs/apk/release/app-release.apk');
if (!existsSync(apk)) {
  console.error('Gradle terminó sin producir un APK firmado.');
  process.exit(1);
}
const sha256 = createHash('sha256').update(readFileSync(apk)).digest('hex');
console.log(`APK firmado: ${apk}\nSHA-256: ${sha256}`);
