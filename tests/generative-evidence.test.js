import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { collectEvidence, main } from '../scripts/generative-evidence.js';

const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
const validResult = {
  category: 'BUG',
  priority: 'MEDIUM',
  response: 'Respuesta de prueba, no es evidencia del modelo.',
  requiresHumanReview: false,
  mode: 'generative'
};

async function invoke(args = [], options = {}) {
  let stdout = '';
  const exitCode = await main(args, {
    env: {},
    ...options,
    writeStdout: (text) => { stdout += text; }
  });
  return { exitCode, stdout, report: JSON.parse(stdout) };
}

async function temporaryDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), 'generative-evidence-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('evidencia: usa los 12 mensajes secuencialmente, sin referencias ni reintentos', async () => {
  const calls = [];
  const responses = [];
  let active = 0;
  const report = await collectEvidence({
    env: {},
    analyze: async (...args) => {
      assert.equal(active, 0);
      active += 1;
      calls.push(args);
      await new Promise((resolve) => setTimeout(resolve, 1));
      const response = { ...validResult, response: `Respuesta de prueba ${calls.length}` };
      responses.push(response);
      active -= 1;
      return response;
    }
  });
  assert.equal(cases.length, 12);
  assert.deepEqual(calls, cases.map((sample) => [sample.message]));
  assert.deepEqual(report.results.map((result) => result.actual), responses);
  assert.deepEqual(report.results.map((result) => result.expected), cases.map((sample) => ({
    category: sample.category, priority: sample.priority, requiresHumanReview: sample.requiresHumanReview
  })));
  assert.deepEqual(report.config, { endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-20b', timeoutMs: 30000 });
  assert.equal(report.provider, 'groq');
  assert.equal(report.model, 'openai/gpt-oss-20b');
  assert.equal(new Date(report.timestamp).toISOString(), report.timestamp);
  assert.equal(new Date(report.finishedAt).toISOString(), report.finishedAt);
  assert.ok(report.durationMs >= 0);
  assert.ok(report.results.every((result) => result.durationMs >= 0 && result.attempted));
  assert.equal(report.metrics.total, 12);
  assert.equal(report.metrics.attempted, 12);
  assert.equal(report.metrics.validFormat, 12);
});

test('evidencia: una clasificación errónea válida no provoca exitCode de error', async () => {
  const { exitCode, report } = await invoke([], { analyze: async () => ({ ...validResult }) });
  assert.equal(exitCode, 0);
  assert.deepEqual(report.errors, []);
  assert.equal(report.results[0].validFormat, true);
  assert.equal(report.results[0].correct, false);
  assert.equal(report.results[0].actual.category, 'BUG');
  assert.equal('error' in report.results[0], false);
  assert.equal(report.metrics.correct, 2);
  assert.equal(report.metrics.accuracyPercent, 100 * 2 / 12);
  assert.equal(report.metrics.formatValidPercent, 100);
});

test('evidencia: conserva errores, raw opt-in y salidas inválidas, y continúa todos los casos', async () => {
  let calls = 0;
  const invalid = { ...validResult, category: 'SECURITY', requiresHumanReview: false, extra: 'sin corregir' };
  const timeout = Object.assign(new Error('Tiempo agotado'), {
    code: 'PROVIDER_TIMEOUT', statusCode: 504, rawResponse: '{"response":"salida original del proveedor"}'
  });
  const { exitCode, report } = await invoke([], {
    analyze: async () => {
      calls += 1;
      if (calls === 2) throw timeout;
      if (calls === 3) return invalid;
      if (calls === 4) return undefined;
      if (calls === 5) throw 'Proveedor no disponible';
      return { ...validResult };
    }
  });
  assert.equal(exitCode, 1);
  assert.equal(calls, 12);
  assert.equal(report.results.length, 12);
  assert.deepEqual(report.results[1].error, {
    name: 'Error', message: 'Tiempo agotado', code: 'PROVIDER_TIMEOUT', statusCode: 504,
    rawResponse: timeout.rawResponse
  });
  assert.equal(report.results[1].actual, null);
  assert.deepEqual(report.results[2].actual, invalid);
  assert.equal(report.results[2].validFormat, false);
  assert.equal(report.results[2].correct, false);
  assert.equal(report.results[2].error.code, 'INVALID_RESULT');
  assert.equal(report.results[3].actual, null);
  assert.equal(report.results[3].error.code, 'INVALID_RESULT');
  assert.equal(report.results[4].error.message, 'Proveedor no disponible');
  assert.equal(report.results[11].validFormat, true);
  assert.equal(report.metrics.returned, 10);
  assert.equal(report.metrics.validFormat, 8);
  assert.equal(report.metrics.invalidFormat, 2);
  assert.equal(report.metrics.operationalErrors, 2);
  assert.equal(report.metrics.accuracyPercent, 100 * report.metrics.correct / 12);
  assert.equal(report.metrics.formatValidPercent, 100 * 8 / 12);
});

test('evidencia: registra configuración explícita sin modificar el entorno ni habilitar raw', async () => {
  const env = { GROQ_API_KEY: 'test-secret-never-record', GROQ_MODEL: 'otro-modelo', GROQ_TIMEOUT_MS: '9000' };
  const original = { ...env };
  const { report } = await invoke([], {
    env,
    analyze: async () => { throw Object.assign(new Error('No disponible'), { status: 503 }); }
  });
  assert.deepEqual(report.config, { endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'otro-modelo', timeoutMs: 9000 });
  assert.equal(JSON.stringify(report).includes(env.GROQ_API_KEY), false);
  assert.equal(report.model, 'otro-modelo');
  assert.equal(report.results[0].error.status, 503);
  assert.equal('rawResponse' in report.results[0].error, false);
  assert.deepEqual(env, original);
});

test('evidencia: carga el export analyzeGenerative de forma diferida', async () => {
  let loads = 0;
  let calls = 0;
  const { exitCode } = await invoke([], {
    loadAnalyzer: async () => {
      loads += 1;
      return { analyzeGenerative: async () => { calls += 1; return { ...validResult }; } };
    }
  });
  assert.equal(exitCode, 0);
  assert.equal(loads, 1);
  assert.equal(calls, 12);
});

test('evidencia: un motor ausente o sin export no fabrica resultados ni aborta el JSON', async () => {
  for (const loadAnalyzer of [
    async () => { throw Object.assign(new Error('Motor ausente'), { code: 'ERR_MODULE_NOT_FOUND' }); },
    async () => ({})
  ]) {
    const { exitCode, report } = await invoke([], { loadAnalyzer });
    assert.equal(exitCode, 1);
    assert.equal(report.results.length, 12);
    assert.equal(report.metrics.attempted, 0);
    assert.equal(report.metrics.operationalErrors, 12);
    assert.equal(report.metrics.correct, 0);
    assert.equal(report.errors.length, 1);
    assert.ok(report.results.every((result) => !result.attempted && !result.validFormat && !result.correct && result.actual === null && result.error));
  }
});

test('evidencia: --output crea directorios y guarda el mismo JSON completo aunque haya fallos', async (t) => {
  const directory = await temporaryDirectory(t);
  const output = join(directory, 'carpeta con espacios', 'evidencia-á.json');
  let calls = 0;
  const { exitCode, stdout, report } = await invoke(['--output', output], {
    analyze: async () => {
      calls += 1;
      if (calls === 2) throw new Error('Fallo simulado, no es una llamada real');
      if (calls === 3) return { ...validResult, response: '' };
      return { ...validResult };
    }
  });
  assert.equal(exitCode, 1);
  assert.equal(await readFile(output, 'utf8'), stdout);
  assert.equal(report.results.length, 12);
  assert.equal(report.metrics.operationalErrors, 1);
  assert.equal(report.metrics.invalidFormat, 1);
  assert.deepEqual(await readdir(join(directory, 'carpeta con espacios')), ['evidencia-á.json']);
  const replacement = await invoke(['--output', output], { analyze: async () => ({ ...validResult }) });
  assert.equal(replacement.exitCode, 0);
  assert.equal(await readFile(output, 'utf8'), replacement.stdout);
});

test('evidencia: fallo de escritura o renombrado conserva stdout y limpia temporales', async (t) => {
  const directory = await temporaryDirectory(t);
  const blocker = join(directory, 'archivo');
  const existingDirectory = join(directory, 'directorio');
  await writeFile(blocker, 'No sobrescribir');
  await mkdir(existingDirectory);
  for (const output of [join(blocker, 'evidencia.json'), existingDirectory]) {
    const { exitCode, report } = await invoke(['--output', output], { analyze: async () => ({ ...validResult }) });
    assert.equal(exitCode, 1);
    assert.equal(report.results.length, 12);
    assert.equal(report.metrics.returned, 12);
    assert.equal(report.errors[0].code, 'EVIDENCE_WRITE_FAILED');
    assert.equal(report.errors[0].path, output);
    assert.equal(typeof report.errors[0].filesystemCode, 'string');
  }
  assert.equal(await readFile(blocker, 'utf8'), 'No sobrescribir');
  assert.deepEqual((await readdir(directory)).sort(), ['archivo', 'directorio']);
});

test('evidencia: argumentos inválidos fallan sin invocar el motor', async () => {
  for (const args of [['--output'], ['--output', ''], ['--other'], ['--output', '--other'], ['--output', 'file.json', 'extra']]) {
    const { exitCode, report } = await invoke(args, {
      analyze: async () => { assert.fail('No debe llamarse al motor'); }
    });
    assert.equal(exitCode, 1);
    assert.equal(report.errors[0].code, 'INVALID_ARGUMENTS');
    assert.deepEqual(report.results, []);
  }
});

test('evidencia: diagnósticos no JSON no impiden conservar los otros resultados', async () => {
  const raw = { value: 1n };
  raw.self = raw;
  const { exitCode, report } = await invoke([], {
    analyze: async () => { throw Object.assign(new Error('Diagnóstico de prueba'), { rawResponse: raw }); }
  });
  assert.equal(exitCode, 1);
  assert.equal(report.results.length, 12);
  assert.deepEqual(report.results[0].error.rawResponse, { value: '1', self: '[Circular]' });
});

test('evidencia: el entrypoint CLI emite solo JSON y devuelve exitCode no cero', async (t) => {
  const directory = await temporaryDirectory(t);
  const script = fileURLToPath(new URL('../scripts/generative-evidence.js', import.meta.url));
  await assert.rejects(promisify(execFile)(process.execPath, [script, '--unknown'], { cwd: directory, timeout: 10000 }), (error) => {
    assert.equal(error.code, 1);
    assert.equal(error.stderr, '');
    const report = JSON.parse(error.stdout);
    assert.equal(report.errors[0].code, 'INVALID_ARGUMENTS');
    return true;
  });
});
