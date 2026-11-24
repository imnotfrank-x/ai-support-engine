import contextlib
import io
import json
import re
import tempfile
import unittest
from pathlib import Path

from ml.src.console_report import format_case_table, format_metrics_report
from ml.src.train import main


class TestConsoleReport(unittest.TestCase):
    def test_case_table_preserves_all_results_and_csv_numbers(self):
        output = format_case_table(
            ['Mensaje de acceso', 'Falla de sistema'], ['ACCESS', 'BUG'], ['ACCESS', 'ACCESS'],
            row_numbers=[161, 162],
        )
        self.assertIn('| 161', output)
        self.assertIn('| 162', output)
        self.assertIn('Aciertos (categoria): 1/2; errores: 1.', output)
        self.assertIn('No', output)

    def test_priority_and_category_must_both_match_for_joint_success(self):
        output = format_case_table(
            ['Caso uno', 'Caso dos'], ['BUG', 'BUG'], ['BUG', 'BUG'],
            expected_priorities=['MEDIUM', 'HIGH'], predicted_priorities=['HIGH', 'HIGH'],
        )
        self.assertIn('Aciertos (categoria y prioridad juntas): 1/2', output)
        self.assertIn('Accuracy conjunta: 50.00% (1/2)', output)

    def test_long_message_is_abbreviated_only_for_display(self):
        message = 'Mensaje extenso ' * 20
        original = [message]
        output = format_case_table(original, ['BUG'], ['BUG'])
        self.assertIn('...', output)
        self.assertEqual(original, [message])
        self.assertNotIn(message, output)

    def test_metrics_accuracy_per_class_and_confusion_matrix(self):
        output = format_metrics_report(['ACCESS', 'BUG', 'BUG'], ['ACCESS', 'BUG', 'ACCESS'], ['ACCESS', 'BUG'])
        self.assertIn('Accuracy: 66.67% (2/3)', output)
        self.assertIn('Precision', output)
        self.assertIn('Recall', output)
        self.assertIn('F1-score', output)
        self.assertIn('Soporte', output)
        self.assertIn('0.500', output)
        self.assertIn('0.667', output)
        self.assertIn('macro avg', output)
        self.assertIn('filas = reales, columnas = predichas', output)

    def test_incomplete_or_unknown_inputs_are_rejected_not_truncated(self):
        with self.assertRaises(ValueError):
            format_case_table(['Caso'], ['BUG'], [])
        with self.assertRaises(ValueError):
            format_case_table(['Caso'], ['BUG'], ['BUG'], row_numbers=[])
        with self.assertRaises(ValueError):
            format_case_table(['Caso'], ['BUG'], ['BUG'], expected_priorities=['HIGH'])
        with self.assertRaises(ValueError):
            format_metrics_report(['BUG'], [], ['BUG'])
        with self.assertRaises(ValueError):
            format_metrics_report(['BUG'], ['OTHER'], ['BUG'])

    def test_real_training_cli_prints_the_40_holdout_cases_and_actual_metrics(self):
        with tempfile.TemporaryDirectory() as directory:
            buffer = io.StringIO()
            with contextlib.redirect_stdout(buffer):
                self.assertEqual(main(['--artifacts-dir', directory]), 0)
            output = buffer.getvalue()
            case_numbers = [int(value) for value in re.findall(r'^\|\s*(\d+)\s*\|', output, re.MULTILINE)]
            self.assertEqual(case_numbers, list(range(161, 201)))
            metrics = json.loads((Path(directory) / 'metrics.json').read_text(encoding='utf8'))
            for target in ['category', 'priority']:
                self.assertIn(f"Accuracy: {metrics[target]['accuracy']:.2%}", output)
            self.assertIn('errores:', output)
            self.assertIn('Metricas de categoria', output)
            self.assertIn('Metricas de prioridad', output)


if __name__ == '__main__':
    unittest.main()
