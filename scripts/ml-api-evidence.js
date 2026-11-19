import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createApp } from '../src/server.js';
import { isValidResult } from '../src/contract.js';

const args = process.argv.slice(2);
if (args.length !== 1) throw new Error('Uso: node scripts/ml-api-evidence.js <archivo nuevo.json>');
const server = createApp();
await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveListen); });
try {
  const endpoint = `http://127.0.0.1:${server.address().port}/api/analyze`;
  const report = {
    timestamp: new Date().toISOString(),
    evaluatedCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' }).trim(),
    architecture: 'HTTP -> Node.js gateway -> HTTP -> FastAPI -> trained ML models',
    results: []
  };
  for (const body of [
    { message: 'Alguien entro a mi cuenta sin autorizacion', mode: 'ml' },
    { message: 'Necesito ayuda con lo de ayer', mode: 'ml' },
    { message: '', mode: 'ml' }
  ]) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    const passed = body.message === '' ? response.status === 400
      : response.status === 200 && isValidResult(result, 'ml') && result.requiresHumanReview;
    report.results.push({ request: { endpoint, method: 'POST', body }, status: response.status, response: result, passed });
  }
  const output = resolve(args[0]);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(`Evidencia HTTP ML guardada en ${output}`);
  if (!report.results.every(item => item.passed)) process.exitCode = 1;
} finally {
  server.closeAllConnections();
  await new Promise(resolveClose => server.close(resolveClose));
}
