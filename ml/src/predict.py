"""Inferencia local sobre los dos pipelines entrenados en la Parte 1."""

from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np

from ml.src.preprocess import CATEGORIES, PRIORITIES, normalize_text

ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "artifacts"
CATEGORY_CONFIDENCE_THRESHOLD = 0.55

CATEGORY_RESPONSES = {
    "ACCESS": "Verifique sus credenciales y utilice la recuperación de acceso si corresponde. Si el problema persiste, contacte a soporte.",
    "BUG": "Indique los pasos para reproducir la falla, el resultado esperado y el mensaje de error para que soporte pueda investigarla.",
    "FEATURE": "Describa el objetivo de la funcionalidad y los usuarios beneficiados para evaluar su incorporación.",
    "SECURITY": "Solicite la intervención del equipo de seguridad y preserve las evidencias del incidente sin compartir contraseñas ni credenciales.",
}
PRIORITY_RESPONSES = {
    "LOW": "La solicitud puede revisarse en la planificación habitual.",
    "MEDIUM": "Se recomienda atención mediante el proceso habitual de soporte.",
    "HIGH": "Se recomienda atención prioritaria por el equipo responsable.",
    "CRITICAL": "Se requiere atención inmediata por el equipo responsable.",
}


def predict_with_confidence(model, normalized: str) -> tuple[str, float]:
    probabilities = np.asarray(model.predict_proba([normalized])[0], dtype=float)
    if (probabilities.ndim != 1 or len(probabilities) != len(model.classes_)
            or not np.isfinite(probabilities).all() or (probabilities < 0).any()
            or (probabilities > 1).any() or not np.isclose(probabilities.sum(), 1)):
        raise ValueError("El modelo devolvió probabilidades inválidas.")
    index = int(probabilities.argmax())
    return str(model.classes_[index]), float(probabilities[index])


@dataclass(frozen=True)
class Predictor:
    category_model: object
    priority_model: object

    @classmethod
    def load(cls, artifacts_dir: Path = ARTIFACTS_DIR):
        directory = Path(artifacts_dir)
        try:
            category = joblib.load(directory / "category_model.joblib")
            priority = joblib.load(directory / "priority_model.joblib")
            for model, labels in ((category, CATEGORIES), (priority, PRIORITIES)):
                if not callable(getattr(model, "predict_proba", None)) or set(model.classes_) != set(labels):
                    raise ValueError("El artefacto no contiene el clasificador esperado.")
        except Exception as error:
            raise RuntimeError(
                "No se pudieron cargar los modelos ML. Ejecute python ml/src/train.py "
                "con las dependencias del entorno actual antes de iniciar el servicio."
            ) from error
        return cls(category, priority)

    def predict(self, message: str) -> dict:
        if not isinstance(message, str) or not message.strip() or len(message) > 4000:
            raise ValueError("message debe ser texto no vacío de máximo 4000 caracteres.")
        normalized = normalize_text(message)
        category, category_confidence = predict_with_confidence(self.category_model, normalized)
        priority, _priority_confidence = predict_with_confidence(self.priority_model, normalized)
        if category not in CATEGORIES or priority not in PRIORITIES:
            raise ValueError("El modelo devolvió etiquetas inválidas.")
        if category_confidence < CATEGORY_CONFIDENCE_THRESHOLD:
            return {
                "category": "BUG", "priority": "MEDIUM",
                "response": "No hay información suficiente para clasificar la solicitud con confianza. Indique qué ocurrió, en qué sistema y a quién afecta. La clasificación es provisional y requiere revisión humana.",
                "requiresHumanReview": True, "mode": "ml",
            }
        return {
            "category": category, "priority": priority,
            "response": f"{CATEGORY_RESPONSES[category]} {PRIORITY_RESPONSES[priority]}",
            "requiresHumanReview": category == "SECURITY", "mode": "ml",
        }
