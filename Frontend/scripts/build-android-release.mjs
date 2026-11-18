import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiUrl = process.env.ALERTAR_API_URL?.replace(/\/$/, '');

if (!apiUrl || !/^https:\/\/[^/\s]+\/api$/.test(apiUrl) || /example\.(com|org|net)|localhost|127\.0\.0\.1/.test(apiUrl)) {
  console.error('Definí ALERTAR_API_URL con una URL HTTPS pública que termine en /api.');
  process.exit(1);
}

const ng = resolve(frontend, 'node_modules/.bin/ng');
const resultado = spawnSync(ng, [
  'build', '--configuration', 'production,production-android',
  '--define', `ALERTAR_API_URL=${JSON.stringify(apiUrl)}`
], { cwd: frontend, stdio: 'inherit' });

if (resultado.error) throw resultado.error;
process.exit(resultado.status ?? 1);
