import argparse
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

ML_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATA_PATH = ML_DIR / "data" / "tickets.csv"
DEFAULT_MODEL_PATH = ML_DIR / "artifacts" / "basic_category_model.joblib"
DEFAULT_MESSAGE = "Encontré datos de otros clientes"


def evaluate_basic(
    data_path: Path = DEFAULT_DATA_PATH,
    model_path: Path = DEFAULT_MODEL_PATH,
    message: str = DEFAULT_MESSAGE,
) -> int:
    """Evalúa el modelo entrenado sobre el 20% de prueba y predice un mensaje nuevo."""
    model_file = Path(model_path)
    if not model_file.is_file():
        print(
            f"Error: no se encontró el modelo en {model_file}. "
            "Ejecuta primero: python ml/examples/train_basic.py",
            file=sys.stderr,
        )
        return 1

    model = joblib.load(model_file)
    data = pd.read_csv(data_path, encoding="utf-8")

    _X_train, X_test, _y_train, y_test = train_test_split(
        data["message"],
        data["category"],
        test_size=0.2,
        stratify=data["category"],
        random_state=42,
    )

    predictions = model.predict(X_test)
    print("=== Reporte de clasificación ===")
    print(classification_report(y_test, predictions, zero_division=0))

    print("=== Matriz de confusión ===")
    print("Etiquetas:", list(model.classes_))
    print(confusion_matrix(y_test, predictions, labels=model.classes_))

    new_message = [message]
    category = model.predict(new_message)[0]
    confidence = model.predict_proba(new_message).max()

    print("\n=== Predicción de ejemplo ===")
    print("Mensaje:", message)
    print("Categoría:", category)
    print("Score aproximado:", round(confidence, 3))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Evalúa el modelo básico de categorías y predice un mensaje de ejemplo."
    )
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH, help="Ruta al CSV de tickets.")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH, help="Ruta del modelo .joblib.")
    parser.add_argument("--message", type=str, default=DEFAULT_MESSAGE, help="Mensaje de prueba a clasificar.")
    args = parser.parse_args(argv)

    return evaluate_basic(data_path=args.data, model_path=args.model, message=args.message)


if __name__ == "__main__":
    raise SystemExit(main())
