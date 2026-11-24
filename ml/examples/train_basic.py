import argparse
import sys
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

ML_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_DIR.parent))
from ml.src.train import load_dataset, split_dataset
DEFAULT_DATA_PATH = ML_DIR / "data" / "tickets.csv"
DEFAULT_MODEL_PATH = ML_DIR / "artifacts" / "basic_category_model.joblib"


def train_basic(
    data_path: Path = DEFAULT_DATA_PATH,
    model_path: Path = DEFAULT_MODEL_PATH,
) -> dict:
    """Entrena el pipeline básico TF-IDF + Regresión Logística y guarda el modelo."""
    data = load_dataset(data_path)
    training, testing = split_dataset(data)
    X_train, y_train = training["message"], training["category"]
    X_test = testing["message"]

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
