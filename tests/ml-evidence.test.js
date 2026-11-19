import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectMlEvidence, main } from '../scripts/ml-evidence.js';
import { MlError } from '../src/ml.js';
import { compareThree, toMarkdownThree } from '../scripts/compare-ml.js';
import { toCsv } from '../scripts/compare.js';

const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
const actual = sample => ({ category: sample.category, priority: sample.priority, requiresHumanReview: sample.requiresHumanReview, response: 'Solo prueba, no evidencia real.', mode: 'ml' });

test('evidencia ML: evalua doce casos una vez y secuencialmente sin pasar referencias', async () => {
  let active = false;
  let index = 0;
  const report = await collectMlEvidence({ env: {}, provenance: { testing: true }, analyze: async (message, options) => {
    assert.equal(active, false);
    active = true;
    const sample = cases[index++];
    assert.equal(message, sample.message);
    assert.deepEqual(options, { env: {} });
    await new Promise(resolve => setTimeout(resolve, 1));
    active = false;
    return actual(sample);
  } });
  assert.equal(index, 12);
  assert.equal(report.mode, 'ml');
  assert.equal(report.metrics.total, 12);
  assert.equal(report.metrics.attempted, 12);
  assert.equal(report.metrics.classificationCorrect, 12);
  assert.equal(report.metrics.correct, 12);
  assert.equal(report.metrics.classificationPercent, 100);
  assert.equal(report.metrics.formatValidPercent, 100);
  assert.match(report.evaluatedCommit, /^[a-f0-9]{40}$/);
  assert.equal(new Date(report.timestamp).toISOString(), report.timestamp);
});

test('evidencia ML: conserva desaciertos y errores sin reducir el denominador', async () => {
  let index = 0;
  const report = await collectMlEvidence({ env: {}, provenance: {}, analyze: async () => {
    const sample = cases[index++];
    if (sample.id === 1) throw new MlError('ML_TIMEOUT', 504, 'Tiempo agotado.');
    if (sample.id === 2) return { ...actual(sample), category: 'BUG' };
    if (sample.id === 3) return { ...actual(sample), response: '' };
    return actual(sample);
  } });
  assert.equal(index, 12);
  assert.equal(report.metrics.operationalErrors, 1);
  assert.equal(report.metrics.invalidFormat, 1);
  assert.equal(report.metrics.classificationCorrect, 9);
  assert.equal(report.metrics.classificationPercent, 75);
  assert.equal(report.metrics.accuracyPercent, 75);
  assert.equal(report.results[0].error.code, 'ML_TIMEOUT');
  assert.equal(report.results[1].actual.category, 'BUG');
  assert.equal(report.results[2].actual.response, '');
});

test('evidencia ML: sanea diagnosticos no controlados y URL en metadatos', async () => {
  const report = await collectMlEvidence({ env: { ML_SERVICE_URL: 'http://user:private@localhost/predict?key=secret' }, provenance: {}, analyze: async () => { throw new Error('private secret'); } });
  const json = JSON.stringify(report);
  assert.equal(json.includes('private'), false);
  assert.equal(json.includes('secret'), false);
  assert.equal(report.results[0].error.code, 'ML_EVALUATION_ERROR');
});

test('evidencia ML: guarda JSON aun con fallos y no sobrescribe corridas', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'ml-evidence-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = join(directory, 'evidence.json');
  const options = { env: {}, provenance: {}, analyze: async () => { throw new MlError('ML_UNAVAILABLE', 503, 'Servicio apagado.'); }, writeStdout: () => {} };
  assert.equal(await main(['--output', output], options), 1);
  const saved = await readFile(output, 'utf8');
  assert.equal(JSON.parse(saved).metrics.operationalErrors, 12);
  await assert.rejects(main(['--output', output], options), { code: 'EEXIST' });
  assert.equal(await readFile(output, 'utf8'), saved);
  await assert.rejects(main(['--wrong'], options), /Uso:/);
});

function reports() {
  return Object.fromEntries(['traditional', 'generative', 'ml'].map(mode => [mode, {
    mode, results: cases.map(sample => ({ id: sample.id, kind: sample.kind, message: sample.message,
      expected: { category: sample.category, priority: sample.priority, requiresHumanReview: sample.requiresHumanReview },
      actual: { ...actual(sample), mode } }))
  }]));
}

test('comparacion triple: genera 36 filas sin alterar entradas ni modos', () => {
  const r = reports();
  const original = structuredClone(r);
  r.ml.results.reverse();
  original.ml.results.reverse();
  const comparison = compareThree(r.traditional, r.generative, r.ml, cases);
  assert.equal(comparison.rows.length, 36);
  assert.equal(comparison.metrics.ml.classificationPercent, 100);
  assert.ok(comparison.rows.filter(row => row.mode === 'ml').every(row => row.actual.mode === 'ml'));
  assert.deepEqual(r, original);
  assert.equal(toCsv(comparison).trim().split('\r\n').length, 37);
  const md = toMarkdownThree(comparison, []);
  assert.match(md, /comparison|Comparación/);
  assert.ok(md.split('## Conclusión')[1].trim().split(/\s+/).length <= 150);
});

test('comparacion triple: conserva errores y separa revision de clasificacion', () => {
  const r = reports();
  r.ml.results[0].actual = null;
  r.ml.results[0].error = { code: 'ML_UNAVAILABLE', message: 'Servicio apagado.' };
  r.ml.results[1].actual.requiresHumanReview = true;
  const m = compareThree(r.traditional, r.generative, r.ml, cases).metrics.ml;
  assert.equal(m.total, 12);
  assert.equal(m.classificationCorrect, 11);
  assert.equal(m.fullMatch, 10);
  assert.equal(m.errors, 1);
});

test('comparacion triple: rechaza evidencia ausente, duplicada o de otro modo', () => {
  const r = reports();
  assert.throws(() => compareThree(r.traditional, r.generative, undefined, cases), /requerida/);
  r.ml.results[0].actual.mode = 'generative';
  assert.equal(compareThree(r.traditional, r.generative, r.ml, cases).metrics.ml.invalidFormat, 1);
  r.ml.results.push(r.ml.results[0]);
  assert.throws(() => compareThree(r.traditional, r.generative, r.ml, cases), /duplicados/);
});
