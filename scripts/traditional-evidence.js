import { readFile } from 'node:fs/promises';
import { analyzeTraditional } from '../src/traditional.js';
import { isValidResult } from '../src/contract.js';

const cases = JSON.parse(await readFile(new URL('../tests/cases.json', import.meta.url), 'utf8'));
const results = cases.map((sample) => {
  const actual = analyzeTraditional(sample.message);
  return {
    id: sample.id,
    kind: sample.kind,
    message: sample.message,
    expected: { category: sample.category, priority: sample.priority, requiresHumanReview: sample.requiresHumanReview },
    actual,
    validFormat: isValidResult(actual, 'traditional'),
    correct: actual.category === sample.category && actual.priority === sample.priority && actual.requiresHumanReview === sample.requiresHumanReview
  };
});
const correct = results.filter((item) => item.correct && item.validFormat).length;
console.log(JSON.stringify({ mode: 'traditional', total: cases.length, correct, accuracyPercent: 100 * correct / cases.length, generative: 'NOT_RUN_BY_THIS_SCRIPT', results }, null, 2));
if (correct !== cases.length) process.exitCode = 1;
