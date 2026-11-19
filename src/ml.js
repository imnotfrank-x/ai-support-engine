import { isValidResult, validateRequest } from './contract.js';
import { analyzeTraditional } from './traditional.js';

export class MlError extends Error {
  constructor(code, status, message) {
    super(message);
    this.name = 'MlError';
    this.code = code;
    this.status = status;
  }
}

const resultFields = ['category', 'priority', 'response', 'requiresHumanReview', 'mode'];

function configuration(env) {
  try {
    const url = new URL(env.ML_SERVICE_URL ?? 'http://127.0.0.1:8000/predict');
    const timeoutMs = Number(env.ML_TIMEOUT_MS ?? 5000);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash
      || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647) throw new Error();
    return { url: url.href, timeoutMs };
  } catch {
    throw new MlError('INVALID_CONFIG', 503, 'Configure ML_SERVICE_URL y ML_TIMEOUT_MS correctamente.');
  }
}

async function readBody(response) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 131072) {
        await reader.cancel();
        throw new MlError('INVALID_RESPONSE', 502, 'Respuesta del servicio ML demasiado grande.');
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    reader.releaseLock();
  }
}

export async function analyzeMl(message, { fetchImpl = globalThis.fetch, env = process.env } = {}) {
  const problem = validateRequest({ message, mode: 'ml' });
  if (problem) throw new TypeError(problem);
  const { url, timeoutMs } = configuration(env);
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      redirect: 'error',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim() }),
      signal
    });
    if (response.status === 503) {
      await response.body?.cancel();
      throw new MlError('ML_UNAVAILABLE', 503, 'El servicio ML no esta disponible.');
    }
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new MlError('INVALID_RESPONSE', 502, 'El servicio ML devolvio una respuesta inesperada.');
    }
    const text = await readBody(response);
    let result;
    try {
      result = JSON.parse(text);
      if (!isValidResult(result, 'ml') || Array.isArray(result)
        || Object.keys(result).length !== resultFields.length
        || !Object.keys(result).every(key => resultFields.includes(key))) throw new Error();
    } catch {
      throw new MlError('INVALID_RESPONSE', 502, 'La salida del servicio ML no cumple el contrato JSON.');
    }
    // Conserva las etiquetas del servicio; solo activa la revision humana.
    if (analyzeTraditional(message).category === 'SECURITY') result.requiresHumanReview = true;
    return result;
  } catch (error) {
    if (signal.aborted) throw new MlError('ML_TIMEOUT', 504, 'El servicio ML excedio el tiempo de espera.');
    if (error instanceof MlError) throw error;
    throw new MlError('ML_UNAVAILABLE', 503, 'No fue posible contactar al servicio ML.');
  }
}
