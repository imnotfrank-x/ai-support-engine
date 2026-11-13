import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isValidResult } from '../src/contract.js';

function createReport(env) {
  const timeout = env.GROQ_TIMEOUT_MS ?? 30000;
  return {
    mode: 'generative',
    provider: 'groq',
    timestamp: new Date().toISOString(),
    model: env.GROQ_MODEL ?? 'openai/gpt-oss-20b',
    config: {
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      model: env.GROQ_MODEL ?? 'openai/gpt-oss-20b',
      timeoutMs: Number.isFinite(Number(timeout)) ? Number(timeout) : timeout
    },
    metrics: {
      total: 0,
      attempted: 0,
      returned: 0,
      validFormat: 0,
      invalidFormat: 0,
      operationalErrors: 0,
      correct: 0,
      accuracyPercent: 0,
      formatValidPercent: 0
    },
    errors: [],
    results: []
  };
}

function serializeError(error) {
  const result = {
    name: typeof error?.name === 'string' ? error.name : 'Error',
    message: typeof error?.message === 'string' ? error.message : String(error)
  };
  // El motor decide si expone rawResponse; el runner no habilita ese diagnóstico.
  for (const key of ['code', 'status', 'statusCode', 'providerStatus', 'rawResponse']) {
    if (error?.[key] !== undefined) result[key] = error[key];
  }
  return result;
}

function finishReport(report, started) {
  const { metrics } = report;
  if (metrics.total) {
    metrics.accuracyPercent = 100 * metrics.correct / metrics.total;
    metrics.formatValidPercent = 100 * metrics.validFormat / metrics.total;
  }
  report.finishedAt = new Date().toISOString();
  report.durationMs = performance.now() - started;
  return report;
}

export async function collectEvidence({
  analyze,
  env = process.env,
  loadAnalyzer = () => import('../src/generative.js')
} = {}) {
  const started = performance.now();
  const report = createReport(env);
  let cases;
  try {
    cases = JSON.parse(await readFile(new URL('../tests/cases.json', import.meta.url), 'utf8'));
    if (!Array.isArray(cases) || !cases.length) throw new Error('No hay casos de referencia válidos.');
  } catch (error) {
    report.errors.push(serializeError(error));
    return finishReport(report, started);
  }
  report.metrics.total = cases.length;

  let initializationError;
  try {
    analyze ??= (await loadAnalyzer()).analyzeGenerative;
    if (typeof analyze !== 'function') throw new TypeError('src/generative.js debe exportar analyzeGenerative(message).');
  } catch (error) {
    initializationError = serializeError(error);
    report.errors.push(initializationError);
  }

  for (const sample of cases) {
    const caseStarted = performance.now();
    const result = {
      id: sample.id,
      kind: sample.kind,
      message: sample.message,
      expected: {
        category: sample.category,
        priority: sample.priority,
        requiresHumanReview: sample.requiresHumanReview
      },
      attempted: false,
      actual: null,
      validFormat: false,
      correct: false
    };
    if (initializationError) {
      result.error = initializationError;
      report.metrics.operationalErrors += 1;
    } else {
      try {
        result.attempted = true;
        report.metrics.attempted += 1;
        // Una sola llamada por caso, sin referencias, correcciones ni reintentos.
        const actual = await analyze(sample.message);
        result.actual = actual ?? null;
        report.metrics.returned += 1;
        result.validFormat = Boolean(isValidResult(actual, 'generative'));
        result.correct = result.validFormat
          && actual.category === sample.category
          && actual.priority === sample.priority
          && actual.requiresHumanReview === sample.requiresHumanReview;
        if (result.validFormat) {
          report.metrics.validFormat += 1;
        } else {
          report.metrics.invalidFormat += 1;
          result.error = {
            name: 'InvalidResultError',
            code: 'INVALID_RESULT',
            message: 'La salida no cumple el contrato generativo.'
          };
        }
        if (result.correct) report.metrics.correct += 1;
      } catch (error) {
        result.error = serializeError(error);
        report.metrics.operationalErrors += 1;
      }
    }
    result.durationMs = performance.now() - caseStarted;
    report.results.push(result);
  }
  return finishReport(report, started);
}

function parseOutput(args) {
  if (!args.length) return null;
  if (args.length === 2 && args[0] === '--output' && args[1].trim() && !args[1].startsWith('--')) {
    return resolve(args[1]);
  }
  const error = new Error('Uso: node scripts/generative-evidence.js [--output <ruta>]');
  error.code = 'INVALID_ARGUMENTS';
  throw error;
}

function toJson(report) {
  // Las salidas JSON del proveedor no cambian; valores no JSON quedan como diagnóstico.
  const ancestors = [];
  return `${JSON.stringify(report, function (key, value) {
    if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol') return String(value);
    if (value === undefined) return null;
    if (value === null || typeof value !== 'object') return value;
    while (ancestors.length && ancestors.at(-1) !== this) ancestors.pop();
    if (ancestors.includes(value)) return '[Circular]';
    ancestors.push(value);
    return value;
  }, 2)}\n`;
}

async function saveReport(output, json) {
  await mkdir(dirname(output), { recursive: true });
  const temporary = join(dirname(output), `.${basename(output)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, json, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    // Renombrar en el mismo directorio evita dejar evidencia parcialmente escrita.
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function main(args = process.argv.slice(2), options = {}) {
  const started = performance.now();
  let output;
  let report;
  try {
    output = parseOutput(args);
    report = await collectEvidence(options);
  } catch (error) {
    report = createReport(options.env ?? process.env);
    report.errors.push(serializeError(error));
    finishReport(report, started);
  }
  if (output) {
    try {
      await saveReport(output, toJson(report));
    } catch (error) {
      report.errors.push({
        ...serializeError(error),
        code: 'EVIDENCE_WRITE_FAILED',
        filesystemCode: error.code,
        path: output
      });
    }
  }
  const writeStdout = options.writeStdout ?? ((text) => new Promise((resolveWrite, reject) => {
    process.stdout.write(text, (error) => error ? reject(error) : resolveWrite());
  }));
  await writeStdout(toJson(report));
  return report.errors.length || report.metrics.operationalErrors || report.metrics.invalidFormat ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
