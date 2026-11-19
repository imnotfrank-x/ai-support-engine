import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import joblib
import numpy as np
from fastapi.testclient import TestClient

from ml.src.app import create_app
from ml.src.predict import Predictor, predict_with_confidence
from ml.src.preprocess import CATEGORIES, PRIORITIES
from ml.src.train import train_models


def controlled_predictor(confidence=0.9, category="ACCESS", priority="MEDIUM"):
    def model(labels, selected, maximum):
        probabilities = [(1 - maximum) / (len(labels) - 1)] * len(labels)
        probabilities[list(labels).index(selected)] = maximum
        return Mock(classes_=np.array(labels), predict_proba=Mock(return_value=np.array([probabilities])))
    return Predictor(model(CATEGORIES, category, confidence), model(PRIORITIES, priority, 0.9))


class TestRealAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.directory.cleanup)
        cls.artifacts = Path(cls.directory.name)
        train_models(artifacts_dir=cls.artifacts)

    def setUp(self):
        self.client = self.enterContext(TestClient(create_app(self.artifacts)))

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "modelsLoaded": True})

    def test_prediction_contract(self):
        response = self.client.post("/predict", json={"message": "Deseo una opción para exportar mis reportes"})
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(set(result), {"category", "priority", "response", "requiresHumanReview", "mode"})
        self.assertIn(result["category"], CATEGORIES)
        self.assertIn(result["priority"], PRIORITIES)
        self.assertIsInstance(result["requiresHumanReview"], bool)
        self.assertTrue(result["response"].strip())
        self.assertEqual(result["mode"], "ml")

    def test_security_requires_review(self):
        response = self.client.post("/predict", json={"message": "Alguien entró a mi cuenta sin autorización"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["category"], "SECURITY")
        self.assertTrue(response.json()["requiresHumanReview"])

    def test_ambiguous_message(self):
        response = self.client.post("/predict", json={"message": "Necesito ayuda con un asunto"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["category"], "BUG")
        self.assertEqual(response.json()["priority"], "MEDIUM")
        self.assertTrue(response.json()["requiresHumanReview"])
        self.assertIn("información suficiente", response.json()["response"])

    def test_invalid_messages(self):
        for body in ({}, {"message": ""}, {"message": " \t\n"}, {"message": "a" * 4001},
                     {"message": 123}, {"message": None}, {"message": []}):
            with self.subTest(body_type=type(body.get("message"))):
                self.assertEqual(self.client.post("/predict", json=body).status_code, 422)

    def test_maximum_length_is_accepted(self):
        self.assertEqual(self.client.post("/predict", json={"message": "a" * 4000}).status_code, 200)

    def test_models_load_once_and_are_released(self):
        application = create_app(self.artifacts)
        with patch("ml.src.predict.joblib.load", wraps=joblib.load) as load:
            with TestClient(application) as client:
                client.get("/health")
                client.post("/predict", json={"message": "Ayuda"})
                client.post("/predict", json={"message": "Otra solicitud"})
                self.assertEqual(load.call_count, 2)
            self.assertIsNone(application.state.predictor)


class TestInferenceRules(unittest.TestCase):
    def test_threshold_and_normalization(self):
        for confidence, review in ((0.549, True), (0.55, False)):
            with self.subTest(confidence=confidence):
                predictor = controlled_predictor(confidence)
                result = predictor.predict("  INICIAR   SESIÓN  ")
                self.assertEqual(result["requiresHumanReview"], review)
                self.assertEqual(result["category"], "BUG" if review else "ACCESS")
                predictor.category_model.predict_proba.assert_called_once_with(["iniciar sesion"])
                predictor.priority_model.predict_proba.assert_called_once_with(["iniciar sesion"])

    def test_security_review_for_every_priority(self):
        for priority in PRIORITIES:
            result = controlled_predictor(category="SECURITY", priority=priority).predict("incidente")
            self.assertTrue(result["requiresHumanReview"])
            self.assertEqual(result["priority"], priority)
            self.assertTrue(result["response"])

    def test_missing_models_prevent_startup(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(RuntimeError, "python ml/src/train.py"):
                with TestClient(create_app(Path(directory))):
                    self.fail("No debe arrancar sin modelos")

    def test_corrupt_models_prevent_startup(self):
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / "category_model.joblib").write_bytes(b"invalid artifact")
            with self.assertRaisesRegex(RuntimeError, "python ml/src/train.py"):
                Predictor.load(Path(directory))

    def test_invalid_probabilities(self):
        model = Mock(classes_=np.array(CATEGORIES), predict_proba=Mock(return_value=[[float("nan"), 0, 0, 1]]))
        with self.assertRaises(ValueError):
            predict_with_confidence(model, "prueba")

    def test_inference_error_is_controlled(self):
        predictor = Mock()
        predictor.predict.side_effect = ValueError("detalle interno")
        with patch("ml.src.app.Predictor.load", return_value=predictor):
            with TestClient(create_app()) as client, self.assertLogs("ml.src.app", level="ERROR"):
                response = client.post("/predict", json={"message": "Solicitud"})
                self.assertEqual(response.status_code, 500)
                self.assertNotIn("detalle interno", response.text)


if __name__ == "__main__":
    unittest.main()
