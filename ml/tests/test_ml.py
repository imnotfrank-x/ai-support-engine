import json
import sys
import tempfile
import unittest
from pathlib import Path

import joblib

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.src.preprocess import CATEGORIES, PRIORITIES, normalize_text
from ml.src.train import DEFAULT_DATA_PATH, MODEL_FILES, load_dataset, train_models


class TestMLPartOne(unittest.TestCase):
    def test_normalize_text(self) -> None:
        self.assertEqual(
            normalize_text("  ¡No Puedo   Iniciar\nSesión   con Contraseña! "),
            "¡no puedo iniciar sesion con contrasena!",
        )
        self.assertEqual(normalize_text("ÁÉÍÓÚ ü ñ"), "aeiou u n")
        with self.assertRaises(TypeError):
            normalize_text(123)  # type: ignore[arg-type]

    def test_dataset_valid_and_balanced(self) -> None:
        df = load_dataset(DEFAULT_DATA_PATH)
        self.assertEqual(len(df), 200)
        self.assertEqual(df["normalized_message"].nunique(), len(df))

        cat_counts = df["category"].value_counts().to_dict()
        for category in CATEGORIES:
            self.assertEqual(cat_counts.get(category, 0), 50, f"Cantidad incorrecta en {category}")

        pri_counts = df["priority"].value_counts().to_dict()
        self.assertEqual(pri_counts, {"LOW": 50, "MEDIUM": 60, "HIGH": 65, "CRITICAL": 25})

    def test_no_data_leakage_with_reference_cases(self) -> None:
        df = load_dataset(DEFAULT_DATA_PATH)
        train_messages = set(df["normalized_message"])

        cases_path = REPO_ROOT / "tests" / "cases.json"
        cases = json.loads(cases_path.read_text(encoding="utf-8"))
        reference_messages = {normalize_text(item["message"]) for item in cases}

        overlap = train_messages & reference_messages
        self.assertEqual(overlap, set(), f"Fuga de datos detectada con tests/cases.json: {overlap}")

    def test_train_models_end_to_end(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            result = train_models(data_path=DEFAULT_DATA_PATH, artifacts_dir=tmp_dir)

            for filename in MODEL_FILES.values():
                self.assertTrue((tmp_dir / filename).is_file(), f"No se generó {filename}")

            metrics = json.loads((tmp_dir / MODEL_FILES["metrics"]).read_text(encoding="utf-8"))
            self.assertGreaterEqual(metrics["category"]["accuracy"], 0.85)
            self.assertGreaterEqual(metrics["priority"]["accuracy"], 0.80)
            self.assertEqual(metrics, result["metrics"])

            cat_model = joblib.load(tmp_dir / MODEL_FILES["category"])
            pri_model = joblib.load(tmp_dir / MODEL_FILES["priority"])

            sample = normalize_text("Alguien entró a mi cuenta sin autorización")
            cat_proba = cat_model.predict_proba([sample])[0]
            pri_proba = pri_model.predict_proba([sample])[0]

            self.assertAlmostEqual(float(cat_proba.sum()), 1.0, places=5)
            self.assertAlmostEqual(float(pri_proba.sum()), 1.0, places=5)
            self.assertEqual(cat_model.predict([sample])[0], "SECURITY")
            self.assertIn(pri_model.predict([sample])[0], ("CRITICAL", "HIGH"))

    def test_load_dataset_rejects_invalid_category(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            bad_csv = Path(tmp) / "invalid.csv"
            bad_csv.write_text(
                "message,category,priority\nPrueba invalida,UNKNOWN,LOW\n",
                encoding="utf-8",
            )
            with self.assertRaises(ValueError):
                load_dataset(bad_csv)


if __name__ == "__main__":
    unittest.main()
