import test from 'node:test';
import assert from 'node:assert/strict';
import { compare, toCsv, toMarkdown } from '../scripts/compare.js';

function fixture() {
  const sample = { id: 1, kind: 'normal', message: 'No puedo entrar', category: 'ACCESS', priority: 'MEDIUM', requiresHumanReview: false };
  const expected = { category: sample.category, priority: sample.priority, requiresHumanReview: false };
  const report = mode => ({ mode, results: [{ ...sample, expected: { ...expected }, actual: { ...expected, response: 'Restablece tu acceso', mode } }] });
  return { cases: [sample], traditional: report('traditional'), generative: report('generative') };
}
const run = f => compare(f.traditional, f.generative, f.cases);

test('comparación: caso correcto y métricas recalculadas', () => {
  const f = fixture();
  f.generative.results[0].correct = false;
  assert.equal(run(f).metrics.generative.fullMatchPercent, 100);
});
for (const [field, value] of [['category', 'BUG'], ['priority', 'HIGH']]) {
  test(`comparación: ${field} incorrecta`, () => {
    const f = fixture();
    f.generative.results[0].actual[field] = value;
    assert.equal(run(f).metrics.generative.classificationPercent, 0);
  });
}
test('comparación: revisión humana distingue ambas métricas', () => {
  const f = fixture();
  f.generative.results[0].actual.requiresHumanReview = true;
  const m = run(f).metrics.generative;
  assert.equal(m.classificationPercent, 100);
  assert.equal(m.fullMatchPercent, 0);
});
test('comparación: error del proveedor conserva el denominador', () => {
  const f = fixture();
  f.generative.results[0].actual = null;
  f.generative.results[0].error = { code: 'TIMEOUT', message: 'Tiempo agotado' };
  const m = run(f).metrics.generative;
  assert.equal(m.total, 1);
  assert.equal(m.classificationPercent, 0);
  assert.equal(m.errors, 1);
});
test('comparación: contrato inválido aunque los indicadores digan correcto', () => {
  const f = fixture();
  f.generative.results[0].actual.response = '';
  f.generative.results[0].validFormat = true;
  f.generative.results[0].correct = true;
  assert.equal(run(f).metrics.generative.classificationPercent, 0);
});
test('comparación: rechaza casos faltantes y duplicados', () => {
  const f = fixture();
  f.generative.results.push(structuredClone(f.generative.results[0]));
  assert.throws(() => run(f), /duplicados/);
  f.generative.results = [];
  assert.throws(() => run(f), /faltantes/);
});
test('comparación: rechaza mensajes y referencias diferentes', () => {
  for (const modify of [r => r.message = 'Otro', r => r.expected.priority = 'LOW', r => r.id = 2]) {
    const f = fixture();
    modify(f.generative.results[0]);
    assert.throws(() => run(f), /diferente|faltante/);
  }
});
test('comparación: une por id aunque cambie el orden y produce 24 filas', () => {
  const f = fixture();
  f.cases = Array.from({ length: 12 }, (_, i) => ({ ...f.cases[0], id: i + 1 }));
  for (const mode of ['traditional', 'generative']) {
    f[mode].results = f.cases.map(c => ({ ...structuredClone(f[mode].results[0]), id: c.id }));
  }
  f.generative.results.reverse();
  const comparison = run(f);
  assert.equal(comparison.rows.length, 24);
  assert.equal(toCsv(comparison).trim().split('\r\n').length, 25);
  const md = toMarkdown(comparison, { generatedAt: 'test', model: 'test', sources: [] });
  assert.match(md, /100.00%/);
  assert.ok(md.split('## Conclusión')[1].trim().split(/\s+/).length <= 150);
});
test('comparación: escapa delimitadores en CSV y Markdown', () => {
  const f = fixture();
  f.generative.results[0].error = { message: 'Error, "prueba" | <script>\nsiguiente' };
  const c = run(f);
  assert.match(toCsv(c), /""prueba""/);
  assert.match(toMarkdown(c, { generatedAt: '', model: '', sources: [] }), /&#124; &lt;script&gt;<br>/);
});
