import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createApp } from '../src/server.js';

// Servidor y peticiones HTTP reales; sin sustitución del proveedor generativo.
const args = process.argv.slice(2);
if (args.length !== 1) throw new Error('Uso: node scripts/api-evidence.js <archivo.json>');
const output = resolve(args[0]);
const server = createApp();
await new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveListen);
});
const endpoint = `http://127.0.0.1:${server.address().port}/api/analyze`;
const report = { timestamp: new Date().toISOString(),
  evaluatedCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' }).trim(),
  model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b', results: [] };
try {
  for (const body of [
    { message: 'No puedo iniciar sesion', mode: 'traditional' },
    { message: 'No puedo iniciar sesion', mode: 'generative' },
    { message: '', mode: 'traditional' }
  ]) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    report.results.push({ request: { endpoint, method: 'POST', body }, status: response.status, response: await response.json() });
  }
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(`Evidencia HTTP guardada en ${output}`);
} finally {
  server.closeAllConnections();
  await new Promise(resolveClose => server.close(resolveClose));
}
