import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { analyzeMl } from '../src/ml.js';
import { isValidResult } from '../src/contract.js';

const root = fileURLToPath(new URL('..', import.meta.url));

export async function collectMlEvidence({ analyze = analyzeMl, env = process.env, provenance } = {}) {
  const cases = JSON.parse(await readFile(new URL('../tests/cases.json', import.meta.url), 'utf8'));
  const started = performance.now();
  const report = {
    runId: randomUUID(), mode: 'ml', provider: 'local-fastapi',
    model: 'TF-IDF + LogisticRegression (category, priority)',
    timestamp: new Date().toISOString(),
    evaluatedCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' }).trim()),
    config: { endpoint: 'configured-on-server', timeoutMs: Number(env.ML_TIMEOUT_MS ?? 5000) },
    provenance: provenance ?? null,
    metrics: { total: cases.length, attempted: 0, returned: 0, validFormat: 0, invalidFormat: 0, operationalErrors: 0, classificationCorrect: 0, correct: 0 },
    errors: [], results: []
  };
  // No incluir credenciales, query ni ruta local absoluta en las evidencias.
  try {
    const endpoint = new URL(env.ML_SERVICE_URL ?? 'http://127.0.0.1:8000/predict');
    report.config.endpoint = `${endpoint.protocol}//${endpoint.host}${endpoint.pathname}`;
  } catch { /* El cliente registra INVALID_CONFIG para cada caso. */ }
  if (provenance === undefined) {
    try {
      const artifacts = env.ML_ARTIFACTS_DIR ?? fileURLToPath(new URL('../ml/artifacts/', import.meta.url));
      const files = ['category_model.joblib', 'priority_model.joblib', 'metrics.json'];
      const sha256 = {};
      for (const name of files) sha256[name] = createHash('sha256').update(await readFile(resolve(artifacts, name))).digest('hex');
      sha256['tickets.csv'] = createHash('sha256').update(await readFile(new URL('../ml/data/tickets.csv', import.meta.url))).digest('hex');
      report.provenance = { sha256, trainingMetrics: JSON.parse(await readFile(resolve(artifacts, 'metrics.json'), 'utf8')) };
    } catch {
      report.errors.push({ code: 'PROVENANCE_UNAVAILABLE', message: 'No se pudieron registrar los artefactos locales. Configure ML_ARTIFACTS_DIR si utiliza otra carpeta.' });
    }
  }
  for (const sample of cases) {
    const caseStarted = performance.now();
    const item = {
      id: sample.id, kind: sample.kind, message: sample.message,
      expected: { category: sample.category, priority: sample.priority, requiresHumanReview: sample.requiresHumanReview },
      attempted: true, actual: null, validFormat: false, classificationCorrect: false, correct: false
    };
    report.metrics.attempted++;
    try {
      item.actual = await analyze(sample.message, { env });
      report.metrics.returned++;
      item.validFormat = Boolean(isValidResult(item.actual, 'ml'));
      if (item.validFormat) {
        report.metrics.validFormat++;
        item.classificationCorrect = item.actual.category === sample.category && item.actual.priority === sample.priority;
        item.correct = item.classificationCorrect && item.actual.requiresHumanReview === sample.requiresHumanReview;
      } else {
        report.metrics.invalidFormat++;
        item.error = { code: 'INVALID_RESPONSE', message: 'El resultado no cumple el contrato ML.' };
      }
      if (item.classificationCorrect) report.metrics.classificationCorrect++;
      if (item.correct) report.metrics.correct++;
    } catch (error) {
      report.metrics.operationalErrors++;
      // Lista cerrada de diagnosticos: nunca copiar errores del transporte.
      item.error = error?.name === 'MlError'
        ? { code: error.code, status: error.status, message: error.message }
        : { code: 'ML_EVALUATION_ERROR', message: 'Fallo no controlado durante la evaluacion.' };
    }
    item.durationMs = performance.now() - caseStarted;
    report.results.push(item);
  }
  const { metrics } = report;
  metrics.accuracyPercent = 100 * metrics.correct / metrics.total;
  metrics.classificationPercent = 100 * metrics.classificationCorrect / metrics.total;
  metrics.formatValidPercent = 100 * metrics.validFormat / metrics.total;
  report.finishedAt = new Date().toISOString();
  report.durationMs = performance.now() - started;
  return report;
}

export async function main(args = process.argv.slice(2), options = {}) {
  let output;
  if (!args.length) output = resolve('evidence/ml-run-01.json');
  else if (args.length === 2 && args[0] === '--output' && args[1].trim() && !args[1].startsWith('--')) output = resolve(args[1]);
  else throw new Error('Uso: node scripts/ml-evidence.js [--output <archivo nuevo.json>]');
  try {
    await access(output);
    const error = new Error('La evidencia ya existe. Utilice otro nombre.');
    error.code = 'EEXIST';
    throw error;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const report = await collectMlEvidence(options);
  const json = JSON.stringify(report, null, 2) + '\n';
  const writeStdout = options.writeStdout ?? (text => process.stdout.write(text));
  await writeStdout(json);
  await mkdir(dirname(output), { recursive: true });
  // Evidencias previas son inmutables; una nueva corrida requiere otro nombre.
  await writeFile(output, json, { encoding: 'utf8', flag: 'wx' });
  return report.errors.length || report.metrics.operationalErrors || report.metrics.invalidFormat ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = await main(); }
  catch (error) { console.error(error.code === 'EEXIST' ? 'La evidencia ya existe. Utilice otro nombre con --output.' : error.message); process.exitCode = 1; }
}
