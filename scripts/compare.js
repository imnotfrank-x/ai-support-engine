import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isValidResult } from '../src/contract.js';

const fields = ['category', 'priority', 'requiresHumanReview'];
const columns = ['Caso', 'Tipo', 'Motor', 'Categoría esperada', 'Prioridad esperada', 'Categoría obtenida', 'Prioridad obtenida', 'Revisión esperada', 'Revisión obtenida', 'Formato válido', 'Clasificación correcta', 'Coincidencia completa', 'Error'];

export function compare(traditional, generative, cases, ml) {
  if (!Array.isArray(cases) || !cases.length || new Set(cases.map(c => c.id)).size !== cases.length) {
    throw new Error('Referencias vacías o duplicadas.');
  }
  const rows = [];
  const metrics = {};
  const reports = [['traditional', traditional], ['generative', generative]];
  if (ml !== undefined) reports.push(['ml', ml]);
  for (const [mode, report] of reports) {
    if (report?.mode !== mode || !Array.isArray(report.results)) throw new Error(`Evidencia inválida: ${mode}.`);
    const indexed = new Map(report.results.map(r => [r.id, r]));
    if (indexed.size !== report.results.length) throw new Error(`Casos duplicados: ${mode}.`);
    if (indexed.size !== cases.length) throw new Error(`Casos faltantes o adicionales: ${mode}.`);
    for (const sample of cases) {
      const result = indexed.get(sample.id);
      if (!result) throw new Error(`Caso faltante: ${mode}/${sample.id}.`);
      if (result.message !== sample.message || result.kind !== sample.kind || fields.some(f => result.expected?.[f] !== sample[f])) {
        throw new Error(`Mensaje, tipo o referencia diferente: ${mode}/${sample.id}.`);
      }
      // Recalcular desde la respuesta; no confiar en los indicadores guardados.
      const validFormat = Boolean(isValidResult(result.actual, mode));
      const classificationCorrect = !result.error && validFormat
        && result.actual.category === sample.category && result.actual.priority === sample.priority;
      const fullMatch = classificationCorrect && result.actual.requiresHumanReview === sample.requiresHumanReview;
      rows.push({ id: sample.id, kind: sample.kind, mode, expected: result.expected, actual: result.actual,
        validFormat, classificationCorrect, fullMatch,
        error: result.error ? [result.error.code, result.error.message ?? 'Error registrado'].filter(Boolean).join(': ') : '' });
    }
    const group = rows.filter(r => r.mode === mode);
    const classificationCorrect = group.filter(r => r.classificationCorrect).length;
    const fullMatch = group.filter(r => r.fullMatch).length;
    metrics[mode] = { total: cases.length, classificationCorrect, fullMatch,
      classificationPercent: 100 * classificationCorrect / cases.length,
      fullMatchPercent: 100 * fullMatch / cases.length,
      errors: group.filter(r => r.error).length,
      invalidFormat: group.filter(r => !r.validFormat).length };
  }
  return { rows, metrics };
}

function cells(row) {
  const yesNo = value => value == null ? 'Sin respuesta' : value ? 'Sí' : 'No';
  return [row.id, row.kind, row.mode, row.expected.category, row.expected.priority,
    row.actual?.category ?? '', row.actual?.priority ?? '', yesNo(row.expected.requiresHumanReview),
    yesNo(row.actual?.requiresHumanReview), yesNo(row.validFormat), yesNo(row.classificationCorrect), yesNo(row.fullMatch), row.error];
}

export function toCsv(comparison) {
  const escape = value => `"${String(value).replaceAll('"', '""')}"`;
  return [columns, ...comparison.rows.map(cells)].map(row => row.map(escape).join(',')).join('\r\n') + '\r\n';
}

export function toMarkdown(comparison, metadata) {
  const { traditional: t, generative: g } = comparison.metrics;
  const pct = n => n.toFixed(2) + '%';
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '&#124;').replace(/\r?\n/g, '<br>');
  const table = [columns, columns.map(() => '---'), ...comparison.rows.map(cells)]
    .map(row => '| ' + row.map(escape).join(' | ') + ' |').join('\n');
  const winner = t.classificationCorrect === g.classificationCorrect ? 'Ambos motores empataron en clasificaciones correctas.'
    : `El motor ${t.classificationCorrect > g.classificationCorrect ? 'tradicional' : 'generativo'} obtuvo más clasificaciones correctas.`;
  const special = (kind, mode) => {
    const rows = comparison.rows.filter(r => r.kind === kind && r.mode === mode);
    return `${rows.filter(r => r.classificationCorrect).length}/${rows.length}`;
  };
  return `# Comparación de motores\n\nFecha de generación UTC: ${metadata.generatedAt}\n\nModelo configurado: ${escape(metadata.model)}\n\nEvidencias y commits evaluados:\n${metadata.sources.map(s => `- ${escape(s.file)} — commit: ${escape(s.commit ?? 'no registrado')}; fecha: ${escape(s.timestamp ?? 'no registrada')}`).join('\n')}\n\nClasificación correcta = formato válido, sin error, categoría y prioridad correctas. Coincidencia completa añade revisión humana correcta; equivale al indicador \`correct\` de los runners. Se recalculan ambas métricas con el mismo criterio. Todos los casos, incluidos errores y respuestas inválidas, permanecen en el denominador.\n\n| Motor | Clasificaciones correctas | Coincidencias completas | Errores registrados | Formatos inválidos |\n| --- | --- | --- | --- | --- |\n| traditional | ${t.classificationCorrect}/${t.total} (${pct(t.classificationPercent)}) | ${t.fullMatch}/${t.total} (${pct(t.fullMatchPercent)}) | ${t.errors} | ${t.invalidFormat} |\n| generative | ${g.classificationCorrect}/${g.total} (${pct(g.classificationPercent)}) | ${g.fullMatch}/${g.total} (${pct(g.fullMatchPercent)}) | ${g.errors} | ${g.invalidFormat} |\n\n${table}\n\n## Conclusión\n\n${winner} El tradicional obtuvo ${pct(t.classificationPercent)} y el generativo ${pct(g.classificationPercent)}. Al incluir revisión humana, las coincidencias completas fueron ${pct(t.fullMatchPercent)} y ${pct(g.fullMatchPercent)}, respectivamente. Ante ambigüedad lograron ${special('ambiguous', 'traditional')} y ${special('ambiguous', 'generative')}; ante manipulación, ${special('adversarial', 'traditional')} y ${special('adversarial', 'generative')}, respectivamente. Se registraron ${t.errors} errores tradicionales y ${g.errors} generativos; sus detalles aparecen en la tabla y los JSON. Los fallos operacionales o de formato cuentan como fallos de evaluación, sin demostrar por sí solos una mala clasificación del modelo. Doce casos sintéticos constituyen una muestra pequeña, sin estimar precisión en solicitudes nuevas ni garantizar resistencia general a manipulación. Las respuestas completas permanecen en las evidencias originales.\n`;
}

export async function main(args = process.argv.slice(2)) {
  if (args.length < 2 || args.length > 3) throw new Error('Uso: node scripts/compare.js <traditional.json> <generative.json> [directorio de salida]');
  const readJson = async file => JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  const [traditional, generative, cases] = await Promise.all([
    readJson(args[0]), readJson(args[1]), readJson(new URL('../tests/cases.json', import.meta.url))]);
  const comparison = compare(traditional, generative, cases);
  const metadata = { generatedAt: new Date().toISOString(), model: generative.model ?? 'no registrado',
    sources: [traditional, generative].map((r, i) => ({ file: args[i], commit: r.evaluatedCommit, timestamp: r.timestamp })) };
  const out = resolve(args[2] ?? 'evidence');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'comparison.csv'), toCsv(comparison), 'utf8');
  await writeFile(resolve(out, 'comparison.md'), toMarkdown(comparison, metadata), 'utf8');
  console.log(JSON.stringify(comparison.metrics, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
