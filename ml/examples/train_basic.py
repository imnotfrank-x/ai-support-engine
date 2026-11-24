import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

ML_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATA_PATH = ML_DIR / "data" / "tickets.csv"
DEFAULT_MODEL_PATH = ML_DIR / "artifacts" / "basic_category_model.joblib"


def train_basic(
    data_path: Path = DEFAULT_DATA_PATH,
    model_path: Path = DEFAULT_MODEL_PATH,
) -> dict:
    """Entrena el pipeline básico TF-IDF + Regresión Logística y guarda el modelo."""
    data = pd.read_csv(data_path, encoding="utf-8")

    X_train, X_test, y_train, _y_test = train_test_split(
        data["message"],
        data["category"],
        test_size=0.2,
        stratify=data["category"],
        random_state=42,
    )

    model = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2))),
            ("classifier", LogisticRegression(max_iter=1000)),
        ]
    )

    model.fit(X_train, y_train)

    model_file = Path(model_path)
    model_file.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_file)

    return {
        "rows": int(len(data)),
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
        "model_path": str(model_file),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Entrena un clasificador básico de categorías con TF-IDF y Regresión Logística."
    )
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH, help="Ruta al CSV de tickets.")
    parser.add_argument("--output", type=Path, default=DEFAULT_MODEL_PATH, help="Ruta del modelo .joblib.")
    args = parser.parse_args(argv)

    summary = train_basic(data_path=args.data, model_path=args.output)
    print(
        f"Modelo entrenado con {summary['train_size']} filas de entrenamiento "
        f"({summary['test_size']} reservadas para prueba, {summary['rows']} totales)."
    )
    print(f"Modelo guardado en: {summary['model_path']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
