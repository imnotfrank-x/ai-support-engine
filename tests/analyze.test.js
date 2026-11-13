import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApp } from '../src/server.js';
import { isValidResult } from '../src/contract.js';
import { analyzeTraditional } from '../src/traditional.js';

const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
for (const sample of cases) {
  test(`tradicional ${sample.id}: ${sample.kind}`, () => {
    const result = analyzeTraditional(sample.message);
    assert.equal(result.category, sample.category);
    assert.equal(result.priority, sample.priority);
    assert.equal(result.requiresHumanReview, sample.requiresHumanReview);
    assert.ok(isValidResult(result, 'traditional'));
  });
}

test('contrato rechaza salidas generativas incompletas o inseguras', () => {
  const valid = { category: 'SECURITY', priority: 'HIGH', response: 'Requiere revision.', requiresHumanReview: true, mode: 'generative' };
  assert.ok(isValidResult(valid, 'generative'));
  for (const result of [null, {}, { ...valid, category: 'OTHER' }, { ...valid, priority: 'URGENT' }, { ...valid, response: '' }, { ...valid, requiresHumanReview: false }, { ...valid, mode: 'traditional' }]) {
    assert.equal(isValidResult(result, 'generative'), false);
  }
});

test('API HTTP valida entradas y entrega el motor tradicional', async (t) => {
  const server = createApp({ generative: async () => { throw new Error('Detalle privado'); } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/analyze`;
  const request = (body, headers = { 'Content-Type': 'application/json' }) => fetch(url, { method: 'POST', headers, body });

  for (const sample of cases) {
    const res = await request(JSON.stringify({ message: sample.message, mode: 'traditional' }));
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.category, sample.category);
    assert.equal(data.priority, sample.priority);
    assert.equal(data.requiresHumanReview, sample.requiresHumanReview);
    assert.ok(isValidResult(data, 'traditional'));
  }
  for (const body of ['{', 'null', '[]', '{}', JSON.stringify({ message: 4, mode: 'traditional' }), JSON.stringify({ message: ' ', mode: 'traditional' }), JSON.stringify({ message: 'hola', mode: 'other' }), JSON.stringify({ message: 'x'.repeat(4001), mode: 'traditional' })]) {
    const res = await request(body);
    assert.equal(res.status, 400);
    assert.equal(typeof (await res.json()).error, 'string');
  }
  assert.equal((await request('x'.repeat(17000))).status, 413);
  assert.equal((await request('{}', { 'Content-Type': 'text/plain' })).status, 415);
  const unavailable = await request(JSON.stringify({ message: 'No puedo iniciar sesión', mode: 'generative' }));
  assert.equal(unavailable.status, 500);
  assert.equal('category' in await unavailable.json(), false);
  const wrongMethod = await fetch(url);
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get('allow'), 'POST');
  assert.equal((await fetch(`${url}/other`)).status, 404);
});
