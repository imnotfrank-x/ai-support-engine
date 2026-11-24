import contextlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import joblib

from ml.examples.train_basic import train_basic
from ml.examples.evaluate_basic import evaluate_basic
from ml.src.train import DEFAULT_DATA_PATH, load_dataset, split_dataset, train_models


class TestDataset200(unittest.TestCase):
    def test_fixed_split_and_class_distributions(self):
        data = load_dataset(DEFAULT_DATA_PATH)
        training, testing = split_dataset(data)
        self.assertEqual((len(training), len(testing)), (160, 40))
        self.assertEqual(training.index.tolist(), list(range(160)))
        self.assertEqual(testing.index.tolist(), list(range(160, 200)))
        self.assertEqual(training.category.value_counts().to_dict(), dict.fromkeys(['ACCESS', 'BUG', 'FEATURE', 'SECURITY'], 40))
        self.assertEqual(testing.category.value_counts().to_dict(), dict.fromkeys(['ACCESS', 'BUG', 'FEATURE', 'SECURITY'], 10))
        self.assertFalse(set(training.normalized_message) & set(testing.normalized_message))

    def test_labels_follow_dataset_policy(self):
        permitted = {'ACCESS': {'MEDIUM', 'HIGH'}, 'BUG': {'MEDIUM', 'HIGH'}, 'FEATURE': {'LOW'}, 'SECURITY': {'HIGH', 'CRITICAL'}}
        for row in load_dataset(DEFAULT_DATA_PATH).itertuples():
            self.assertIn(row.priority, permitted[row.category])

    def test_split_rejects_invalid_sizes_and_unseen_test_labels(self):
        data = load_dataset(DEFAULT_DATA_PATH)
        for value in [0, 1, -0.1, float('nan')]:
            with self.assertRaises(ValueError):
                split_dataset(data, value)
        changed = data.copy()
        changed.loc[199, 'category'] = 'UNSEEN'
        with self.assertRaisesRegex(ValueError, 'ausentes'):
            split_dataset(changed)

    def test_both_targets_fit_only_the_same_160_messages(self):
        from sklearn.pipeline import Pipeline
        original_fit = Pipeline.fit
        fitted = []

        def track_fit(model, messages, labels):
            fitted.append((messages.index.tolist(), len(labels)))
            return original_fit(model, messages, labels)

        with tempfile.TemporaryDirectory() as directory:
            with patch.object(Pipeline, 'fit', autospec=True, side_effect=track_fit):
                result = train_models(artifacts_dir=Path(directory))
            self.assertEqual(fitted, [(list(range(160)), 160)] * 2)
            for target in ['category', 'priority']:
                self.assertEqual(result['metrics'][target]['train_size'], 160)
                self.assertEqual(result['metrics'][target]['test_size'], 40)
            # Este término pertenece únicamente a las 40 filas reservadas.
            for model in [result['category_model'], result['priority_model']]:
                self.assertNotIn('videovigilancia', model.named_steps['vectorizer'].vocabulary_)

    def test_javier_basic_scripts_use_160_for_fit_and_all_40_for_evaluation(self):
        with tempfile.TemporaryDirectory() as directory:
            model_path = Path(directory) / 'basic.joblib'
            summary = train_basic(model_path=model_path)
            self.assertEqual((summary['rows'], summary['train_size'], summary['test_size']), (200, 160, 40))
            model = joblib.load(model_path)
            self.assertNotIn('videovigilancia', model.named_steps['tfidf'].vocabulary_)
            expected = load_dataset(DEFAULT_DATA_PATH).message.iloc[160:].tolist()
            with patch('ml.examples.evaluate_basic.joblib.load', return_value=model):
                with patch.object(model, 'predict', wraps=model.predict) as predict:
                    with contextlib.redirect_stdout(io.StringIO()):
                        self.assertEqual(evaluate_basic(model_path=model_path), 0)
            self.assertEqual(list(predict.call_args_list[0].args[0]), expected)
            self.assertEqual(len(predict.call_args_list[1].args[0]), 1)


if __name__ == '__main__':
    unittest.main()
