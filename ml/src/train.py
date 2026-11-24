import argparse
import hashlib
import json
import math
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.pipeline import Pipeline

if not __package__:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.src.preprocess import CATEGORIES, PRIORITIES, SPANISH_STOP_WORDS, normalize_text
from ml.src.console_report import format_case_table, format_metrics_report

ML_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = ML_DIR.parent
DEFAULT_DATA_PATH = ML_DIR / "data" / "tickets.csv"
DEFAULT_ARTIFACTS_DIR = ML_DIR / "artifacts"
MODEL_FILES = {
    "category": "category_model.joblib",
    "priority": "priority_model.joblib",
    "metrics": "metrics.json",
}
REQUIRED_COLUMNS = {"message", "category", "priority"}


def load_dataset(data_path: Path) -> pd.DataFrame:
    """Carga y valida el dataset CSV de tickets sin duplicados ni etiquetas inválidas."""
    path = Path(data_path)
    df = pd.read_csv(path, encoding="utf-8", dtype=str, keep_default_na=False)
    if set(df.columns) != REQUIRED_COLUMNS:
        raise ValueError(
            f"Columnas inválidas en {path.name}: se esperaban {sorted(REQUIRED_COLUMNS)}, se obtuvieron {list(df.columns)}."
        )
    if df.empty:
        raise ValueError("El dataset de entrenamiento está vacío.")

    df = df.copy()
    for col in ("message", "category", "priority"):
        df[col] = df[col].str.strip()
        if (df[col] == "").any():
            raise ValueError(f"La columna '{col}' contiene valores vacíos.")

    invalid_categories = sorted(set(df["category"]) - set(CATEGORIES))
    if invalid_categories:
        raise ValueError(f"Categorías inválidas encontradas: {invalid_categories}")

    invalid_priorities = sorted(set(df["priority"]) - set(PRIORITIES))
    if invalid_priorities:
        raise ValueError(f"Prioridades inválidas encontradas: {invalid_priorities}")

    df["normalized_message"] = df["message"].map(normalize_text)
    if (df["normalized_message"] == "").any():
        raise ValueError("Existen mensajes vacíos después de normalizar.")

    duplicates = df[df["normalized_message"].duplicated()]["message"].tolist()
    if duplicates:
        raise ValueError(f"Existen {len(duplicates)} mensajes duplicados tras normalizar: {duplicates[:3]}")

    return df


def build_pipeline(random_state: int = 42) -> Pipeline:
    """Construye el pipeline TF-IDF (unigramas y bigramas) + Regresión Logística."""
    return Pipeline(
        [
            (
                "vectorizer",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    lowercase=True,
                    strip_accents="unicode",
                    sublinear_tf=True,
                    stop_words=list(SPANISH_STOP_WORDS),
                ),
            ),
            (
                "classifier",
                LogisticRegression(
                    C=3.0,
                    max_iter=1000,
                    class_weight="balanced",
                    random_state=random_state,
                ),
            ),
        ]
    )


def split_dataset(data: pd.DataFrame, test_size: float = 0.2):
    """Reserva las últimas filas del CSV; nunca vuelve a sortear el holdout."""
    if not 0 < test_size < 1:
        raise ValueError("test_size debe estar entre 0 y 1.")
    test_rows = math.ceil(len(data) * test_size)
    train_rows = len(data) - test_rows
    if train_rows < 1 or test_rows < 1:
        raise ValueError("Se requieren ejemplos de entrenamiento y de prueba.")
    train = data.iloc[:train_rows].copy()
    test = data.iloc[train_rows:].copy()
    if set(train["normalized_message"]) & set(test["normalized_message"]):
        raise ValueError("Las particiones comparten mensajes.")
    for target in ("category", "priority"):
        if set(test[target]) - set(train[target]):
            raise ValueError(f"Hay etiquetas de {target} en prueba ausentes del entrenamiento.")
    return train, test


def train_single_target(
    messages: pd.Series,
    labels: pd.Series,
    classes: tuple[str, ...],
    test_size: float = 0.2,
    random_state: int = 42,
    test_messages: pd.Series | None = None,
    test_labels: pd.Series | None = None,
) -> tuple[Pipeline, dict, str]:
    """Entrena solo con la partición de entrenamiento y evalúa el holdout."""
    if (test_messages is None) != (test_labels is None):
        raise ValueError("Se requieren mensajes y etiquetas de prueba juntos.")
    if test_messages is None:
        # Compatibilidad para llamadas directas: la misma reserva final, sin sorteo.
        count = math.ceil(len(messages) * test_size)
        if not 0 < test_size < 1 or not 0 < count < len(messages):
            raise ValueError("Partición de prueba inválida.")
        X_train, X_test = messages.iloc[:-count], messages.iloc[-count:]
        y_train, y_test = labels.iloc[:-count], labels.iloc[-count:]
    else:
        X_train, X_test = messages, test_messages
        y_train, y_test = labels, test_labels
    model = build_pipeline(random_state=random_state)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    class_list = list(classes)
    report_dict = classification_report(
        y_test,
        y_pred,
        labels=class_list,
        output_dict=True,
        zero_division=0,
    )
    report_text = classification_report(
        y_test,
        y_pred,
        labels=class_list,
        zero_division=0,
    )
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "macro_f1": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
        "weighted_f1": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
        "labels": class_list,
        "confusion_matrix": confusion_matrix(y_test, y_pred, labels=class_list).tolist(),
        "classification_report": report_dict,
    }
    return model, metrics, report_text


def _relative_or_name(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT.resolve()).as_posix()
    except ValueError:
        return path.name


def train_models(
    data_path: Path = DEFAULT_DATA_PATH,
    artifacts_dir: Path = DEFAULT_ARTIFACTS_DIR,
    test_size: float = 0.2,
    random_state: int = 42,
) -> dict:
    """Entrena los modelos de categoría y prioridad, guarda artefactos y reporta métricas."""
    data_file = Path(data_path)
    out_dir = Path(artifacts_dir)
    df = load_dataset(data_file)
    train, test = split_dataset(df, test_size)

    category_model, category_metrics, category_report = train_single_target(
        train["normalized_message"],
        train["category"],
        CATEGORIES,
        test_size=test_size,
        random_state=random_state,
        test_messages=test["normalized_message"],
        test_labels=test["category"],
    )
    priority_model, priority_metrics, priority_report = train_single_target(
        train["normalized_message"],
        train["priority"],
        PRIORITIES,
        test_size=test_size,
        random_state=random_state,
        test_messages=test["normalized_message"],
        test_labels=test["priority"],
    )

    out_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(category_model, out_dir / MODEL_FILES["category"])
    joblib.dump(priority_model, out_dir / MODEL_FILES["priority"])

    metrics = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "dataset_path": _relative_or_name(data_file),
        "dataset_rows": int(len(df)),
        "dataset_sha256": hashlib.sha256(data_file.read_bytes()).hexdigest(),
        "test_size": test_size,
        "random_state": random_state,
        "split": {
            "method": "ordered_holdout",
            "train_rows": len(train),
            "test_rows": len(test),
            "train_data_rows": [1, len(train)],
            "test_data_rows": [len(train) + 1, len(df)],
            "description": "Filas de datos, sin contar encabezado; ambas tareas usan las mismas particiones.",
        },
        "versions": {
            "python": platform.python_version(),
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
            "joblib": joblib.__version__,
        },
        "class_distribution": {
            "category": {k: int(v) for k, v in df["category"].value_counts().to_dict().items()},
            "priority": {k: int(v) for k, v in df["priority"].value_counts().to_dict().items()},
        },
        "category": category_metrics,
        "priority": priority_metrics,
    }
    (out_dir / MODEL_FILES["metrics"]).write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    return {
        "category_model": category_model,
        "priority_model": priority_model,
        "metrics": metrics,
        "reports": {
            "category": category_report,
            "priority": priority_report,
        },
    }


def _predict_with_confidence(model: Pipeline, normalized_text: str) -> tuple[str, float]:
    proba = model.predict_proba([normalized_text])[0]
    best_idx = int(proba.argmax())
    return str(model.classes_[best_idx]), float(proba[best_idx])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Entrena modelos TF-IDF + Regresión Logística para soporte.")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH, help="Ruta al CSV de entrenamiento.")
    parser.add_argument("--artifacts-dir", type=Path, default=DEFAULT_ARTIFACTS_DIR, help="Directorio de salida.")
    parser.add_argument("--test-size", type=float, default=0.2, help="Proporción para prueba (por defecto 0.2).")
    parser.add_argument("--random-state", type=int, default=42, help="Semilla del modelo; no altera la reserva final de prueba.")
    args = parser.parse_args(argv)

    result = train_models(
        data_path=args.data,
        artifacts_dir=args.artifacts_dir,
        test_size=args.test_size,
        random_state=args.random_state,
    )

    _training, testing = split_dataset(load_dataset(args.data), args.test_size)
    category_predictions = result['category_model'].predict(testing['normalized_message'])
    priority_predictions = result['priority_model'].predict(testing['normalized_message'])
    print(format_case_table(
        testing['message'], testing['category'], category_predictions,
        row_numbers=testing.index + 1,
        expected_priorities=testing['priority'], predicted_priorities=priority_predictions,
    ))
    print()
    print(format_metrics_report(testing['category'], category_predictions, CATEGORIES))
    print()
    print(format_metrics_report(testing['priority'], priority_predictions, PRIORITIES, target='prioridad'))
    print('\nEstas son predicciones de los clasificadores; no aplican el fallback por confianza de FastAPI.')

    sample = "Alguien entró a mi cuenta sin autorización"
    normalized_sample = normalize_text(sample)
    pred_cat, conf_cat = _predict_with_confidence(result["category_model"], normalized_sample)
    pred_pri, conf_pri = _predict_with_confidence(result["priority_model"], normalized_sample)

    print(f'Ejemplo de predicción: "{sample}"')
    print(f"  category: {pred_cat} (confianza: {conf_cat:.4f})")
    print(f"  priority: {pred_pri} (confianza: {conf_pri:.4f})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
