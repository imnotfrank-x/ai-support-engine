import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { analyzeTraditional } from './traditional.js';
import { analyzeGenerative, GenerativeError } from './generative.js';
import { isValidResult, validateRequest } from './contract.js';

const MAX_BODY_BYTES = 16384;
const send = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};

export function createApp({ generative = analyzeGenerative } = {}) {
  return createServer(async (req, res) => {
    if (req.url !== '/api/analyze') return send(res, 404, { error: 'Ruta no encontrada.' });
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return send(res, 405, { error: 'Use POST.' });
    }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) {
      req.resume();
      return send(res, 415, { error: 'Use Content-Type: application/json.' });
    }
    try {
      let bytes = 0;
      const chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > MAX_BODY_BYTES) {
          send(res, 413, { error: 'Cuerpo demasiado grande.' });
          return;
        }
        chunks.push(chunk);
      }
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return send(res, 400, { error: 'JSON invalido.' });
      }
      const problem = validateRequest(body);
      if (problem) return send(res, 400, { error: problem });
      const result = body.mode === 'generative'
        ? await generative(body.message.trim())
        : analyzeTraditional(body.message.trim());
      if (!isValidResult(result, body.mode)) throw new Error('Contrato invalido');
      return send(res, 200, result);
    } catch (error) {
      if (!res.headersSent && !res.destroyed) {
        if (error instanceof GenerativeError) return send(res, error.status, { error: error.message });
        send(res, 500, { error: 'No fue posible analizar la solicitud.' });
      }
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '127.0.0.1';
  createApp().listen(port, host, () => console.log(`AI Support Engine: http://${host}:${port}`));
}
