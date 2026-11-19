import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compare, toCsv } from './compare.js';

// Reutiliza la validacion y las metricas anteriores sin modificar las evidencias.
export function compareThree(traditional, generative, ml, cases) {
  if (ml === undefined) throw new Error('Evidencia ML requerida.');
  return compare(traditional, generative, cases, ml);
}

export function toMarkdownThree(comparison, sources, generatedAt = new Date().toISOString()) {
  const pct = value => value.toFixed(2) + '%';
  const escape = value => String(value).replaceAll('|', '&#124;').replace(/[\r\n]/g, ' ');
  const modes = ['traditional', 'generative', 'ml'];
  const summary = modes.map(mode => {
    const m = comparison.metrics[mode];
    return `| ${mode} | ${m.classificationCorrect}/${m.total} (${pct(m.classificationPercent)}) | ${m.fullMatch}/${m.total} (${pct(m.fullMatchPercent)}) | ${m.errors} | ${m.invalidFormat} |`;
  }).join('\n');
  const rows = comparison.rows.map(row => `| ${row.id} | ${row.kind} | ${row.mode} | ${row.expected.category}/${row.expected.priority} | ${row.actual ? row.actual.category + '/' + row.actual.priority : 'Sin respuesta'} | ${row.expected.requiresHumanReview} | ${row.actual?.requiresHumanReview ?? 'Sin respuesta'} | ${row.validFormat} | ${row.classificationCorrect} | ${row.fullMatch} | ${escape(row.error)} |`).join('\n');
  const top = Math.max(...modes.map(mode => comparison.metrics[mode].classificationCorrect));
  const winners = modes.filter(mode => comparison.metrics[mode].classificationCorrect === top).join(' y ');
  return `# Comparación de los tres motores\n\nGenerada UTC: ${generatedAt}\n\n${sources.map(s => `- ${escape(s.file)}; modelo: ${escape(s.model ?? s.mode)}; commit: ${escape(s.evaluatedCommit ?? 'no registrado')}; fecha: ${escape(s.timestamp ?? 'no registrada')}`).join('\n')}\n\nLas dos corridas originales se conservan; no se volvieron a ejecutar ni se alteraron. ML usa los mismos doce mensajes y referencias, pero fue ejecutado en otra fecha. Los JSON registran la procedencia. La salida ML incluye la regla provisional por confianza de Python y la barrera de revisión humana de Node; no es la etiqueta cruda de los clasificadores.\n\nClasificación correcta: formato válido, sin error, categoría y prioridad correctas. Coincidencia completa añade revisión humana correcta. Errores y formatos inválidos permanecen en el denominador. Los porcentajes no evalúan la veracidad del texto generado.\n\n| Motor | Clasificación correcta | Coincidencia completa | Errores | Formatos inválidos |\n| --- | --- | --- | --- | --- |\n${summary}\n\n| Caso | Tipo | Motor | Referencia | Resultado | Revisión esperada | Revisión obtenida | Formato | Clasificación correcta | Coincidencia completa | Error |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows}\n\n## Conclusión\n\n${winners} obtuvo el mayor número de clasificaciones correctas en esta muestra. ${modes.map(mode => `${mode}: ${pct(comparison.metrics[mode].classificationPercent)} en categoría y prioridad, ${pct(comparison.metrics[mode].fullMatchPercent)} incluyendo revisión humana`).join('; ')}. El tradicional aplica reglas; ML aprende de datos sintéticos y conserva revisión humana mediante controles; el generativo redacta respuestas pero depende de Groq. Los errores registrados cuentan como fallos. Las corridas no fueron simultáneas. Doce casos no permiten estimar precisión general ni resistencia universal a manipulación. Las respuestas completas y los fallos deben revisarse junto con los porcentajes.\n`;
}

export async function main(args = process.argv.slice(2)) {
  if (args.length < 3 || args.length > 4) throw new Error('Uso: node scripts/compare-ml.js <traditional.json> <generative.json> <ml.json> [carpeta]');
  const readJson = async file => JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  const reports = await Promise.all(args.slice(0, 3).map(readJson));
  const cases = await readJson(new URL('../tests/cases.json', import.meta.url));
  const comparison = compareThree(...reports, cases);
  const output = resolve(args[3] ?? 'evidence');
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'comparison-ml.csv'), toCsv(comparison), 'utf8');
  await writeFile(resolve(output, 'comparison-ml.md'), toMarkdownThree(comparison, reports.map((r, i) => ({ ...r, file: args[i] }))), 'utf8');
  console.log(JSON.stringify(comparison.metrics, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
